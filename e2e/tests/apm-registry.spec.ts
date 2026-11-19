/** APM registry reads of an app's skills: bearer keys, archive bytes and the current revision. */
import { expect, layer } from "@effect/vitest";
import { Effect, Redacted, Schema } from "effect";
import { HttpClient } from "effect/http";
import { strFromU8, unzipSync } from "fflate";
import { createHash } from "node:crypto";
import { scenarios } from "../test-plan.ts";
import { HostedLive, withHostedCase } from "../support/case.ts";
import { Actors } from "../support/actors.ts";
import { connectionsPath, unlinkAccount } from "../support/app-accounts.ts";
import { Api, body } from "../support/api.ts";
import { App, Resource } from "../support/contracts.ts";
import { Target } from "../support/platform.ts";
import { targetHosts } from "../support/role-hosts.ts";
import { skillUpstream } from "../support/skill-upstream.ts";
import { appsManifest } from "../support/apps-release.ts";

const Key = Schema.Struct({ key: Schema.RedactedFromValue(Schema.NonEmptyString) });
const Versions = Schema.Struct({
  package: Schema.String,
  versions: Schema.Array(
    Schema.Struct({
      version: Schema.String,
      digest: Schema.String,
      published_at: Schema.String,
      size_bytes: Schema.Number,
    }),
  ),
});
const Problem = Schema.Struct({ title: Schema.String, status: Schema.Number });

const humanOnly =
  "---\nname: human-only\ndescription: Run only when the user asks.\ndisable-model-invocation: true\n# kept: comments and key order\n---\n\n# Human only\n";
const ownPolicy = "policy:\n  allow_implicit_invocation: true\ninterface:\n  display_name: Own\n";
const script = "#!/bin/sh\necho waiting\n";

const unpack = (archive: Uint8Array) =>
  new Map(Object.entries(unzipSync(archive)).map(([path, bytes]) => [path, strFromU8(bytes)]));

