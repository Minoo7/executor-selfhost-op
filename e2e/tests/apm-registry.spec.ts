/** APM registry reads of an app's skills: bearer keys, archive bytes and the current revision. */
import { expect, layer } from "@effect/vitest";
import { Effect, Redacted, Schema } from "effect";
import { HttpClient } from "effect/http";
import { createHash, randomUUID } from "node:crypto";
import { scenarios } from "../test-plan.ts";
import { HostedLive, withHostedCase } from "../support/case.ts";
import { Actors } from "../support/actors.ts";
import { Api, body } from "../support/api.ts";
import { App } from "../support/contracts.ts";
import { Target } from "../support/platform.ts";
import { targetHosts } from "../support/role-hosts.ts";
import { skillUpstream } from "../support/skill-upstream.ts";
import { decompressRegistryArchive as decompress } from "../support/apm-registry-client.ts";
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

/** Regular USTAR entries by path, with their permission bits. */
const untar = (archive: Uint8Array) => {
  const entries = new Map<string, { readonly content: string; readonly mode: number }>();
  const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes).replace(/\0.*$/s, "");
  let offset = 0;
  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    const name = text(header.subarray(0, 100));
    if (name === "") break;
    const size = Number.parseInt(text(header.subarray(124, 136)).trim(), 8);
    const start = offset + 512;
    if (text(header.subarray(156, 157)) === "0")
      entries.set(name, {
        content: new TextDecoder().decode(archive.subarray(start, start + size)),
        mode: Number.parseInt(text(header.subarray(100, 108)).trim(), 8),
      });
    offset = start + Math.ceil(size / 512) * 512;
  }
  return entries;
};

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
          name: `APM skills ${randomUUID().slice(0, 8)}`,
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
          expect(response.status).toBe(200);
          const json: unknown = yield* response.json;
          return yield* Schema.decodeUnknownEffect(Versions)(json);
        });
        const archive = (version: string) =>
          Effect.gen(function* () {
            const response = yield* get(`/versions/${encodeURIComponent(version)}/download`);
            expect(response.status).toBe(200);
            expect(response.headers["content-type"]).toBe("application/gzip");
            return new Uint8Array(yield* response.arrayBuffer);
          });
        const sha256 = (bytes: Uint8Array) =>
          `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

        const first = yield* listed;
        expect(first.package).toBe(`${actors.organization.id}/${app.slug}`);
        expect(first.versions).toHaveLength(1);
        const [current] = first.versions;
        if (current === undefined) return yield* Effect.fail(new Error("No version listed"));
        expect(current.version).toMatch(/^1\.0\.0\+[0-9a-f]{64}$/);
        const bytes = yield* archive(current.version);
        expect(sha256(bytes)).toBe(current.digest);
        expect(bytes.length).toBe(current.size_bytes);
        expect(sha256(yield* archive(current.version))).toBe(current.digest);
        const files = untar(yield* decompress(bytes));
        expect(files.get("apm.yml")?.content).toBe(
          `name: ${app.slug}\nversion: ${current.version}\n`,
        );
        expect(files.get(".apm/skills/human-only/SKILL.md")).toEqual({
          content: humanOnly,
          mode: 0o644,
        });
        expect(files.get(".apm/skills/human-only/scripts/pr-wait")).toEqual({
          content: script,
          mode: 0o755,
        });
        expect(files.get(".apm/skills/human-only/agents/openai.yaml")?.content).toBe(
          "policy:\n  allow_implicit_invocation: false\n",
        );
        expect(files.get(".apm/skills/own-policy/agents/openai.yaml")?.content).toBe(
          ownPolicy.replace("invocation: true", "invocation: false"),
        );
        expect(files.has(".apm/skills/quoted/agents/openai.yaml")).toBe(false);
        const remote = files.get(".apm/skills/github-guide/SKILL.md")?.content;
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
          untar(yield* decompress(yield* archive(next.version))).get(
            ".apm/skills/github-guide/SKILL.md",
          )?.content,
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
      }),
    ),
  );
});
