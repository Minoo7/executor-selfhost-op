import { expect, layer } from "@effect/vitest";
import { Deferred, Effect, Fiber, Redacted, Schema, Stream } from "effect";
import { HttpClient, HttpClientRequest } from "effect/http";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { scenarios } from "../test-plan.ts";
import { Api, body } from "../support/api.ts";
import { Actors } from "../support/actors.ts";
import { HostedLive, withHostedCase } from "../support/case.ts";
import { Target } from "../support/platform.ts";
import { App } from "../support/contracts.ts";
const RpcError = Schema.Struct({
  code: Schema.Number,
  message: Schema.String,
  data: Schema.optional(Schema.Unknown),
});
const Message = Schema.Struct({
  jsonrpc: Schema.Literal("2.0"),
  result: Schema.optional(Schema.Unknown),
  error: Schema.optional(RpcError),
});
const SessionId = Schema.NonEmptyString;

/** One POST to /mcp. The session ID is kept for the next request, not in evidence. */
const send = <E>(
  credentials: Readonly<Record<string, string>>,
  body: (
    request: HttpClientRequest.HttpClientRequest,
  ) => Effect.Effect<HttpClientRequest.HttpClientRequest, E>,
  headers: Readonly<Record<string, string>> = {},
  path = "/mcp",
) =>
  Effect.gen(function* () {
    const target = yield* Target,
      http = yield* HttpClient.HttpClient;
    const request = yield* body(
      HttpClientRequest.post(new URL(path, target.metadata.origin), {
        headers: { ...credentials, accept: "application/json, text/event-stream", ...headers },
      }),
    );
    const response = yield* http.execute(request).pipe(Effect.timeout("30 seconds"));
    const text = yield* response.text;
    // A streamed reply ends with the request's response after any notifications.
    const data = response.headers["content-type"]?.startsWith("text/event-stream")
      ? text
          .split("\n")
          .filter((line) => line.startsWith("data: ") && line.length > 6)
          .map((line) => line.slice(6))
          .at(-1)
      : text;
    const reply =
      data === undefined || data === ""
        ? undefined
        : yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Message))(data);
    return {
      status: response.status,
      session: response.headers["mcp-session-id"],
      version: response.headers["mcp-protocol-version"],
      reply,
    };
  }).pipe(Effect.scoped, Effect.provideService(HttpClient.TracerPropagationEnabled, false));

/** One JSON-RPC message per POST. */
const post = (
  credentials: Readonly<Record<string, string>>,
  message: object,
  headers: Readonly<Record<string, string>> = {},
  path = "/mcp",
) => send(credentials, HttpClientRequest.bodyJson({ jsonrpc: "2.0", ...message }), headers, path);

const initialize = (
  credentials: Readonly<Record<string, string>>,
  protocolVersion: string,
  capabilities: object = {},
  path = "/mcp",
) =>
  post(
    credentials,
    {
      id: 1,
      method: "initialize",
      params: {
        protocolVersion,
        capabilities,
        clientInfo: { name: `executor-e2e-${protocolVersion}`, version: "1" },
      },
    },
    {},
    path,
  );

const startSignals = Effect.gen(function* () {
  const calls = new Map<string, Deferred.Deferred<void>>();
  const signal = (call: string) => {
    const known = calls.get(call);
    if (known !== undefined) return known;
    const created = Deferred.makeUnsafe<void>();
    calls.set(call, created);
    return created;
  };
  const server = createServer((request, response) => {
    const call = new URL(request.url ?? "/", "http://signal.internal").searchParams.get("call");
    if (call !== null) Deferred.doneUnsafe(signal(call), Effect.void);
    response.writeHead(204).end();
  });
  const port = yield* Effect.acquireRelease(
    Effect.callback<number>((resume) => {
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        resume(
          typeof address === "object" && address !== null
            ? Effect.succeed(address.port)
            : Effect.die("The start signal needs a TCP listener"),
        );
      });
    }),
    () =>
      Effect.callback<void>((resume) => {
        server.closeAllConnections();
        server.close(() => resume(Effect.void));
      }),
  );
  return {
    origin: `http://127.0.0.1:${port}`,
    started: (call: string) => Deferred.await(signal(call)),
  };
});

/** A POST whose event stream is read as it arrives: each `data` message, in order. */
const stream = (
  credentials: Readonly<Record<string, string>>,
  message: object,
  path: string,
  frames: Array<typeof Frame.Type>,
  first: Deferred.Deferred<void>,
) =>
  Effect.gen(function* () {
    const target = yield* Target,
      http = yield* HttpClient.HttpClient;
    const response = yield* http.execute(
      HttpClientRequest.post(new URL(path, target.metadata.origin), {
        headers: { ...credentials, accept: "application/json, text/event-stream" },
      }).pipe(HttpClientRequest.bodyJsonUnsafe({ jsonrpc: "2.0", ...message })),
    );
    expect(response.status).toBe(200);
    if (!response.headers["content-type"]?.startsWith("text/event-stream"))
      return yield* Effect.die(new Error(yield* response.text));
    yield* response.stream.pipe(
      Stream.decodeText(),
      Stream.splitLines,
      Stream.filter((line) => line.startsWith("data: ")),
      Stream.mapEffect((line) =>
        Schema.decodeUnknownEffect(Schema.fromJsonString(Frame))(line.slice(6)),
      ),
      Stream.runForEach((frame) =>
        Effect.sync(() => frames.push(frame)).pipe(
          Effect.andThen(Deferred.succeed(first, undefined)),
        ),
      ),
    );
    return { status: response.status, contentType: response.headers["content-type"] };
  }).pipe(Effect.scoped, Effect.provideService(HttpClient.TracerPropagationEnabled, false));

