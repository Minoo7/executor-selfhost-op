import { expect, layer } from "@effect/vitest";
import { Effect, Redacted, Schema } from "effect";
import { HttpClient, HttpClientRequest } from "effect/http";
import { randomUUID } from "node:crypto";
import { Api, body } from "../support/api.ts";
import { Actors } from "../support/actors.ts";
import { Browser } from "../support/browser.ts";
import { HostedLive, withHostedCase } from "../support/case.ts";
import { Organization } from "../support/contracts.ts";
import { Evidence } from "../support/evidence.ts";
import { McpClient } from "../support/mcp-client.ts";
import { holdQuery } from "../support/query-transition.ts";
import { legacyStorage } from "../support/legacy-storage.ts";
import { serverControl } from "../support/server-control.ts";
import { scenarios } from "../test-plan.ts";
import { Target } from "../support/platform.ts";

const Instructions = Schema.Struct({
  additions: Schema.String,
  revision: Schema.NullOr(Schema.String.check(Schema.isUUID(4))),
  upstream: Schema.String,
  combined: Schema.String,
});
const Failure = Schema.Struct({ _tag: Schema.String, message: Schema.String });
const Key = Schema.Struct({ id: Schema.String, key: Schema.RedactedFromValue(Schema.String) });
const Completed = Schema.Struct({
  execution: Schema.Struct({ ok: Schema.Literal(true), value: Schema.Number }),
});
const editor = (page: import("playwright").Page) =>
  page.getByRole("form", { name: "MCP instructions", exact: true });

const discover = (credential: Redacted.Redacted<string>, organization: string) =>
  Effect.gen(function* () {
    const target = yield* Target,
      http = yield* HttpClient.HttpClient;
    const response = yield* http.execute(
      yield* HttpClientRequest.post(`${target.metadata.origin}/mcp`).pipe(
        HttpClientRequest.bearerToken(Redacted.value(credential)),
        HttpClientRequest.setHeaders({
          accept: "application/json, text/event-stream",
          "mcp-protocol-version": "2026-07-28",
          "mcp-method": "server/discover",
          "x-executor-organization": organization,
        }),
        HttpClientRequest.bodyJson({
          jsonrpc: "2.0",
          id: 1,
          method: "server/discover",
          params: {
            _meta: {
              "io.modelcontextprotocol/protocolVersion": "2026-07-28",
              "io.modelcontextprotocol/clientCapabilities": {},
            },
          },
        }),
      ),
    );
    expect(response.status).toBe(200);
    const result = yield* Schema.decodeUnknownEffect(
      Schema.Struct({ result: Schema.Struct({ instructions: Schema.String }) }),
    )(yield* response.json);
    return result.result.instructions;
  }).pipe(Effect.scoped);

