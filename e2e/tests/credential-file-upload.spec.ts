import { expect, layer } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { createHash, generateKeyPairSync } from "node:crypto";
import { Actors } from "../support/actors.ts";
import { Api, body } from "../support/api.ts";
import { Browser } from "../support/browser.ts";
import { HostedLive, withHostedCase } from "../support/case.ts";
import { App, Resource } from "../support/contracts.ts";
import { appsManifest } from "../support/apps-release.ts";
import { scenarios } from "../test-plan.ts";

const Check = Schema.Struct({ status: Schema.String });
const Digest = Schema.Struct({ keyDigest: Schema.String, tenancy: Schema.String });

layer(HostedLive, { excludeTestServices: true })("Credential file upload", (it) => {
  it.effect(scenarios.credentialFileUpload.title, (context) =>
    withHostedCase(
      context,
      Effect.gen(function* () {
        const actors = yield* Actors;
        const api = yield* Api;
        const browser = yield* Browser;
        const prefix = `/api/organizations/${actors.organization.id}`;
        const pem = generateKeyPairSync("rsa", { modulusLength: 2048 })
          .privateKey.export({ type: "pkcs8", format: "pem" })
          .toString();
        const deployed = yield* api.request(actors.owner, "POST", `${prefix}/apps/deploy`, {
          name: "Credential file upload",
          files: [
            appsManifest,
            {
              path: "index.ts",
              content: `
import { defineApp, defineProvider, object, plain, raw, router, secrets, string, query } from "apps";
import { createHash, createPrivateKey } from "node:crypto";
const service = defineProvider({
  name: "Signing key",
  auth: { key: secrets({ label: "Signing key", fields: object({
    tenancy: plain(string()), privateKey: raw(string()),
  }) }) },
  async health({ account }) {
    createPrivateKey(account.fields.privateKey);
    return { accountInfo: { externalId: "uploaded-key", displayName: "Uploaded key" } };
  },
});
export default defineApp({ user: { accounts: { service } } }, async (ctx) => ({ tools: router({
  digest: query({ input: object({}) }, async () => ({
    tenancy: ctx.user.accounts.service.fields.tenancy,
    keyDigest: createHash("sha256").update(ctx.user.accounts.service.fields.privateKey).digest("hex"),
  })),
}) }));
`,
            },
          ],
        });
        expect(deployed.status).toBe(200);
        const app = yield* body(App, deployed);
        let account: string | undefined;
        yield* Effect.addFinalizer(() =>
          Effect.gen(function* () {
            expect(
              (yield* api.request(actors.owner, "DELETE", `${prefix}/apps/${app.id}`)).status,
            ).toBe(200);
            if (account)
              expect(
                (yield* api.request(actors.owner, "DELETE", `${prefix}/accounts/${account}`))
                  .status,
              ).toBe(200);
          }).pipe(Effect.orDie),
        );
        yield* browser.login(actors.owner);
        yield* browser.use("Open a normal connection form", (page) =>
          page
            .goto(`/org/${actors.organization.slug}/apps/${app.id}?view=accounts`)
            .then(() =>
              page.getByRole("button", { name: "Connect new account", exact: true }).click(),
            ),
        );
        const form = yield* browser.use("Connection form is ready", (page) => {
          const dialog = page.getByRole("dialog", { name: "Connect Signing key", exact: true });
          return dialog.waitFor().then(() => dialog);
        });
        expect(
          yield* browser.use("File upload is a permanent form control", () =>
            form.getByLabel("Upload Private Key file", { exact: true }).count(),
          ),
        ).toBe(1);
        yield* browser.use("Keep the other credential field", () =>
          form.getByLabel("Tenancy", { exact: true }).fill("test-tenancy"),
        );
        yield* browser.use("Reject an empty file without loading it", () =>
          form
            .getByLabel("Upload Private Key file", { exact: true })
            .setInputFiles({ name: "empty.pem", mimeType: "text/plain", buffer: Buffer.alloc(0) })
            .then(() =>
              form.getByRole("alert").filter({ hasText: "Choose a non-empty text file" }).waitFor(),
            ),
        );
        yield* browser.use("Load an actual RSA PEM file", () =>
          form.getByLabel("Upload Private Key file", { exact: true }).setInputFiles({
            name: "signing.pem",
            mimeType: "text/plain",
            buffer: Buffer.from(pem),
          }),
        );
        const check = yield* browser.use(
          "Validate the uploaded key through the real app runtime",
          (page) =>
            Promise.all([
              page.waitForResponse(
                (response) =>
                  response.request().method() === "POST" &&
                  new URL(response.url()).pathname.endsWith("/credential-checks"),
              ),
              form.getByRole("button", { name: "Validate Signing key", exact: true }).click(),
            ]).then(([response]) => response.json() as Promise<unknown>),
        );
        expect((yield* Schema.decodeUnknownEffect(Check)(check)).status).toBe("healthy");
        yield* browser.use("Replacing the file invalidates the previous validation", () =>
          form
            .getByLabel("Upload Private Key file", { exact: true })
            .setInputFiles({
              name: "same-key.pem",
              mimeType: "text/plain",
              buffer: Buffer.from(pem),
            })
            .then(() =>
              form.getByRole("button", { name: "Validate Signing key", exact: true }).waitFor(),
            ),
        );
        yield* browser.use("Validate the replacement", () =>
          form.getByRole("button", { name: "Validate Signing key", exact: true }).click(),
        );
        const saved = yield* browser.use("Save the uploaded credentials", (page) =>
          Promise.all([
            page.waitForResponse(
              (response) =>
                response.request().method() === "POST" &&
                /\/connections\/[^/]+\/submit$/.test(new URL(response.url()).pathname),
            ),
            form.getByRole("button", { name: "Continue", exact: true }).click(),
          ]).then(([response]) => response.json() as Promise<unknown>),
        );
        account = (yield* Schema.decodeUnknownEffect(Resource)(saved)).id;
        const digest = yield* body(
          Digest,
          yield* api.request(actors.owner, "POST", `${prefix}/apps/${app.id}/tools/call`, {
            tool: "digest",
            input: {},
          }),
        );
        expect(digest.tenancy).toBe("test-tenancy");
        expect(digest.keyDigest).toBe(createHash("sha256").update(pem).digest("hex"));
        yield* browser.checkpoint("Uploaded PEM validated and saved with exact newlines");
      }),
    ),
  );
});
