import { expect, layer } from "@effect/vitest";
import { Effect } from "effect";
import { createHash, randomUUID } from "node:crypto";
import { Actors } from "../support/actors.ts";
import { Api, body } from "../support/api.ts";
import { appsManifest } from "../support/apps-release.ts";
import { HostedLive, withHostedCase } from "../support/case.ts";
import { App } from "../support/contracts.ts";
import { scenarios } from "../test-plan.ts";

const source = `import { defineApp, router, query, object, string } from "apps";
export default defineApp({}, { tools: router({
  digest: query({ input: object({ value: string() }) }, async (_ctx, { value }) => {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return { length: value.length, bytes: bytes.length,
      digest: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("") };
  }),
}) });`;

layer(HostedLive, { excludeTestServices: true })("App input transport", (it) => {
  it.effect(scenarios.appLargeInput.title, (context) =>
    withHostedCase(
      context,
      Effect.gen(function* () {
        const api = yield* Api,
          actors = yield* Actors;
        const prefix = `/api/organizations/${actors.organization.id}/apps`;
        const deployed = yield* api.request(actors.owner, "POST", `${prefix}/deploy`, {
          name: `Large input ${randomUUID().slice(0, 8)}`,
          files: [{ path: "index.ts", content: source }, appsManifest],
        });
        expect(deployed.status).toBe(200);
        const appPath = `${prefix}/${(yield* body(App, deployed)).id}`;
        yield* Effect.addFinalizer(() =>
          api.request(actors.owner, "DELETE", appPath).pipe(Effect.orDie),
        );
        for (const value of ["small-input", `start-${"boundary".repeat(4_400_000)}-end`]) {
          const result = yield* api.request(actors.owner, "POST", `${appPath}/tools/call`, {
            tool: "digest",
            kind: "query",
            input: { value },
          });
          expect(result.status, "The complete tool input must cross both Worker RPC hops").toBe(
            200,
          );
          expect(result.body).toEqual({
            length: value.length,
            bytes: Buffer.byteLength(value),
            digest: createHash("sha256").update(value).digest("hex"),
          });
        }
      }),
    ),
  );
});