layer(HostedLive, { excludeTestServices: true })("Organization MCP instructions", (it) => {
  it.effect(scenarios.organizationMcpInstructions.title, (context) =>
    withHostedCase(
      context,
      Effect.gen(function* () {
        const api = yield* Api,
          actors = yield* Actors,
          browser = yield* Browser,
          mcp = yield* McpClient,
          evidence = yield* Evidence;
        const path = `/api/organizations/${actors.organization.id}/mcp-instructions`;
        const read = api.request(actors.owner, "GET", path).pipe(
          Effect.flatMap((response) => {
            expect(response.status).toBe(200);
            return body(Instructions, response);
          }),
        );
        const initial = yield* read;
        expect(initial).toMatchObject({ additions: "", revision: null });
        expect(initial.upstream).toContain("Executor");
        expect(initial.combined).toBe(initial.upstream);
        expect((yield* api.request(actors.member, "GET", path)).status).toBe(200);
        expect(
          (yield* api.request(actors.member, "PUT", path, {
            additions: "forbidden",
            expectedRevision: null,
          })).status,
        ).toBe(403);
        const anonymous = yield* api.session();
        expect((yield* api.request(anonymous, "GET", path)).status).toBe(401);
        for (const payload of [
          { additions: "x".repeat(8193), expectedRevision: null },
          { additions: "x", expectedRevision: "invalid" },
          { additions: "x" },
        ])
          expect((yield* api.request(actors.owner, "PUT", path, payload)).status).toBe(400);
        const keyResponse = yield* api.request(actors.owner, "POST", "/api/auth/api-key/create", {
          name: "Instructions lifecycle",
        });
        expect(keyResponse.status).toBe(200);
        const key = yield* body(Key, keyResponse);
        yield* Effect.addFinalizer(() =>
          api
            .request(actors.owner, "POST", "/api/auth/api-key/delete", { keyId: key.id })
            .pipe(Effect.orDie),
        );
        const connect = (label: string, organization = actors.organization.id) =>
          mcp.connect(key.key, label, { organization });
        const instructions = (client: Effect.Success<ReturnType<typeof connect>>) =>
          client.use("Read the actual initialize instructions", (client) =>
            Promise.resolve(client.getInstructions()),
          );
        const original = yield* connect("upstream");
        expect(yield* instructions(original)).toBe(initial.upstream);
        expect(yield* discover(key.key, actors.organization.id)).toBe(initial.upstream);

        yield* browser.login(actors.admin);
        yield* browser.use("Open organization settings as an admin", (page) =>
          page.goto(`/org/${actors.organization.slug}/organization`),
        );
        const firstAdditions =
          "Use organization terminology.\nTreat <b>guidance</b> as plain text.";
        yield* browser.use("Edit the organization additions", (page) =>
          page.getByLabel("Organization MCP additions", { exact: true }).fill(firstAdditions),
        );
        yield* browser.use("Open the combined plain-text preview", (page) =>
          page.getByText("Combined MCP instructions preview", { exact: true }).click(),
        );
        expect(
          yield* browser.use("Read the combined preview", (page) =>
            page.getByLabel("Combined MCP instructions", { exact: true }).textContent(),
          ),
        ).toBe(`${initial.upstream}\n\n${firstAdditions}`);
        expect(
          yield* browser.use("Instruction markup is not rendered", (page) =>
            page.getByLabel("Combined MCP instructions", { exact: true }).locator("b").count(),
          ),
        ).toBe(0);
        yield* browser.use("Save additions in the browser", (page) =>
          editor(page).getByRole("button", { name: "Save", exact: true }).click(),
        );
        yield* browser.use("Wait for the saved acknowledgement", (page) =>
          editor(page)
            .getByRole("status")
            .filter({ hasText: "Saved" })
            .waitFor({ state: "visible" }),
        );
        const first = yield* read;
        expect(first.additions).toBe(firstAdditions);
        expect(first.revision).not.toBeNull();
        expect(first.combined).toBe(`${initial.upstream}\n\n${firstAdditions}`);
        yield* browser.use("Reload persisted settings", (page) => page.reload());
        yield* browser.use("Wait for the persisted additions", (page) =>
          page
            .getByLabel("Organization MCP additions", { exact: true })
            .waitFor({ state: "visible" }),
        );
        expect(
          yield* browser.use("Read the persisted browser value", (page) =>
            page.getByLabel("Organization MCP additions", { exact: true }).inputValue(),
          ),
        ).toBe(firstAdditions);
        const connected = yield* connect("first-additions");
        expect(yield* instructions(connected)).toBe(first.combined);
        expect(yield* discover(key.key, actors.organization.id)).toBe(first.combined);
        yield* browser.checkpoint("Saved additions survive browser reload");

        const conflictDraft = "Keep this unsaved browser draft after a conflict.";
        yield* browser.use("Keep a draft based on the first saved revision", (page) =>
          page.getByLabel("Organization MCP additions", { exact: true }).fill(conflictDraft),
        );
        const secondAdditions = "The current organization guidance is revision two.";
        const secondResponse = yield* api.request(actors.owner, "PUT", path, {
          additions: secondAdditions,
          expectedRevision: first.revision,
        });
        expect(secondResponse.status).toBe(200);
        const second = yield* body(Instructions, secondResponse);
        expect(second.revision).not.toBe(first.revision);
        const stale = yield* api.request(actors.admin, "PUT", path, {
          additions: "stale overwrite",
          expectedRevision: first.revision,
        });
        expect(stale.status).toBe(409);
        expect((yield* body(Failure, stale))._tag).toBe("OrganizationMcpInstructionsConflict");
        expect(
          (yield* api.request(actors.owner, "PUT", path, {
            additions: "stale initial creation",
            expectedRevision: null,
          })).status,
        ).toBe(409);
        expect(yield* read).toEqual(second);
        const fresh = yield* connect("second-additions-same-grant");
        expect(yield* instructions(fresh)).toBe(second.combined);
        expect(yield* discover(key.key, actors.organization.id)).toBe(second.combined);
        const tools = yield* connected.use(
          "The existing session still lists tools after saving",
          (client) => client.listTools(),
        );
        expect(tools.tools.some((tool) => tool.name === "execute")).toBe(true);
        const executed = yield* connected.use(
          "The existing session still executes after saving",
          (client, signal) =>
            client.callTool({ name: "execute", arguments: { code: "return 40 + 2" } }, undefined, {
              signal,
            }),
        );
        expect(
          (yield* Schema.decodeUnknownEffect(Completed)(executed.structuredContent)).execution
            .value,
        ).toBe(42);

        yield* browser.use("Try to save the stale browser revision", (page) =>
          editor(page).getByRole("button", { name: "Save", exact: true }).click(),
        );
        yield* browser.use("The conflict explains how to recover", (page) =>
          editor(page)
            .getByRole("alert")
            .filter({ hasText: "changed since you loaded" })
            .waitFor({ state: "visible" }),
        );
        expect(
          yield* browser.use("A conflict preserves the draft", (page) =>
            page.getByLabel("Organization MCP additions", { exact: true }).inputValue(),
          ),
        ).toBe(conflictDraft);
        expect(yield* read).toEqual(second);
        yield* browser.checkpoint("A revision conflict preserves the browser draft");
        yield* browser.use("Load the current revision", (page) => page.reload());
        yield* browser.use("Wait for the editor", (page) =>
          page
            .getByLabel("Organization MCP additions", { exact: true })
            .waitFor({ state: "visible" }),
        );
        const failedDraft = "Keep this draft across a failed network save.";
        yield* browser.use("Edit before a failed save", (page) =>
          page.getByLabel("Organization MCP additions", { exact: true }).fill(failedDraft),
        );
        const held = yield* holdQuery([path], "fail", { method: "PUT" });
        yield* browser.use("Start the held save", (page) =>
          editor(page).getByRole("button", { name: "Save", exact: true }).click(),
        );
        yield* held.requested;
        expect(
          yield* browser.use("The draft stays visible while saving", (page) =>
            page.getByLabel("Organization MCP additions", { exact: true }).inputValue(),
          ),
        ).toBe(failedDraft);
        expect(
          yield* browser.use("The pending draft cannot be edited", (page) =>
            page.getByLabel("Organization MCP additions", { exact: true }).isDisabled(),
          ),
        ).toBe(true);
        yield* held.release;
        yield* browser.use("The failed save is explained", (page) =>
          editor(page)
            .getByRole("alert")
            .filter({ hasText: "Your draft is kept" })
            .waitFor({ state: "visible" }),
        );
        expect(
          yield* browser.use("A failed save preserves the draft", (page) =>
            page.getByLabel("Organization MCP additions", { exact: true }).inputValue(),
          ),
        ).toBe(failedDraft);
        expect(yield* read).toEqual(second);
        yield* browser.use("Retry the same draft", (page) =>
          editor(page).getByRole("button", { name: "Save", exact: true }).click(),
        );
        yield* browser.use("The retry is saved", (page) =>
          editor(page)
            .getByRole("status")
            .filter({ hasText: /^Saved$/ })
            .waitFor({ state: "visible" }),
        );
        expect((yield* read).additions).toBe(failedDraft);
        const resetDraft = "Keep this unsaved draft when reset fails.";
        yield* browser.use("Edit before a failed reset", (page) =>
          page.getByLabel("Organization MCP additions", { exact: true }).fill(resetDraft),
        );
        const heldReset = yield* holdQuery([path], "fail", { method: "PUT" });
        yield* browser.use("Start a reset that will fail", (page) =>
          editor(page).getByRole("button", { name: "Reset to upstream", exact: true }).click(),
        );
        yield* heldReset.requested;
        expect(
          yield* browser.use("A pending reset keeps the existing draft", (page) =>
            page.getByLabel("Organization MCP additions", { exact: true }).inputValue(),
          ),
        ).toBe(resetDraft);
        yield* heldReset.release;
        yield* browser.use("The failed reset is explained", (page) =>
          editor(page).getByRole("alert").waitFor({ state: "visible" }),
        );
        expect(
          yield* browser.use("A failed reset preserves the existing draft", (page) =>
            page.getByLabel("Organization MCP additions", { exact: true }).inputValue(),
          ),
        ).toBe(resetDraft);
        expect((yield* read).additions).toBe(failedDraft);
        yield* browser.use("Reset the organization to upstream", (page) =>
          editor(page).getByRole("button", { name: "Reset to upstream", exact: true }).click(),
        );
        yield* browser.use("Wait for reset completion", (page) =>
          editor(page)
            .getByRole("status")
            .filter({ hasText: /^Saved$/ })
            .waitFor({ state: "visible" }),
        );
        const reset = yield* read;
        expect(reset.additions).toBe("");
        expect(reset.revision).not.toBeNull();
        expect(reset.combined).toBe(initial.upstream);
        expect(yield* instructions(yield* connect("reset-upstream"))).toBe(initial.upstream);
        expect(yield* discover(key.key, actors.organization.id)).toBe(initial.upstream);
        yield* browser.checkpoint("Reset restores upstream instructions for a new connection");
        yield* evidence.json("instructions-revisions.json", {
          first: first.revision,
          second: second.revision,
          reset: reset.revision,
        });

        yield* browser.login(actors.member);
        yield* browser.use("Open settings as a member", (page) =>
          page.goto(`/org/${actors.organization.slug}/organization`),
        );
        yield* browser.use("Wait for the member editor", (page) =>
          page
            .getByLabel("Organization MCP additions", { exact: true })
            .waitFor({ state: "visible" }),
        );
        expect(
          yield* browser.use("Members cannot edit additions", (page) =>
            page.getByLabel("Organization MCP additions", { exact: true }).isDisabled(),
          ),
        ).toBe(true);
      }).pipe(Effect.provide(McpClient.layer)),
    ),
  );

  it.effect(scenarios.organizationMcpInstructionsIsolation.title, (context) =>
    withHostedCase(
      context,
      Effect.gen(function* () {
        const api = yield* Api,
          actors = yield* Actors,
          browser = yield* Browser,
          mcp = yield* McpClient;
        const created = yield* api.request(actors.owner, "POST", "/api/auth/organization/create", {
          name: "Other instructions team",
          slug: `instructions-${randomUUID().slice(0, 8)}`,
          keepCurrentActiveOrganization: true,
        });
        expect(created.status).toBe(200);
        const other = yield* body(Organization, created);
        yield* Effect.addFinalizer(() =>
          api.request(actors.owner, "DELETE", `/api/organizations/${other.id}`).pipe(Effect.orDie),
        );
        const otherPath = `/api/organizations/${other.id}/mcp-instructions`;
        const otherAdditions = "Only the second organization receives this guidance.";
        const otherSaved = yield* body(
          Instructions,
          yield* api.request(actors.owner, "PUT", otherPath, {
            additions: otherAdditions,
            expectedRevision: null,
          }),
        );
        expect((yield* api.request(actors.member, "GET", otherPath)).status).toBe(403);
        expect(
          (yield* api.request(actors.member, "PUT", otherPath, {
            additions: "foreign write",
            expectedRevision: otherSaved.revision,
          })).status,
        ).toBe(403);

        const path = `/api/organizations/${actors.organization.id}/mcp-instructions`;
        const firstAdditions = "Only the first organization receives this guidance.";
        const first = yield* body(
          Instructions,
          yield* api.request(actors.owner, "PUT", path, {
            additions: firstAdditions,
            expectedRevision: null,
          }),
        );
        const keyResponse = yield* api.request(actors.owner, "POST", "/api/auth/api-key/create", {
          name: "Instructions organization isolation",
        });
        expect(keyResponse.status).toBe(200);
        const key = yield* body(Key, keyResponse);
        yield* Effect.addFinalizer(() =>
          api
            .request(actors.owner, "POST", "/api/auth/api-key/delete", { keyId: key.id })
            .pipe(Effect.orDie),
        );
        for (const [organization, expected] of [
          [actors.organization.id, first.combined],
          [other.id, otherSaved.combined],
          [actors.organization.id, first.combined],
        ] as const) {
          const client = yield* mcp.connect(key.key, `isolation-${organization}`, { organization });
          expect(
            yield* client.use("Read organization-scoped initialize instructions", (client) =>
              Promise.resolve(client.getInstructions()),
            ),
          ).toBe(expected);
          expect(yield* discover(key.key, organization)).toBe(expected);
        }
        expect(first.combined).not.toContain(otherAdditions);
        expect(otherSaved.combined).not.toContain(firstAdditions);
        yield* browser.login(actors.owner);
        yield* browser.use("Open the first organization as the owner", (page) =>
          page.goto(`/org/${actors.organization.slug}/organization`),
        );
        yield* browser.use("Leave an unsaved draft before switching organizations", (page) =>
          page
            .getByLabel("Organization MCP additions", { exact: true })
            .fill("Do not carry this draft to another organization."),
        );
        yield* browser.use("Open the organization switcher", (page) =>
          page.getByRole("button", { name: /^Organization: /, exact: true }).click(),
        );
        yield* browser.use("Switch to the second organization", (page) =>
          page.getByRole("menuitemradio", { name: "Other instructions team", exact: true }).click(),
        );
        yield* browser.use("Open the second organization's settings", (page) =>
          page.locator(`a[href="/org/${other.slug}/organization"]`).click(),
        );
        yield* browser.use("Wait for the second organization's editor", (page) =>
          page
            .getByLabel("Organization MCP additions", { exact: true })
            .waitFor({ state: "visible" }),
        );
        expect(
          yield* browser.use("The second organization has only its saved additions", (page) =>
            page.getByLabel("Organization MCP additions", { exact: true }).inputValue(),
          ),
        ).toBe(otherAdditions);

        yield* browser.checkpoint("Switching organizations does not carry the unsaved draft");
      }).pipe(Effect.provide(McpClient.layer)),
    ),
  );

  it.effect(scenarios.organizationMcpInstructionsStorage.title, (context) =>
    withHostedCase(
      context,
      Effect.gen(function* () {
        const api = yield* Api,
          actors = yield* Actors,
          browser = yield* Browser;
        const path = `/api/organizations/${actors.organization.id}/mcp-instructions`;
        const additions = "Persisted before the isolated server restarts.";
        const saved = yield* body(
          Instructions,
          yield* api.request(actors.owner, "PUT", path, { additions, expectedRevision: null }),
        );
        yield* serverControl("restart");
        const read = api
          .request(actors.owner, "GET", path)
          .pipe(Effect.flatMap((response) => body(Instructions, response)));
        expect(yield* read).toEqual(saved);
        yield* legacyStorage([
          {
            sql: "CREATE FUNCTION e2e_instructions_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'private-driver-detail-must-not-leak'; END $$",
          },
          {
            sql: "CREATE TRIGGER e2e_instructions_fault BEFORE INSERT OR UPDATE ON hosted_org_mcp_instructions FOR EACH ROW EXECUTE FUNCTION e2e_instructions_fault()",
          },
        ]);
        yield* serverControl("start");
        expect(yield* read).toEqual(saved);
        yield* browser.login(actors.owner);
        yield* browser.use("Open instructions with the real storage fault", (page) =>
          page.goto(`/org/${actors.organization.slug}/organization`),
        );
        const draft = "Preserve this draft when the database rejects the save.";
        yield* browser.use("Edit during the storage fault", (page) =>
          page.getByLabel("Organization MCP additions", { exact: true }).fill(draft),
        );
        yield* browser.use("Try the real storage write", (page) =>
          editor(page).getByRole("button", { name: "Save", exact: true }).click(),
        );
        yield* browser.use("The storage failure is visible", (page) =>
          editor(page)
            .getByRole("alert")
            .filter({ hasText: "Your draft is kept" })
            .waitFor({ state: "visible" }),
        );
        expect(
          yield* browser.use("The failed storage save keeps the draft", (page) =>
            page.getByLabel("Organization MCP additions", { exact: true }).inputValue(),
          ),
        ).toBe(draft);
        const rejected = yield* api.request(actors.owner, "PUT", path, {
          additions: draft,
          expectedRevision: saved.revision,
        });
        expect(rejected.status).toBe(503);
        expect((yield* body(Failure, rejected))._tag).toBe(
          "OrganizationMcpInstructionsUnavailable",
        );
        expect(JSON.stringify(rejected.body)).not.toContain("private-driver-detail");
        expect(yield* read).toEqual(saved);
        yield* browser.checkpoint("A real storage failure preserves the draft and saved revision");
        yield* legacyStorage([
          { sql: "DROP TRIGGER e2e_instructions_fault ON hosted_org_mcp_instructions" },
          { sql: "DROP FUNCTION e2e_instructions_fault()" },
        ]);
        yield* serverControl("start");
        yield* browser.use("Retry after storage recovery", (page) =>
          editor(page).getByRole("button", { name: "Save", exact: true }).click(),
        );
        yield* browser.use("The recovered save is acknowledged", (page) =>
          editor(page)
            .getByRole("status")
            .filter({ hasText: /^Saved$/ })
            .waitFor({ state: "visible" }),
        );
        const recovered = yield* read;
        expect(recovered.additions).toBe(draft);
        const competing = yield* Effect.all(
          ["First concurrent edit", "Second concurrent edit"].map((additions) =>
            api.request(actors.owner, "PUT", path, {
              additions,
              expectedRevision: recovered.revision,
            }),
          ),
          { concurrency: 2 },
        );
        expect(competing.map((response) => response.status).sort()).toEqual([200, 409]);
        const winner = competing.find((response) => response.status === 200);
        if (winner === undefined) return yield* Effect.die("One compare-and-set must win");
        expect(yield* read).toEqual(yield* body(Instructions, winner));
      }),
    ),
  );
});
