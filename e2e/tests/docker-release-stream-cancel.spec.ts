import { expect, it } from "@effect/vitest";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { Effect, Schema } from "effect";
import { request as httpRequest } from "node:http";
import { driver } from "../support/platform.ts";
import { appsManifest } from "../support/apps-release.ts";
import { releasedServer } from "../support/docker-release-server.ts";

it.live("released native host propagates a dropped MCP response to the waiting app", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const { json, prefix, address, organization } = yield* releasedServer;
      const app = yield* json(
        Schema.Struct({ id: Schema.String, slug: Schema.String }),
        `${prefix}/apps/deploy`,
        {
          name: "Disconnect observer",
          files: [
            appsManifest,
            {
              path: "index.ts",
              content: `import { defineApp, query, router, object, boolean } from "apps";
let aborted = 0;
let observed;
const stopped = new Promise(resolve => { observed = resolve; });
export default defineApp({}, { tools: router({
 wait: query({ input: object({}) }, async ctx => {
  ctx.signal.addEventListener("abort", () => { aborted++; observed(); }, { once: true });
  await ctx.elicit({ mode: "form", message: "Disconnect this client", requestedSchema: { type: "object", properties: {} } });
  await stopped;
  return "unexpected result";
 }),
 observed: query({ input: object({ wait: boolean() }) }, async (_ctx, { wait }) => { if (wait) await stopped; return aborted; })
}) });`,
            },
          ],
        },
      );
      const observer = (wait: boolean) =>
        json(Schema.Number, `${prefix}/apps/${app.id}/tools/call`, {
          tool: "observed",
          kind: "query",
          input: { wait },
        });
      expect(yield* observer(false)).toBe(0);
      const key = yield* json(Schema.Struct({ key: Schema.String }), "/api/auth/api-key/create", {
        name: "Native disconnect",
      });
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
      expect(yield* observer(true)).toBe(1);
    }),
  ).pipe(Effect.provide(NodeServices.layer)),
);
