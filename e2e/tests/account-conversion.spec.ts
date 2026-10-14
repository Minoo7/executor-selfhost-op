import { expect, layer } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { Api, body } from "../support/api.ts";
import { Actors } from "../support/actors.ts";
import { Browser } from "../support/browser.ts";
import { HostedLive, withHostedCase } from "../support/case.ts";
import { App, Resource } from "../support/contracts.ts";
import { connectionsPath, linkAccount, linkedAccountIds } from "../support/app-accounts.ts";
import { appsManifest } from "../support/apps-release.ts";
import { scenarios } from "../test-plan.ts";

const Access = Schema.Struct({ revision: Schema.String });
const source = `import {defineApp, defineProvider, secrets, query, object, string, router} from "apps";
const service=defineProvider({name:"Conversion fixture",auth:{key:secrets({label:"Key",fields:object({token:string()})})}});
export default defineApp({user:{accounts:{service:service.many()}},app:{accounts:{delegated:service.many()}}},async ctx=>({name:"Conversion fixture",tools:router({identity:query({input:object({})},async()=>ctx.user.accounts.service.map(account=>account.fields.token)),delegated:query({input:object({})},async()=>ctx.app.accounts.delegated.map(account=>account.fields.token))})}));`;

layer(HostedLive, { excludeTestServices: true })("Account conversion", (it) => {
  it.effect(scenarios.accountConversion.title, (context) =>
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
            name: "Conversion fixture",
            files: [{ path: "index.ts", content: source }, appsManifest],
          }),
        );
        const appPath = `${prefix}/apps/${app.id}`;
        const appAccess = yield* body(
          Access,
          yield* api.request(actors.owner, "GET", `${appPath}/access`),
        );
        expect(
          (yield* api.request(actors.owner, "PATCH", `${appPath}/access`, {
            revision: appAccess.revision,
            audience: { kind: "everyone" },
          })).status,
        ).toBe(200);
        const connection = yield* body(
          Resource,
          yield* api.request(actors.owner, "POST", connectionsPath(appPath, "user", "service"), {
            destination: { kind: "personal" },
          }),
        );
        const account = yield* body(
          Resource,
          yield* api.request(
            actors.owner,
            "POST",
            `${prefix}/connections/${connection.id}/submit`,
            {
              method: "key",
              label: "Convertible account",
              fields: { token: "retained-credential" },
            },
          ),
        );
        yield* Effect.addFinalizer(() =>
          Effect.gen(function* () {
            expect((yield* api.request(actors.owner, "DELETE", appPath)).status).toBe(200);
            expect(
              (yield* api.request(actors.owner, "DELETE", `${prefix}/accounts/${account.id}`))
                .status,
            ).toBe(200);
          }).pipe(Effect.orDie),
        );
        const accessPath = `${prefix}/accounts/${account.id}/access`;
        const original = yield* body(Access, yield* api.request(actors.owner, "GET", accessPath));
        for (const actor of [actors.admin, actors.member]) {
          expect(
            (yield* api.request(actor, "PATCH", accessPath, {
              revision: original.revision,
              audience: { kind: "everyone" },
            })).status,
          ).toBe(403);
        }
        yield* browser.login(actors.owner);
        yield* browser.use("Open saved accounts", (page) =>
          page.goto(`/org/${actors.organization.slug}/accounts`),
        );
        yield* browser.use("Open personal account actions", (page) =>
          page.getByRole("button", { name: "Manage Convertible account", exact: true }).click(),
        );
        yield* browser.use("Choose Share account", (page) =>
          page.getByRole("menuitem", { name: "Share account", exact: true }).click(),
        );
        yield* browser.use("Confirm sharing", (page) =>
          page.getByRole("button", { name: "Share account", exact: true }).click(),
        );
        yield* browser.use("See confirmed sharing", (page) =>
          page.getByRole("status").filter({ hasText: "Saved" }).waitFor(),
        );
        yield* browser.use("Close sharing dialog", (page) => page.keyboard.press("Escape"));
        const shared = yield* body(Access, yield* api.request(actors.owner, "GET", accessPath));
        expect(shared.revision).not.toBe(original.revision);
        expect(
          (yield* api.request(actors.owner, "PATCH", accessPath, {
            revision: original.revision,
            audience: { kind: "everyone" },
          })).status,
        ).toBe(409);
        yield* linkAccount(actors.member, appPath, "service", account.id);
        const call = { tool: "identity", kind: "query", input: {} };
        const used = yield* api.request(actors.member, "POST", `${appPath}/tools/call`, call);
        expect(used.status).toBe(200);
        expect(used.body).toEqual(["retained-credential"]);
        yield* linkAccount(actors.owner, appPath, "delegated", account.id, "app");
        for (const actor of [actors.admin, actors.member]) {
          expect(
            (yield* api.request(actor, "POST", `${accessPath}/personal`, {
              revision: shared.revision,
            })).status,
          ).toBe(403);
        }
        yield* browser.use("Open shared account actions", (page) =>
          page.getByRole("button", { name: "Manage Convertible account", exact: true }).click(),
        );
        yield* browser.use("Choose Make personal", (page) =>
          page.getByRole("menuitem", { name: "Make personal", exact: true }).click(),
        );
        yield* browser.use("Confirm personal ownership", (page) =>
          page.getByRole("button", { name: "Make personal", exact: true }).click(),
        );
        yield* browser.use("See conversion close the dialog", (page) =>
          page.getByRole("dialog").waitFor({ state: "hidden" }),
        );
        expect(
          (yield* api.request(actors.member, "GET", `${prefix}/accounts/${account.id}`)).status,
        ).toBe(403);
        expect(yield* linkedAccountIds(actors.member, appPath)).toEqual([]);
        const delegated = yield* api.request(actors.member, "POST", `${appPath}/tools/call`, {
          ...call,
          tool: "delegated",
        });
        expect(delegated.status).toBe(200);
        expect(delegated.body).toEqual(["retained-credential"]);
        const personal = yield* body(Access, yield* api.request(actors.owner, "GET", accessPath));
        expect(
          (yield* api.request(actors.owner, "POST", `${accessPath}/personal`, {
            revision: shared.revision,
          })).status,
        ).toBe(409);
        const ownerCall = yield* api.request(actors.owner, "POST", `${appPath}/tools/call`, call);
        expect(ownerCall.status).toBe(200);
        expect(ownerCall.body).toEqual(["retained-credential"]);
        expect(yield* linkedAccountIds(actors.owner, appPath)).toEqual([account.id]);
        const competing = yield* Effect.all(
          [0, 1].map(() =>
            api.request(actors.owner, "PATCH", accessPath, {
              revision: personal.revision,
              audience: { kind: "everyone" },
            }),
          ),
          { concurrency: 2 },
        );
        expect(competing.map((response) => response.status).sort()).toEqual([200, 409]);
        expect(yield* linkedAccountIds(actors.member, appPath)).toEqual([account.id]);
        const restored = yield* api.request(actors.member, "POST", `${appPath}/tools/call`, call);
        expect(restored.status).toBe(200);
        expect(restored.body).toEqual(["retained-credential"]);
      }),
    ),
  );
});
