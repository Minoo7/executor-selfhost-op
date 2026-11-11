import { expect, layer } from "@effect/vitest";
import { Effect, Redacted, Schema } from "effect";
import { createHash, randomUUID } from "node:crypto";
import { scenarios } from "../test-plan.ts";
import { Api, body, type Session } from "../support/api.ts";
import { Actors } from "../support/actors.ts";
import { TestLive, withCase, withHostedCase } from "../support/case.ts";
import { Target } from "../support/platform.ts";
import { appsManifest } from "../support/apps-release.ts";

const Digest = Schema.Struct({
  length: Schema.Number,
  bytes: Schema.Number,
  sha256: Schema.String,
  stored: Schema.String,
});
const App = Schema.Struct({ id: Schema.String });
const inputs = [
  "small-input",
  "a".repeat(35_200_010),
  "aé€😀".repeat(1_000_003),
  "😀".repeat(600_000),
  "x" + "😀".repeat(600_000),
  "escaped lone surrogate \ud800",
];
const exercise = (database: boolean, actor: Session, prefix: string) =>
  Effect.gen(function* () {
    const api = yield* Api,
      target = yield* Target;
    const local = target.metadata.target === "local";
    const deployed = yield* api.request(actor, "POST", `${prefix}/deploy`, {
      ...(local ? { owner: "local" } : {}),
      name: `Large input ${randomUUID()}`,
      files: [
        appsManifest,
        {
          path: "index.ts",
          content: `import { defineApp, query, router, object, string } from "apps";
export default defineApp({}, { tools: router({ digest: query({ input: object({ text: string() }) }, async (ctx, { text }) => {
 const bytes = new TextEncoder().encode(text);
 const digest = await crypto.subtle.digest("SHA-256", bytes);
 return { length: text.length, bytes: bytes.length, sha256: Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join(""), stored: ${database ? 'ctx.sql.exec("SELECT value FROM proof").one().value' : '"stateless"'} };
}) }) });`,
        },
        ...(database
          ? [
              {
                path: "migrations/0001_proof.sql",
                content: "CREATE TABLE proof (value TEXT); INSERT INTO proof VALUES ('facet');",
              },
            ]
          : []),
      ],
    });
    expect(deployed.status, JSON.stringify(deployed.body)).toBe(200);
    const app = local
      ? (yield* body(Schema.Struct({ app: App }), deployed)).app
      : yield* body(App, deployed);
    yield* Effect.addFinalizer(() =>
      api.request(actor, "DELETE", `${prefix}/${app.id}`).pipe(Effect.orDie),
    );
    for (const text of inputs) {
      const response = yield* api.request(
        actor,
        "POST",
        local ? "/v1/tools/call" : `${prefix}/${app.id}/tools/call`,
        { ...(local ? { app: app.id } : {}), tool: "digest", kind: "query", input: { text } },
      );
      expect(response.status, JSON.stringify(response.body)).toBe(200);
      const actual = local
        ? yield* body(
            Schema.Struct({ status: Schema.Literal("completed"), value: Digest }),
            response,
          ).pipe(Effect.map((reply) => reply.value))
        : yield* body(Digest, response);
      expect(actual).toEqual({
        length: text.length,
        bytes: Buffer.byteLength(text),
        sha256: createHash("sha256").update(text).digest("hex"),
        stored: database ? "facet" : "stateless",
      });
    }
  });

const hosted = (database: boolean) =>
  Effect.gen(function* () {
    const actors = yield* Actors;
    yield* exercise(database, actors.owner, `/api/organizations/${actors.organization.id}/apps`);
  });
const local = (database: boolean) =>
  Effect.gen(function* () {
    const api = yield* Api,
      target = yield* Target,
      session = yield* api.session();
    const actor: Session = {
      ...session,
      send: (method, path, data, headers = {}) => {
        const { origin: _origin, ...agentHeaders } = headers;
        return session.send(method, path, data, {
          ...agentHeaders,
          authorization: `Bearer ${Redacted.value(target.apiKey)}`,
        });
      },
    };
    yield* exercise(database, actor, "/v1/apps");
  });
layer(TestLive, { excludeTestServices: true })("Large invocation input", (it) => {
  it.effect(scenarios.appLargeStateless.title, (context) => withHostedCase(context, hosted(false)));
  it.effect(scenarios.appLargeFacet.title, (context) => withHostedCase(context, hosted(true)));
  it.effect(scenarios.localAppLargeStateless.title, (context) => withCase(context, local(false)));
  it.effect(scenarios.localAppLargeFacet.title, (context) => withCase(context, local(true)));
});
