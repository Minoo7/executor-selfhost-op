import { expect, layer } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { randomUUID } from "node:crypto";
import type { Page } from "playwright";
import { Actors } from "../support/actors.ts";
import { Api, body } from "../support/api.ts";
import { accountLinks, connectionsPath, linkAccount } from "../support/app-accounts.ts";
import { appsManifest } from "../support/apps-release.ts";
import { Browser } from "../support/browser.ts";
import { HostedLive, withHostedCase } from "../support/case.ts";
import { App, Resource } from "../support/contracts.ts";
import { scenarios } from "../test-plan.ts";

const source = `import { defineApp, defineProvider, secrets, query, object, string, router } from "apps";
const service = defineProvider({ name: "Sharing service", auth: { key: secrets({ label: "Key", fields: object({ token: string() }) }) } });
export default defineApp({ app: { accounts: { team: service } }, user: { accounts: { service: service.many() } } }, {
  tools: router({ identity: query({ input: object({}) }, async () => "allowed") })
});`;
const Access = Schema.Struct({
  revision: Schema.String,
  ownership: Schema.Union([
    Schema.Struct({ kind: Schema.Literal("personal") }),
    Schema.Struct({
      kind: Schema.Literal("shared"),
      audience: Schema.Union([
        Schema.Struct({ kind: Schema.Literal("everyone") }),
        Schema.Struct({ kind: Schema.Literal("groups"), groups: Schema.Array(Schema.String) }),
      ]),
    }),
  ]),
});
const label = "Sharing account";
const section = (page: Page, scope: "App accounts" | "Your accounts" = "Your accounts") =>
  page.getByRole("region", { name: scope, exact: true });
const row = (page: Page, scope: "App accounts" | "Your accounts" = "Your accounts") =>
  section(page, scope).getByRole("listitem").filter({ hasText: label });

