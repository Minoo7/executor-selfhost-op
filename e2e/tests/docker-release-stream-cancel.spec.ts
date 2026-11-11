import { expect, it } from "@effect/vitest";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { Config, Effect, Schedule, Schema } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import { createServer } from "node:net";
import { request as httpRequest } from "node:http";
import { randomBytes } from "node:crypto";
import { driver } from "../support/platform.ts";
import { appsManifest } from "../support/apps-release.ts";
import { containerNpmRegistry } from "../support/npm-registry.ts";

it.live("released native host propagates a dropped MCP response to the waiting app", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const processes = yield* ChildProcessSpawner.ChildProcessSpawner;
      const image = yield* Config.String("EXECUTOR_E2E_DOCKER_IMAGE");
      const id = `executor-cancel-${randomBytes(8).toString("hex")}`;
      const registry = yield* containerNpmRegistry;
      const run = (args: readonly string[]) =>
        processes.string(ChildProcess.make("docker", args, { stderr: "inherit" }));
      const listener = createServer();
      const port = yield* Effect.acquireUseRelease(
        driver(
          "reserve native cancellation port",
          () =>
            new Promise<number>((resolve, reject) => {
              listener.once("error", reject);
              listener.listen(0, "127.0.0.1", () => {
                const address = listener.address();
                if (address === null || typeof address === "string")
                  reject(new Error("No test port"));
                else resolve(address.port);
              });
            }),
        ),
        Effect.succeed,
        () =>
          driver(
            "release native cancellation port",
            () =>
              new Promise<void>((resolve, reject) =>
                listener.close((error) => (error ? reject(error) : resolve())),
              ),
          ),
      );
      const origin = `http://localhost:${port}`;
      const address = `http://127.0.0.1:${port}`;
      yield* Effect.acquireRelease(
        run([
          "run",
          "--detach",
          "--name",
          id,
          "--init",
          "--publish",
          `127.0.0.1:${port}:8080`,
          "--env",
          "PORT=8080",
          "--env",
          "DO_NOT_TRACK=1",
          "--env",
          `BETTER_AUTH_URL=${origin}`,
          "--env",
          `EXECUTOR_APP_UI_BASE_URL=${origin}`,
          ...registry.docker,
          image,
        ]),
        () => run(["rm", "--force", "--volumes", id]).pipe(Effect.orDie),
      );
      const request = (path: string, data?: unknown, cookie?: string) =>
        driver("native cancellation HTTP", () =>
          fetch(`${address}${path}`, {
            method: data === undefined ? "GET" : "POST",
            headers: {
              origin,
              "content-type": "application/json",
              ...(cookie === undefined ? {} : { cookie }),
            },
            ...(data === undefined ? {} : { body: JSON.stringify(data) }),
          }),
        );
      yield* request("/health").pipe(
        Effect.flatMap((response) =>
          response.status === 200 ? Effect.void : Effect.fail("not ready"),
        ),
        Effect.retry({ schedule: Schedule.spaced("250 millis"), times: 200 }),
      );
      const setup = yield* request("/api/auth/self-host/setup", {
        name: "Cancel owner",
        email: "cancel@example.test",
        password: "Synthetic-cancel-password-123!",
        organizationName: "Cancellation lab",
      });
      expect(setup.status).toBe(200);
      const cookie = setup.headers
        .getSetCookie()
        .map((part) => part.split(";")[0])
        .join("; ");
      const organizations = yield* request("/api/auth/organization/list", undefined, cookie);
      const [organization] = yield* Schema.decodeUnknownEffect(
        Schema.NonEmptyArray(Schema.Struct({ id: Schema.String })),
      )(yield* driver("read cancel organization", () => organizations.json()));
      const prefix = `/api/organizations/${organization.id}/apps`;
      const deployed = yield* request(
        `${prefix}/deploy`,
        {
          name: "Disconnect observer",
          files: [
            appsManifest,
            {
              path: "index.ts",
              content: `import { defineApp, query, router, object } from "apps";
let aborted = 0;
export default defineApp({}, { tools: router({
 wait: query({ input: object({}) }, async ctx => {
  const stopped = new Promise(resolve => ctx.signal.addEventListener("abort", () => { aborted++; resolve(); }, { once: true }));
  await ctx.elicit({ mode: "form", message: "Disconnect this client", requestedSchema: { type: "object", properties: {} } });
  await stopped;
  return "unexpected result";
 }),
 observed: query({ input: object({}) }, async () => aborted)
}) });`,
            },
          ],
        },
        cookie,
      );
      expect(
        deployed.status,
        yield* driver("read native deploy status", () => deployed.clone().text()),
      ).toBe(200);
      const app = yield* Schema.decodeUnknownEffect(
        Schema.Struct({ id: Schema.String, slug: Schema.String }),
      )(yield* driver("read native app", () => deployed.json()));
      const keyResponse = yield* request(
        "/api/auth/api-key/create",
        { name: "Native disconnect" },
        cookie,
      );
      const key = yield* Schema.decodeUnknownEffect(Schema.Struct({ key: Schema.String }))(
        yield* driver("read native test key", () => keyResponse.json()),
      );
      const headers = {
        authorization: `Bearer ${key.key}`,
        "x-executor-organization": organization.id,
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      };
      const initialized = yield* driver("initialize native MCP", () =>
        fetch(`${address}/mcp?elicitation_mode=native`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
              protocolVersion: "2025-11-25",
              capabilities: { elicitation: { form: {} } },
              clientInfo: { name: "disconnect-test", version: "1" },
            },
          }),
        }),
      );
      expect(initialized.status).toBe(200);
      yield* driver("consume initialize", () => initialized.text());
      const session = yield* Schema.decodeUnknownEffect(Schema.NonEmptyString)(
        initialized.headers.get("mcp-session-id"),
      );
      yield* driver(
        "drop native MCP response after elicitation",
        () =>
          new Promise<void>((resolve, reject) => {
            const request = httpRequest(
              `${address}/mcp?elicitation_mode=native`,
              {
                method: "POST",
                headers: {
                  ...headers,
                  "mcp-session-id": session,
                  "mcp-protocol-version": "2025-11-25",
                },
              },
              (response) => {
                let text = "";
                response.on("data", (chunk) => {
                  text += chunk.toString();
                  if (text.includes('"method":"elicitation/create"')) {
                    response.destroy();
                    request.destroy();
                    resolve();
                  }
                });
                response.on("end", () =>
                  reject(new Error("MCP response ended before elicitation")),
                );
              },
            );
            request.on("error", reject);
            request.end(
              JSON.stringify({
                jsonrpc: "2.0",
                id: 2,
                method: "tools/call",
                params: {
                  name: "execute",
                  arguments: { code: `return await tools[${JSON.stringify(app.slug)}].wait({})` },
                },
              }),
            );
          }),
      );
      yield* request(
        `${prefix}/${app.id}/tools/call`,
        { tool: "observed", kind: "query", input: {} },
        cookie,
      ).pipe(
        Effect.flatMap((response) => driver("read observed abort count", () => response.json())),
        Effect.flatMap((count) =>
          count === 1 ? Effect.void : Effect.fail("Waiting app has not observed disconnect"),
        ),
        Effect.retry({ schedule: Schedule.spaced("100 millis"), times: 100 }),
      );
    }),
  ).pipe(Effect.provide(NodeServices.layer)),
);