const Frame = Schema.Struct({
  id: Schema.optional(Schema.Union([Schema.Number, Schema.String])),
  method: Schema.optional(Schema.String),
  result: Schema.optional(Schema.Unknown),
  error: Schema.optional(Schema.Unknown),
});

const keyCredentials = (name: string) =>
  Effect.gen(function* () {
    const api = yield* Api,
      actors = yield* Actors;
    const key = yield* body(
      Schema.Struct({ id: Schema.String, key: Schema.RedactedFromValue(Schema.String) }),
      yield* api.request(actors.owner, "POST", "/api/auth/api-key/create", { name }),
    );
    yield* Effect.addFinalizer(() =>
      api
        .request(actors.owner, "POST", "/api/auth/api-key/delete", { keyId: key.id })
        .pipe(Effect.orDie),
    );
    return {
      authorization: `Bearer ${Redacted.value(key.key)}`,
      "x-executor-organization": actors.organization.id,
    };
  });

layer(HostedLive, { excludeTestServices: true })("Large input cancellation", (it) => {
  it.effect(scenarios.appLargeCancelled.title, (context) =>
    withHostedCase(
      context,
      Effect.gen(function* () {
        const api = yield* Api,
          actors = yield* Actors,
          signals = yield* startSignals;
        const root = `/api/organizations/${actors.organization.id}/apps`;
        const deployed = yield* api.request(actors.owner, "POST", `${root}/deploy`, {
          name: "Large cancellation",
          files: [
            {
              path: "package.json",
              content: JSON.stringify({ dependencies: { apps: "0.0.1-beta.33" } }),
            },
            {
              path: "index.ts",
              content: `import { defineApp, defineDatabase, table, query, router, object, string } from "apps";
const database = defineDatabase({ proof: table({ value: string() }) });
export default defineApp({ accounts: {}, database }, { tools: router({
 wait: query({ input: object({ text: string() }) }, async (ctx, { text }) => {
   await ctx.db.proof.withIndex("by_creation").count();
   const aborted = new Promise(resolve => ctx.signal.addEventListener("abort", resolve, { once: true }));
   await ctx.fetch(${JSON.stringify(signals.origin + "/?call=running")});
   await aborted;
   return text.length;
 }),
 digest: query({ input: object({ text: string() }) }, async (ctx, { text }) => {
   const stored = await ctx.db.proof.withIndex("by_creation").count();
   const bytes = new TextEncoder().encode(text);
   return { stored, length: text.length, bytes: bytes.length, sha256: Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2, "0")).join("") };
 }) }) });`,
            },
          ],
        });
        expect(deployed.status, JSON.stringify(deployed.body)).toBe(200);
        const app = yield* body(App, deployed);
        yield* Effect.addFinalizer(() =>
          api.request(actors.owner, "DELETE", `${root}/${app.id}`).pipe(Effect.orDie),
        );
        const key = yield* keyCredentials("Large cancellation");
        const opened = yield* initialize(key, "2025-11-25");
        expect(opened.status).toBe(200);
        const credentials = {
          ...key,
          "mcp-session-id": yield* Schema.decodeUnknownEffect(SessionId)(opened.session),
          "mcp-protocol-version": "2025-11-25",
        };
        const frames: Array<typeof Frame.Type> = [],
          first = yield* Deferred.make<void>();
        const running = yield* stream(
          credentials,
          {
            id: 10,
            method: "tools/call",
            params: {
              name: "call",
              arguments: {
                calls: {
                  path: `tools[${JSON.stringify(app.slug)}].wait`,
                  input: { text: "a".repeat(35_200_010) },
                },
              },
            },
          },
          "/mcp",
          frames,
          first,
        ).pipe(Effect.forkScoped);
        yield* Effect.raceFirst(
          signals.started("running"),
          Fiber.join(running).pipe(
            Effect.flatMap(() => Effect.die(new Error(JSON.stringify(frames)))),
          ),
        );
        expect(
          (yield* post(credentials, {
            method: "notifications/cancelled",
            params: { requestId: 10 },
          })).status,
        ).toBe(202);
        expect((yield* Fiber.join(running)).status).toBe(200);
        expect(frames.filter((frame) => frame.id === 10 && frame.method === undefined)).toEqual([]);
        const text = "next aé€😀\ud800";
        const next = yield* post(credentials, {
          id: 11,
          method: "tools/call",
          params: {
            name: "execute",
            arguments: {
              code: `return await tools[${JSON.stringify(app.slug)}].digest({text:${JSON.stringify(text)}})`,
            },
          },
        });
        expect(next.status).toBe(200);
        const result = yield* Schema.decodeUnknownEffect(
          Schema.Struct({ content: Schema.Array(Schema.Struct({ text: Schema.String })) }),
        )(next.reply?.result);
        expect(JSON.parse(result.content[0]!.text).execution.value).toEqual({
          stored: 0,
          length: text.length,
          bytes: Buffer.byteLength(text),
          sha256: createHash("sha256").update(text).digest("hex"),
        });
      }),
    ),
  );
});