layer(HostedLive, { excludeTestServices: true })("APM registry", (it) => {
  it.effect(scenarios.apmRegistry.title, (context) =>
    withHostedCase(
      context,
      Effect.gen(function* () {
        const api = yield* Api,
          actors = yield* Actors,
          target = yield* Target,
          http = yield* HttpClient.HttpClient;
        const upstream = yield* skillUpstream;
        const prefix = `/api/organizations/${actors.organization.id}/apps`;
        const deployed = yield* api.request(actors.owner, "POST", `${prefix}/deploy`, {
          name: "2026",
          files: [
            {
              path: "index.ts",
              content: `import { defineApp, dynamicSkills } from "apps";
import { githubSkills } from "apps/skills";
export default defineApp({}, async (ctx) => ({
  dynamicSkills: dynamicSkills({ list: () => githubSkills({ repo: "synthetic/skills", path: "skills", signal: ctx.signal, fetch: (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input);
    return ctx.fetch(${JSON.stringify(upstream.url)} + "/github" + url.pathname + url.search, init);
  } }) }),
}));`,
            },
            { path: "skills/human-only/SKILL.md", content: humanOnly },
            { path: "skills/human-only/scripts/pr-wait", content: script },
            {
              path: "skills/own-policy/SKILL.md",
              content:
                "---\n{name: own-policy, description: Ships its own Codex policy., disable-model-invocation: true}\n---\nBody\n",
            },
            { path: "skills/own-policy/agents/openai.yaml", content: ownPolicy },
            {
              path: "skills/quoted/SKILL.md",
              content:
                '---\nname: quoted\ndescription: A string rather than a boolean.\ndisable-model-invocation: "true"\n---\n',
            },
            appsManifest,
          ],
        });
        expect(deployed.status, JSON.stringify(deployed.body)).toBe(200);
        const app = yield* body(App, deployed);
        expect(app.slug).toBe("2026");
        yield* Effect.addFinalizer(() =>
          api.request(actors.owner, "DELETE", `${prefix}/${app.id}`).pipe(Effect.orDie),
        );
        const created = yield* api.request(actors.owner, "POST", "/api/auth/api-key/create", {
          name: "APM registry",
        });
        expect(created.status).toBe(200);
        const token = Redacted.value((yield* body(Key, created)).key);
        const base = `${targetHosts(target).deployment}/apm/v1/packages/${actors.organization.id}/${app.slug}`;
        const get = (path: string, authorized = true) =>
          http.get(`${base}${path}`, {
            headers: authorized ? { authorization: `Bearer ${token}` } : {},
          });
        const listed = Effect.gen(function* () {
          const response = yield* get("/versions");
          const json: unknown = yield* response.json;
          expect(response.status, JSON.stringify(json)).toBe(200);
          return yield* Schema.decodeUnknownEffect(Versions)(json);
        });
        const archive = (version: string) =>
          Effect.gen(function* () {
            const response = yield* get(`/versions/${encodeURIComponent(version)}/download`);
            expect(response.status).toBe(200);
            expect(response.headers["content-type"]).toBe("application/zip");
            return new Uint8Array(yield* response.arrayBuffer);
          });
        const sha256 = (bytes: Uint8Array) =>
          `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

        const first = yield* listed;
        expect(first.package).toBe(`${actors.organization.id}/${app.slug}`);
        expect(first.versions).toHaveLength(1);
        const [current] = first.versions;
        if (current === undefined) return yield* Effect.fail(new Error("No version listed"));
        expect(current.version).toBe(`1.0.0+${current.digest.slice("sha256:".length)}`);
        const bytes = yield* archive(current.version);
        expect(sha256(bytes)).toBe(current.digest);
        expect(bytes.length).toBe(current.size_bytes);
        expect(sha256(yield* archive(current.version))).toBe(current.digest);
        const files = unpack(bytes);
        expect(files.get("apm.yml")).toBe(`name: "${app.slug}"\nversion: "1.0.0"\n`);
        expect(files.get(".apm/skills/human-only/SKILL.md")).toBe(humanOnly);
        expect(files.get(".apm/skills/human-only/scripts/pr-wait")).toBe(script);
        expect(files.get(".apm/skills/human-only/agents/openai.yaml")).toBe(
          "policy:\n  allow_implicit_invocation: false\n",
        );
        expect(files.get(".apm/skills/own-policy/agents/openai.yaml")).toBe(
          ownPolicy.replace("invocation: true", "invocation: false"),
        );
        expect(files.has(".apm/skills/quoted/agents/openai.yaml")).toBe(false);
        const remote = files.get(".apm/skills/github-guide/SKILL.md");
        expect(remote).toContain("Guide 1");
        expect(
          [...files.keys()].some((path) => path.startsWith(".apm/skills/github-guide/agents/")),
        ).toBe(false);

        yield* upstream.publish(2);
        const second = yield* listed;
        const [next] = second.versions;
        if (next === undefined) return yield* Effect.fail(new Error("No version listed"));
        expect(next.version).not.toBe(current.version);
        expect(
          unpack(yield* archive(next.version)).get(".apm/skills/github-guide/SKILL.md"),
        ).toContain("Guide 2");
        const stale = yield* get(`/versions/${encodeURIComponent(current.version)}/download`);
        expect(stale.status).toBe(404);
        expect(stale.headers["content-type"]).toContain("application/problem+json");

        const anonymous = yield* get("/versions", false);
        expect(anonymous.status).toBe(401);
        expect(anonymous.headers["content-type"]).toContain("application/problem+json");
        const problem: unknown = yield* anonymous.json;
        expect(yield* Schema.decodeUnknownEffect(Problem)(problem)).toMatchObject({ status: 401 });
        const cookieOnly = yield* api.request(
          actors.owner,
          "GET",
          `/apm/v1/packages/${actors.organization.id}/${app.slug}/versions`,
        );
        expect(cookieOnly.status).toBe(401);
        const invalid = yield* http.get(`${base}/versions`, {
          headers: { authorization: "Bearer exp_invalid" },
        });
        expect(invalid.status).toBe(401);
        const missing = yield* http.get(
          `${targetHosts(target).deployment}/apm/v1/packages/${actors.organization.id}/no-such-app/versions`,
          { headers: { authorization: `Bearer ${token}` } },
        );
        expect(missing.status).toBe(404);
        expect(missing.headers["content-type"]).toContain("application/problem+json");
        const otherOrganization = yield* http.get(
          `${targetHosts(target).deployment}/apm/v1/packages/org_other/${app.slug}/versions`,
          { headers: { authorization: `Bearer ${token}` } },
        );
        expect(otherOrganization.status).toBe(403);

        const cleared = yield* api.request(actors.owner, "POST", `${prefix}/${app.id}/deploy`, {
          files: [
            {
              path: "index.ts",
              content:
                'import { defineApp, dynamicSkills } from "apps"; export default defineApp({}, async () => ({ dynamicSkills: dynamicSkills({ list: () => [] }) }));',
            },
            appsManifest,
          ],
        });
        expect(cleared.status, JSON.stringify(cleared.body)).toBe(200);
        const empty = (yield* listed).versions[0];
        if (empty === undefined) return yield* Effect.fail(new Error("No empty version listed"));
        expect(empty.version).not.toBe(next.version);
        const emptyArchive = unpack(yield* archive(empty.version));
        expect([...emptyArchive.keys()]).toEqual([".apm/", "apm.yml"]);
      }),
    ),
  );

  it.effect(scenarios.apmRegistryAccess.title, (context) =>
    withHostedCase(
      context,
      Effect.gen(function* () {
        const api = yield* Api,
          actors = yield* Actors,
          target = yield* Target,
          http = yield* HttpClient.HttpClient;
        const prefix = `/api/organizations/${actors.organization.id}`;
        const deployed = yield* api.request(actors.owner, "POST", `${prefix}/apps/deploy`, {
          name: "Account-linked skills",
          files: [
            {
              path: "index.ts",
              content: `import { defineApp, defineProvider, dynamicSkills, object, secrets, string } from "apps";
const service = defineProvider({ name: "Registry account", auth: { key: secrets({ label: "Key", fields: object({ token: string() }) }) } });
export default defineApp({ user: { accounts: { service } } }, async () => ({
  dynamicSkills: dynamicSkills({ list: () => [] }),
}));`,
            },
            { path: "skills/human-only/SKILL.md", content: humanOnly },
            appsManifest,
          ],
        });
        expect(deployed.status, JSON.stringify(deployed.body)).toBe(200);
        const app = yield* body(App, deployed);
        const appPath = `${prefix}/apps/${app.id}`;
        const access = Schema.Struct({ revision: Schema.String });
        const setAudience = (kind: "everyone" | "private") =>
          Effect.gen(function* () {
            const { revision } = yield* body(
              access,
              yield* api.request(actors.owner, "GET", `${appPath}/access`),
            );
            const result = yield* api.request(actors.owner, "PATCH", `${appPath}/access`, {
              revision,
              audience: { kind },
            });
            expect(result.status, JSON.stringify(result.body)).toBe(200);
          });

        yield* setAudience("everyone");
        const connection = yield* api.request(
          actors.member,
          "POST",
          connectionsPath(appPath, "user", "service"),
          { destination: { kind: "personal" } },
        );
        expect(connection.status, JSON.stringify(connection.body)).toBe(200);
        const { id: pending } = yield* body(Resource, connection);
        const saved = yield* api.request(
          actors.member,
          "POST",
          `${prefix}/connections/${pending}/submit`,
          {
            method: "key",
            label: "Member's registry account",
            fields: { token: "synthetic-registry-token" },
          },
        );
        expect(saved.status, JSON.stringify(saved.body)).toBe(200);
        const account = yield* body(Resource, saved);
        const key = yield* api.request(actors.member, "POST", "/api/auth/api-key/create", {
          name: "Member registry reader",
        });
        expect(key.status).toBe(200);
        const token = Redacted.value((yield* body(Key, key)).key);
        const base = `${targetHosts(target).deployment}/apm/v1/packages/${actors.organization.id}/${app.slug}/versions`;
        const get = (suffix: string) =>
          http.get(`${base}${suffix}`, {
            headers: { authorization: `Bearer ${token}` },
          });
        const listed = yield* get("");
        const json: unknown = yield* listed.json;
        expect(listed.status, JSON.stringify(json)).toBe(200);
        const version = (yield* Schema.decodeUnknownEffect(Versions)(json)).versions[0];
        if (version === undefined) return yield* Effect.fail(new Error("No member version listed"));
        const archivePath = `/${encodeURIComponent(version.version)}/download`;
        const allowed = yield* get(archivePath);
        expect(allowed.status).toBe(200);
        yield* allowed.arrayBuffer;

        yield* unlinkAccount(actors.member, appPath, "service", account.id);
        for (const suffix of ["", archivePath]) {
          const refused = yield* get(suffix);
          expect(refused.status).toBe(409);
          yield* refused.text;
        }

        yield* setAudience("private");
        for (const suffix of ["", archivePath]) {
          const refused = yield* get(suffix);
          expect(refused.status).toBe(403);
          yield* refused.text;
        }
      }),
    ),
  );
});
