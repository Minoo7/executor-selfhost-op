import { expect, it } from "@effect/vitest";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { Config, Effect, Schema } from "effect";
import { request as httpRequest } from "node:http";
import { releasedServerWithOrigins } from "../support/docker-release-server.ts";
import { driver } from "../support/platform.ts";

it.effect("released image selects allowlisted OAuth hosts and secure browser cookies", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const alternate = "https://alternate.executor.invalid";
      const f = yield* releasedServerWithOrigins((origin) => [origin, alternate]);
      const build = yield* Config.String("EXECUTOR_E2E_EXPECTED_BUILD").pipe(
        Config.withDefault(""),
      );
      const request = (
        origin: string,
        path: string,
        body?: unknown,
        browserOrigin = body === undefined ? undefined : origin,
      ) =>
        driver(
          "released image HTTP request",
          () =>
            new Promise<Response>((resolve, reject) => {
              const req = httpRequest(
                `http://127.0.0.1:${new URL(f.origin).port}${path}`,
                {
                  method: body === undefined ? "GET" : "POST",
                  headers: {
                    host: new URL(origin).host,
                    origin,
                    "content-type": "application/json",
                    "x-forwarded-host": "spoofed.invalid",
                    "x-forwarded-proto": "https",
                    forwarded: "host=spoofed.invalid;proto=https",
                  },
                },
                (incoming) => {
                  const chunks: Buffer[] = [];
                  incoming.on("data", (chunk: Buffer) => chunks.push(chunk));
                  incoming.on("error", reject);
                  incoming.on("end", () => {
                    const headers = new Headers();
                    for (let i = 0; i < incoming.rawHeaders.length; i += 2)
                      headers.append(
                        incoming.rawHeaders[i] ?? "",
                        incoming.rawHeaders[i + 1] ?? "",
                      );
                    resolve(
                      new Response(Buffer.concat(chunks), {
                        status: incoming.statusCode ?? 500,
                        headers,
                      }),
                    );
                  });
                },
              );
              req.on("error", reject);
              req.end(body === undefined ? undefined : JSON.stringify(body));
            }),
        );
      const json = <A>(response: Response, schema: Schema.Decoder<A>) =>
        driver("decode released image response", () => response.json()).pipe(
          Effect.flatMap(Schema.decodeUnknownEffect(schema)),
        );
      for (const [host, selected] of [
        [f.origin, f.origin],
        [alternate, alternate],
        ["https://unknown.executor.invalid", f.origin],
      ] as const) {
        const health = yield* request(host, "/health");
        expect(health.status).toBe(200);
        expect(health.headers.get("executor-build")).toBeTruthy();
        if (build !== "") expect(health.headers.get("executor-build")).toBe(build);
        expect(yield* json(health, Schema.Struct({ status: Schema.String }))).toEqual({
          status: "ok",
        });
        const metadataResponse = yield* request(host, "/.well-known/oauth-authorization-server");
        expect(metadataResponse.status).toBe(200);
        const metadata = yield* json(
          metadataResponse,
          Schema.Struct({
            issuer: Schema.String,
            authorization_endpoint: Schema.String,
            token_endpoint: Schema.String,
            registration_endpoint: Schema.String,
          }),
        );
        expect(metadata).toEqual({
          issuer: `${selected}/api/auth`,
          authorization_endpoint: `${selected}/api/auth/oauth2/authorize`,
          token_endpoint: `${selected}/api/auth/oauth2/token`,
          registration_endpoint: `${selected}/api/auth/oauth2/register`,
        });
        const resource = yield* request(host, "/.well-known/oauth-protected-resource/mcp");
        expect(resource.status).toBe(200);
        expect(
          yield* json(
            resource,
            Schema.Struct({
              resource: Schema.String,
              authorization_servers: Schema.Array(Schema.String),
            }),
          ),
        ).toEqual({ resource: `${selected}/mcp`, authorization_servers: [`${selected}/api/auth`] });
        const challenge = yield* request(host, "/mcp");
        expect(challenge.status).toBe(401);
        expect(challenge.headers.get("www-authenticate")).toContain(
          `resource_metadata="${selected}/.well-known/oauth-protected-resource/mcp?elicitation_mode=model"`,
        );
      }
      const unlistedBrowser = "https://unknown.executor.invalid";
      expect((yield* request(unlistedBrowser, "/mcp", undefined, unlistedBrowser)).status).toBe(
        403,
      );
      const loginPage = yield* request(alternate, "/login");
      expect(loginPage.status).toBe(200);
      expect(yield* driver("read released login page", () => loginPage.text())).toContain("<html");
      const login = yield* request(alternate, "/api/auth/sign-in/email", {
        email: "release@example.test",
        password: "Synthetic-release-password-123!",
      });
      expect(login.status).toBe(200);
      const cookies = login.headers.getSetCookie();
      expect(cookies.length).toBeGreaterThan(0);
      expect(cookies.every((cookie) => /;\s*secure/i.test(cookie))).toBe(true);
      expect(cookies.every((cookie) => /;\s*httponly/i.test(cookie))).toBe(true);
      expect(cookies.every((cookie) => !/;\s*domain=/i.test(cookie))).toBe(true);
    }),
  ).pipe(Effect.provide(NodeServices.layer)),
);