layer(HostedLive, { excludeTestServices: true })("App account sharing", (it) => {
  it.effect(scenarios.appAccountSharing.title, (context) =>
    withHostedCase(
      context,
      Effect.gen(function* () {
        const api = yield* Api,
          actors = yield* Actors,
          browser = yield* Browser;
        const prefix = `/api/organizations/${actors.organization.id}`;
        const app = yield* body(
          App,
          yield* api.request(actors.owner, "POST", `${prefix}/apps/deploy`, {
            name: `Account sharing ${randomUUID().slice(0, 8)}`,
            files: [{ path: "index.ts", content: source }, appsManifest],
          }),
        );
        const path = `${prefix}/apps/${app.id}`;
        const created: string[] = [];
        yield* Effect.addFinalizer(() =>
          Effect.gen(function* () {
            yield* api.request(actors.owner, "DELETE", path);
            for (const id of created)
              yield* api.request(actors.owner, "DELETE", `${prefix}/accounts/${id}`);
          }).pipe(Effect.orDie),
        );
        const appAccess = yield* body(
          Schema.Struct({ revision: Schema.String }),
          yield* api.request(actors.owner, "GET", `${path}/access`),
        );
        expect(
          (yield* api.request(actors.owner, "PATCH", `${path}/access`, {
            revision: appAccess.revision,
            audience: { kind: "everyone" },
          })).status,
        ).toBe(200);
        const connection = yield* body(
          Resource,
          yield* api.request(actors.owner, "POST", connectionsPath(path, "user", "service"), {
            destination: { kind: "personal" },
          }),
        );
        const account = yield* body(
          Resource,
          yield* api.request(
            actors.owner,
            "POST",
            `${prefix}/connections/${connection.id}/submit`,
            { method: "key", label, fields: { token: `synthetic-${randomUUID()}` } },
          ),
        );
        created.push(account.id);
        yield* linkAccount(actors.owner, path, "team", account.id, "app");
        const accessPath = `${prefix}/accounts/${account.id}/access`;
        const readAccess = () =>
          api
            .request(actors.owner, "GET", accessPath)
            .pipe(Effect.flatMap((response) => body(Access, response)));
        const url = `/org/${actors.organization.slug}/apps/${app.id}?view=accounts`;
        yield* browser.login(actors.owner);
        yield* browser.use("Open account sharing in the app", (page) => page.goto(url));
        for (const scope of ["App accounts", "Your accounts"] as const)
          yield* browser.use(`Show Personal in ${scope}`, (page) =>
            row(page, scope).getByText("Personal", { exact: true }).waitFor(),
          );
        const openMenu = () =>
          browser.use("Open this account's app menu", (page) =>
            row(page)
              .getByRole("button", { name: `Manage ${label}`, exact: true })
              .click(),
          );
        const closeDialog = () =>
          browser.use("Close the access dialog", (page) =>
            page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click(),
          );
        yield* openMenu();
        yield* browser.use("Share directly from the app", (page) =>
          page.getByRole("menuitem", { name: "Share account", exact: true }).click(),
        );
        yield* closeDialog();
        expect((yield* readAccess()).ownership.kind).toBe("personal");
        yield* openMenu();
        yield* browser.use("Open sharing again", (page) =>
          page.getByRole("menuitem", { name: "Share account", exact: true }).click(),
        );
        yield* browser.use("Confirm sharing with everyone", (page) =>
          page
            .getByRole("dialog")
            .getByRole("button", { name: "Share account", exact: true })
            .click(),
        );
        yield* browser.use("Wait for confirmed sharing", (page) =>
          page.getByRole("status").filter({ hasText: "Saved" }).waitFor(),
        );
        yield* closeDialog();
        for (const scope of ["App accounts", "Your accounts"] as const)
          yield* browser.use(`Update sharing in ${scope} without reloading`, (page) =>
            row(page, scope).getByText("Shared · Everyone", { exact: true }).waitFor(),
          );
        expect((yield* readAccess()).ownership).toEqual({
          kind: "shared",
          audience: { kind: "everyone" },
        });
        yield* linkAccount(actors.member, path, "service", account.id);
        yield* browser.login(actors.member);
        yield* browser.use("Open the member's app accounts", (page) => page.goto(url));
        yield* browser.use("Read sharing on the read-only app link", (page) =>
          row(page, "App accounts").getByText("Shared · Everyone", { exact: true }).waitFor(),
        );
        yield* openMenu();
        expect(
          yield* browser.use("No member access-management action", (page) =>
            page
              .getByRole("menuitem", { name: /Share account|Manage access|Make personal/ })
              .count(),
          ),
        ).toBe(0);
        yield* browser.use("Close the member's menu", (page) => page.keyboard.press("Escape"));
        yield* linkAccount(actors.admin, path, "service", account.id);
        yield* browser.login(actors.admin);
        yield* browser.use("Open the administrator's app accounts", (page) => page.goto(url));
        yield* openMenu();
        yield* browser.use("Administrators can manage shared access", (page) =>
          page.getByRole("menuitem", { name: "Manage access", exact: true }).waitFor(),
        );
        expect(
          yield* browser.use("Only the creator can make it personal", (page) =>
            page.getByRole("menuitem", { name: "Make personal", exact: true }).count(),
          ),
        ).toBe(0);
        yield* browser.use("Close the administrator's menu", (page) =>
          page.keyboard.press("Escape"),
        );
        yield* browser.login(actors.owner);
        yield* browser.use("Return to the creator's app accounts", (page) => page.goto(url));
        const group = yield* body(
          Resource,
          yield* api.request(actors.owner, "POST", `${prefix}/groups`, {
            name: "Account sharing group",
            description: "",
            memberIds: [],
          }),
        );
        yield* Effect.addFinalizer(() =>
          api.request(actors.owner, "DELETE", `${prefix}/groups/${group.id}`).pipe(Effect.orDie),
        );
        yield* openMenu();
        yield* browser.use("Manage access from the app", (page) =>
          page.getByRole("menuitem", { name: "Manage access", exact: true }).click(),
        );
        yield* browser.use("Choose a group audience", (page) =>
          page.getByRole("combobox", { name: "Who can use this account?" }).click(),
        );
        yield* browser.use("Select groups", (page) =>
          page.getByRole("option", { name: "Selected groups", exact: true }).click(),
        );
        yield* browser.use("Choose the real group", (page) =>
          page.getByRole("checkbox", { name: "Account sharing group", exact: true }).check(),
        );
        yield* browser.use("Save the group audience", (page) =>
          page
            .getByRole("dialog")
            .getByRole("button", { name: "Save access", exact: true })
            .click(),
        );
        yield* browser.use("Confirm the group save", (page) =>
          page.getByRole("status").filter({ hasText: "Saved" }).waitFor(),
        );
        yield* closeDialog();
        for (const scope of ["App accounts", "Your accounts"] as const)
          yield* browser.use(`Show the group audience in ${scope}`, (page) =>
            row(page, scope).getByText("Shared · Selected groups", { exact: true }).waitFor(),
          );
        expect((yield* readAccess()).ownership).toEqual({
          kind: "shared",
          audience: { kind: "groups", groups: [group.id] },
        });
        yield* openMenu();
        yield* browser.use("Make personal from the app", (page) =>
          page.getByRole("menuitem", { name: "Make personal", exact: true }).click(),
        );
        yield* browser.use("Confirm personal ownership", (page) =>
          page
            .getByRole("dialog")
            .getByRole("button", { name: "Make personal", exact: true })
            .click(),
        );
        yield* browser.use("Wait for the personal confirmation to close", (page) =>
          page.getByRole("dialog").waitFor({ state: "hidden" }),
        );
        for (const scope of ["App accounts", "Your accounts"] as const)
          yield* browser.use(`Restore Personal in ${scope} without reloading`, (page) =>
            row(page, scope).getByText("Personal", { exact: true }).waitFor(),
          );
        expect((yield* readAccess()).ownership.kind).toBe("personal");
        expect(yield* accountLinks(actors.owner, path)).toEqual([["service", account.id]]);
        expect(yield* accountLinks(actors.owner, path, "app")).toEqual([["team", account.id]]);
        yield* browser.checkpoint("Personal ownership restored inside the app");
      }),
    ),
  );
});
