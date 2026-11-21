/**
 * The read half of APM's registry HTTP API v1 over an app's skill bundle. A package is
 * `{organization}/{app slug}`; its only version identifies the current archive. Bearer
 * authentication, the app policy and account resolution are the skill bundle route's own.
 */
import { permittedAppIds } from "@executor-js/authorization";
import { AppSlug, SkillDefinitionInvalid } from "@executor-js/sdk/core";
import { UserFacingError } from "@executor-js/utils/user-facing-error";
import { Effect, Layer, Schema, SchemaAST } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";
import { Digest } from "effect/crypto";
import { Base64, Hex } from "effect/encoding";
import { Unauthorized } from "../contracts/auth.ts";
import { CurrentPolicy } from "../contracts/authorization.ts";
import { HostedExecutor } from "../contracts/executor.ts";
import { apmPackageArchive } from "./apm-archive.ts";
import { isApiKey } from "./api-keys.ts";
import { currentOwner } from "./access.ts";
import { withOrganizationRequest } from "./organization.ts";
import { appSkillBundle } from "./skills.ts";

const packages = "/apm/v1/packages/:organization/:repo/versions";

class PackageNotFound extends Schema.TaggedError<PackageNotFound>()(
  "PackageNotFound",
  { detail: Schema.String },
  { httpApiStatus: 404 },
) {}

const problem = (status: number, title: string, detail: string, instance: string) =>
  HttpServerResponse.text(
    JSON.stringify({ type: "about:blank", title, status, detail, instance }),
    {
      status,
      contentType: "application/problem+json; charset=utf-8",
      headers: { "cache-control": "no-store" },
    },
  );

const statusOf = (error: unknown) =>
  error instanceof Error && Schema.isSchema(error.constructor)
    ? (SchemaAST.resolveAt<number>("httpApiStatus")(error.constructor.ast) ?? 500)
    : 500;

/** RFC 7807 for every refusal, as the spec requires; the error's own safe message is the detail. */
const problemFor = (error: unknown) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const instance = new URL(request.url, "http://executor.invalid").pathname;
    const status = statusOf(error);
    if (Schema.is(PackageNotFound)(error))
      return problem(404, "Package not found", error.detail, instance);
    if (Schema.is(SkillDefinitionInvalid)(error))
      return problem(400, "Invalid skill definition", error.message, instance);
    if (status >= 500)
      return problem(
        status,
        "Registry read failed",
        "The skill bundle could not be read.",
        instance,
      );
    if (status === 401)
      return problem(
        401,
        "Authentication required",
        "Send an Executor API key as `Authorization: Bearer exp_...`; with APM, set APM_REGISTRY_TOKEN_<NAME>.",
        instance,
      );
    if (status === 403)
      return problem(
        403,
        "Read scope missing",
        "The credential may not read this organization or app's skills (it needs the discover permission on the app).",
        instance,
      );
    return UserFacingError.is(error)
      ? problem(status, error.title, error.message, instance)
      : problem(status, "Registry read failed", "The skill bundle could not be read.", instance);
  });

/** The build metadata identifies the exact archive bytes, including the serialization format. */
const currentPackage = Effect.gen(function* () {
  const params = yield* HttpRouter.params;
  const identity = `${params.organization}/${params.repo}`;
  const slug = yield* Schema.decodeUnknownEffect(AppSlug)(params.repo).pipe(
    Effect.mapError(() => new PackageNotFound({ detail: `No package ${identity}.` })),
  );
  const owner = yield* currentOwner;
  const executor = yield* Effect.flatten(HostedExecutor);
  const policy = yield* CurrentPolicy;
  const [app] = yield* executor.apps.list({ owner, slug, ids: permittedAppIds(policy) });
  if (app === undefined)
    return yield* new PackageNotFound({ detail: `No app with the slug ${slug} is visible here.` });
  const bundle = yield* appSkillBundle({ app: app.id });
  // oxlint-disable-next-line executor/authored-code-through-adapter -- dynamic import
  const yaml = (yield* Effect.promise(() => import("yaml"))).default;
  const archive = apmPackageArchive({ yaml, name: slug, skills: bundle.skills });
  const digest = yield* Digest.Digest.use((crypto) => crypto.digest(Digest.sha256, archive));
  const deployed = yield* executor.apps.version({ owner, app: app.id, version: bundle.version });
  return {
    identity,
    version: `1.0.0+${Hex.encode(digest)}`,
    archive,
    digest,
    publishedAt: deployed.createdAt,
  };
});

const versions = Effect.gen(function* () {
  const current = yield* currentPackage;
  return HttpServerResponse.text(
    JSON.stringify({
      package: current.identity,
      versions: [
        {
          version: current.version,
          digest: `sha256:${Hex.encode(current.digest)}`,
          published_at: current.publishedAt.toISOString(),
          size_bytes: current.archive.length,
        },
      ],
    }),
    { contentType: "application/json; charset=utf-8" },
  );
});

/** APM sends `+` as `%2B`; a router may or may not have decoded the segment already. */
const decoded = (segment: string) => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

/** Only the current revision downloads. An older version's bytes no longer exist, so it is gone. */
const download = Effect.gen(function* () {
  const params = yield* HttpRouter.params;
  const current = yield* currentPackage;
  const requested = decoded(params.version ?? "");
  if (requested !== current.version)
    return yield* new PackageNotFound({
      detail: `Version ${requested} of ${current.identity} is not current; the current version is ${current.version}. Run \`apm update\`.`,
    });
  return HttpServerResponse.uint8Array(current.archive, {
    contentType: "application/zip",
    headers: {
      digest: `sha256=${Base64.encode(current.digest)}`,
      etag: `"sha256:${Hex.encode(current.digest)}"`,
    },
  });
});

const serve = <E, R>(respond: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const token = request.headers.authorization?.match(/^Bearer ([^\s]+)$/i)?.[1];
    if (token === undefined || !isApiKey(token)) return yield* problemFor(new Unauthorized());
    return yield* withOrganizationRequest(() => respond, "discover").pipe(Effect.catch(problemFor));
  });

/** Mount beside the hosted API with the same request services; reads never change state. */
export const apmRegistryRoutes = Layer.mergeAll(
  HttpRouter.add("GET", packages, serve(versions)),
  HttpRouter.add("GET", `${packages}/:version/download`, serve(download)),
);
