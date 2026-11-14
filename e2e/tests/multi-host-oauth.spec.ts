import { expect, layer } from "@effect/vitest";
import { request as httpRequest } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { Effect, Schema } from "effect";
import { Browser } from "../support/browser.ts";
import { McpOAuth } from "../support/mcp-oauth.ts";
import { Actors, password } from "../support/actors.ts";
import { HostedLive, withHostedCase } from "../support/case.ts";
import { Target, driver } from "../support/platform.ts";
import { serverControl } from "../support/server-control.ts";
import { scenarios } from "../test-plan.ts";

const Tokens = Schema.Struct({ access_token: Schema.String, refresh_token: Schema.String });
const Client = Schema.Struct({ client_id: Schema.String, client_secret: Schema.String });
const Redirect = Schema.Struct({ url: Schema.String });

layer(HostedLive, { excludeTestServices: true })("Multiple OAuth origins", (it) => {
  it.effect(scenarios.multiHostOAuth.title, (context) =>
    withHostedCase(
      context,
      Effect.gen(function* () {
        const target = yield* Target;
        const actors = yield* Actors;
        const browser = yield* Browser;
        const oauth = yield* McpOAuth;
        yield* browser.login(actors.owner);
        const prior = yield* oauth.authorize;
        const canonical = target.metadata.origin;
        const alternate = `http://alternate.localhost:${new URL(canonical).port}`;
        yield* serverControl("stop");
        yield* serverControl("environment", 200, {
          EXECUTOR_PUBLIC_ORIGINS: `${canonical},${alternate}`,
        });
        yield* serverControl("start");
        yield* oauth.refresh(prior);
        const request = (origin: string, path: string, init: RequestInit = {}) =>
          driver(
            "public origin HTTP request",
            () =>
              new Promise<Response>((resolve, reject) => {
                const headers = Object.fromEntries(new Headers(init.headers));
                const outgoing = httpRequest(
                  `${canonical}${path}`,
                  {
                    method: init.method ?? "GET",
                    headers: { ...headers, host: new URL(origin).host },
                  },
                  (incoming) => {
                    const parts: Buffer[] = [];
                    incoming.on("data", (part: Buffer) => parts.push(part));
                    incoming.on("error", reject);
                    incoming.on("end", () => {
                      const responseHeaders = new Headers();
                      for (let i = 0; i < incoming.rawHeaders.length; i += 2)
                        responseHeaders.append(
                          incoming.rawHeaders[i] ?? "",
                          incoming.rawHeaders[i + 1] ?? "",
                        );
                      responseHeaders.set("x-e2e-path", new URL(path, canonical).pathname);
                      resolve(
                        new Response(Buffer.concat(parts), {
                          status: incoming.statusCode ?? 500,
                          headers: responseHeaders,
                        }),
                      );
                    });
                  },
                );
                outgoing.on("error", reject);
                outgoing.end(typeof init.body === "string" ? init.body : undefined);
              }),
          );
        const json = <A>(response: Response, schema: Schema.Decoder<A>) =>
          driver(
            `read synthetic OAuth response ${response.status} ${response.headers.get("x-e2e-path")} ${response.headers.get("content-type")}`,
            () => response.json(),
          ).pipe(Effect.flatMap(Schema.decodeUnknownEffect(schema)));
        const cookies = new Map<string, string>();
        for (const origin of [canonical, alternate]) {
          const metadata = yield* json(
            yield* request(origin, "/.well-known/oauth-authorization-server", {
              headers: {
                "x-forwarded-host": new URL(origin === canonical ? alternate : canonical).host,
                "x-forwarded-proto": "https",
                forwarded: "host=spoofed.invalid;proto=https",
              },
            }),
            Schema.Struct({ issuer: Schema.String }),
          );
          expect(metadata.issuer).toBe(`${origin}/api/auth`);
          const login = yield* request(origin, "/api/auth/sign-in/email", {
            method: "POST",
            headers: { origin, "content-type": "application/json" },
            body: JSON.stringify({ email: "owner@example.test", password }),
          });
          expect(login.status).toBe(200);
          const writes = login.headers.getSetCookie();
          expect(writes.length).toBeGreaterThan(0);
          expect(writes.every((cookie) => !/;\s*domain=/i.test(cookie))).toBe(true);
          cookies.set(origin, writes.map((cookie) => cookie.split(";")[0]).join("; "));
        }
        const unknown = yield* json(
          yield* request("http://unknown.localhost", "/.well-known/oauth-authorization-server", {
            headers: {
              "x-forwarded-host": new URL(alternate).host,
              "x-forwarded-proto": "https",
              forwarded: `host=${new URL(alternate).host};proto=https`,
            },
          }),
          Schema.Struct({ issuer: Schema.String }),
        );
        expect(unknown.issuer).toBe(`${canonical}/api/auth`);
        const grants = [];
        for (const origin of [canonical, alternate]) {
          const foreign = origin === canonical ? alternate : canonical;
          const cookie = cookies.get(origin) ?? "";
          const registration = yield* request(origin, "/api/auth/oauth2/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              client_name: `Host ${origin}`,
              redirect_uris: ["http://127.0.0.1:54321/callback"],
              token_endpoint_auth_method: "client_secret_post",
              grant_types: [
                "authorization_code",
                "refresh_token",
                "urn:ietf:params:oauth:grant-type:device_code",
              ],
              response_types: ["code"],
            }),
          });
          expect(registration.status).toBe(201);
          const client = yield* json(registration, Client);
          const deviceResponse = yield* request(origin, "/api/auth/oauth2/device-authorization", {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: client.client_id,
              client_secret: client.client_secret,
              scope: "mcp offline_access",
              resource: `${origin}/mcp`,
            }).toString(),
          });
          expect(deviceResponse.status).toBe(200);
          const device = yield* json(
            deviceResponse,
            Schema.Struct({ device_code: Schema.String, verification_uri: Schema.String }),
          );
          expect(new URL(device.verification_uri).origin).toBe(origin);
          const poll = (host: string) =>
            request(host, "/api/auth/oauth2/token", {
              method: "POST",
              headers: { "content-type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                grant_type: "urn:ietf:params:oauth:grant-type:device_code",
                client_id: client.client_id,
                client_secret: client.client_secret,
                device_code: device.device_code,
              }).toString(),
            });
          expect(
            (yield* json(yield* poll(foreign), Schema.Struct({ error: Schema.String }))).error,
          ).toBe("invalid_grant");
          expect(
            (yield* json(yield* poll(origin), Schema.Struct({ error: Schema.String }))).error,
          ).toBe("authorization_pending");
          const verifier = randomBytes(32).toString("base64url");
          const params = new URLSearchParams({
            response_type: "code",
            client_id: client.client_id,
            redirect_uri: "http://127.0.0.1:54321/callback",
            scope: "mcp offline_access",
            resource: `${origin}/mcp`,
            state: randomBytes(16).toString("hex"),
            code_challenge_method: "S256",
            code_challenge: createHash("sha256").update(verifier).digest("base64url"),
          });
          const deniedParams = new URLSearchParams(params);
          deniedParams.set("resource", `${foreign}/mcp`);
          expect(
            (yield* request(origin, `/api/auth/oauth2/authorize?${deniedParams}`, {
              headers: { cookie },
            })).status,
          ).toBe(400);
          const signIn = yield* request(origin, `/api/auth/oauth2/authorize?${params}`);
          expect(signIn.status).toBe(302);
          expect(new URL(signIn.headers.get("location") ?? "", origin).origin).toBe(origin);
          const authorization = yield* request(origin, `/api/auth/oauth2/authorize?${params}`, {
            headers: { cookie },
          });
          expect(authorization.status).toBe(302);
          const location = new URL(authorization.headers.get("location") ?? "", origin);
          expect(location.origin).toBe(origin);
          const consent = yield* request(origin, "/api/auth/oauth2/consent", {
            method: "POST",
            headers: {
              origin,
              cookie,
              "content-type": "application/json",
              "x-executor-organization": actors.organization.id,
            },
            body: JSON.stringify({ accept: true, oauth_query: location.search.slice(1) }),
          });
          expect(consent.status).toBe(200);
          const redirect = yield* json(consent, Redirect);
          const code = new URL(redirect.url).searchParams.get("code") ?? "";
          expect(code.length > 0).toBe(true);
          const exchange = new URLSearchParams({
            grant_type: "authorization_code",
            client_id: client.client_id,
            client_secret: client.client_secret,
            code,
            code_verifier: verifier,
            redirect_uri: "http://127.0.0.1:54321/callback",
            resource: `${origin}/mcp`,
          });
          const token = (host: string, values: URLSearchParams) =>
            request(host, "/api/auth/oauth2/token", {
              method: "POST",
              headers: { "content-type": "application/x-www-form-urlencoded" },
              body: values.toString(),
            });
          expect((yield* token(foreign, exchange)).status).toBe(400);
          const exchanged = yield* token(origin, exchange);
          expect(exchanged.status).toBe(200);
          const credentials = yield* json(exchanged, Tokens);
          const refresh = new URLSearchParams({
            grant_type: "refresh_token",
            client_id: client.client_id,
            client_secret: client.client_secret,
            refresh_token: credentials.refresh_token,
          });
          expect((yield* token(foreign, refresh)).status).toBe(400);
          const refreshed = yield* token(origin, refresh);
          expect(refreshed.status).toBe(200);
          let current = yield* json(refreshed, Tokens);
          const revoke = (host: string, hint?: string) =>
            request(host, "/api/auth/oauth2/revoke", {
              method: "POST",
              headers: { "content-type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                token: hint === undefined ? `Bearer ${current.access_token}` : current.access_token,
                client_id: client.client_id,
                client_secret: client.client_secret,
                ...(hint === undefined ? {} : { token_type_hint: hint }),
              }).toString(),
            });
          expect((yield* revoke(foreign, "access_token")).status).toBe(400);
          expect((yield* revoke(foreign)).status).toBe(400);
          const introspect = (host: string) =>
            request(host, "/api/auth/oauth2/introspect", {
              method: "POST",
              headers: { "content-type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                token: current.access_token,
                client_id: client.client_id,
                client_secret: client.client_secret,
              }).toString(),
            });
          const foreignIntrospection = yield* json(
            yield* introspect(foreign),
            Schema.Struct({ active: Schema.Boolean, iss: Schema.optionalKey(Schema.String) }),
          );
          expect(foreignIntrospection).toEqual({ active: false });
          const ownIntrospection = yield* json(
            yield* introspect(origin),
            Schema.Struct({ active: Schema.Boolean, iss: Schema.String }),
          );
          expect(ownIntrospection).toEqual({ active: true, iss: `${origin}/api/auth` });
          let session: string | null = null;
          const mcp = (host: string, method: string, id: number, params: unknown = {}) =>
            request(host, "/mcp", {
              method: "POST",
              headers: {
                authorization: `Bearer ${current.access_token}`,
                "content-type": "application/json",
                accept: "application/json, text/event-stream",
                "mcp-protocol-version": "2025-03-26",
                ...(session === null ? {} : { "mcp-session-id": session }),
              },
              body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
            }).pipe(
              Effect.tap((response) =>
                Effect.sync(() => {
                  if (method === "initialize" && response.status === 200)
                    session = response.headers.get("mcp-session-id");
                }),
              ),
            );
          expect(
            (yield* mcp(foreign, "initialize", 1, {
              protocolVersion: "2025-03-26",
              capabilities: {},
              clientInfo: { name: "origin-e2e", version: "1" },
            })).status,
          ).toBe(401);
          expect(
            (yield* mcp(origin, "initialize", 1, {
              protocolVersion: "2025-03-26",
              capabilities: {},
              clientInfo: { name: "origin-e2e", version: "1" },
            })).status,
          ).toBe(200);
          const tools = yield* mcp(origin, "tools/list", 2);
          expect(tools.status).toBe(200);
          expect(yield* driver("read MCP tools result", () => tools.text())).toContain('"tools":');
          expect(
            (yield* request(
              origin,
              `/api/organizations/${actors.organization.id}/mcp-instructions`,
              {
                method: "PUT",
                headers: { cookie, origin: foreign, "content-type": "application/json" },
                body: JSON.stringify({ additions: "", expectedRevision: null }),
              },
            )).status,
          ).toBe(403);
          const instructionsPath = `/api/organizations/${actors.organization.id}/mcp-instructions`;
          const instructions = yield* json(
            yield* request(origin, instructionsPath, { headers: { cookie } }),
            Schema.Struct({ revision: Schema.NullOr(Schema.String) }),
          );
          expect(
            (yield* request(origin, instructionsPath, {
              method: "PUT",
              headers: { cookie, origin, "content-type": "application/json" },
              body: JSON.stringify({ additions: "", expectedRevision: instructions.revision }),
            })).status,
          ).toBe(200);
          const unresolved = new URLSearchParams(params);
          unresolved.delete("resource");
          unresolved.set("request_uri", "urn:synthetic:foreign-resource");
          const refusedRequest = yield* request(
            origin,
            `/api/auth/oauth2/authorize?${unresolved}`,
            { headers: { cookie } },
          );
          expect(refusedRequest.headers.get("location") ?? "").toContain(
            "request_uri_not_supported",
          );
          grants.push({
            origin,
            mcp,
            rotate: Effect.gen(function* () {
              const response = yield* token(
                origin,
                new URLSearchParams({
                  grant_type: "refresh_token",
                  client_id: client.client_id,
                  client_secret: client.client_secret,
                  refresh_token: current.refresh_token,
                }),
              );
              expect(response.status).toBe(200);
              current = yield* json(response, Tokens);
            }),
            revoke: Effect.suspend(() => revoke(origin, "access_token")),
            clearSession: () => {
              session = null;
            },
          });
        }
        yield* Effect.forEach(grants, ({ rotate }) => rotate, { concurrency: "unbounded" });
        yield* Effect.forEach(
          grants,
          ({ origin, mcp }) =>
            mcp(origin, "tools/list", 3).pipe(
              Effect.tap((r) => Effect.sync(() => expect(r.status).toBe(200))),
            ),
          { concurrency: "unbounded" },
        );
        yield* browser.omitNetworkTrace;
        yield* browser.use("Open alternate sign-in", (page) => page.goto(`${alternate}/login`));
        yield* browser.use("Enter synthetic email", (page) =>
          page.getByLabel("Email", { exact: true }).fill("owner@example.test"),
        );
        yield* browser.use("Enter synthetic password", (page) =>
          page.getByLabel("Password", { exact: true }).fill(password),
        );
        yield* browser.use("Sign in on alternate origin", (page) =>
          page.getByRole("button", { name: "Sign in", exact: true }).click(),
        );
        yield* browser.use("Alternate sign-in completes", (page) =>
          page.waitForURL((url) => url.pathname !== "/login"),
        );
        const browserCookies = yield* browser.use("Read independent browser cookie hosts", (page) =>
          page
            .context()
            .cookies()
            .then((cookies) => cookies.map((cookie) => cookie.domain)),
        );
        expect(browserCookies).toContain("alternate.localhost");
        expect(browserCookies).toContain("127.0.0.1");
        yield* serverControl("restart");
        for (const { origin, mcp, clearSession, revoke } of grants) {
          clearSession();
          expect(
            (yield* mcp(origin, "initialize", 4, {
              protocolVersion: "2025-03-26",
              capabilities: {},
              clientInfo: { name: "restart-e2e", version: "1" },
            })).status,
          ).toBe(200);
          expect((yield* mcp(origin, "tools/list", 5)).status).toBe(200);
          expect((yield* revoke).status).toBe(200);
          expect((yield* mcp(origin, "tools/list", 6)).status).toBe(401);
        }
        for (const invalid of [
          `${canonical},${canonical}`,
          `${canonical},https://foreign.invalid/path`,
          `${canonical},https://user:pass@foreign.invalid`,
          `${canonical},https://*.invalid`,
          `${canonical},https://foreign.invalid?query=yes`,
          `${alternate},${canonical}`,
          `${canonical},http://foreign.invalid`,
        ]) {
          yield* serverControl("stop");
          yield* serverControl("environment", 200, { EXECUTOR_PUBLIC_ORIGINS: invalid });
          yield* serverControl("start", 500);
        }
        yield* serverControl("environment", 200, {
          EXECUTOR_PUBLIC_ORIGINS: `${canonical},${alternate}`,
        });
        yield* serverControl("start");
      }).pipe(Effect.provide(McpOAuth.layer)),
    ),
  );
});
