import { Config, Effect, Option, Schema } from "effect";

class PublicOriginsInvalid extends Schema.TaggedError<PublicOriginsInvalid>()(
  "PublicOriginsInvalid",
  { message: Schema.String },
) {}

/** Exact origins only. Host is the sole selector; forwarding headers carry no authority. */
export const publicOrigins = Effect.gen(function* () {
  const canonical = yield* Config.String("BETTER_AUTH_URL");
  const configured = yield* Config.String("EXECUTOR_PUBLIC_ORIGINS").pipe(Config.option);
  const origins = Option.isSome(configured)
    ? configured.value.split(",").map((s) => s.trim())
    : [canonical];
  const hosts = new Map<string, string>();
  for (const origin of origins) {
    const url = URL.parse(origin);
    if (
      url === null ||
      url.origin !== origin ||
      origin.includes("*") ||
      !(
        url.protocol === "https:" ||
        (url.protocol === "http:" &&
          (Option.isNone(configured) ||
            url.hostname === "localhost" ||
            url.hostname.endsWith(".localhost") ||
            url.hostname === "127.0.0.1" ||
            url.hostname === "[::1]"))
      ) ||
      hosts.has(url.host)
    )
      return yield* new PublicOriginsInvalid({
        message:
          "EXECUTOR_PUBLIC_ORIGINS requires unique exact HTTPS origins (HTTP is permitted only on localhost).",
      });
    hosts.set(url.host, origin);
  }
  if (origins[0] !== canonical)
    return yield* new PublicOriginsInvalid({
      message: "EXECUTOR_PUBLIC_ORIGINS must begin with BETTER_AUTH_URL.",
    });
  return {
    canonical,
    origins: [canonical, ...origins.slice(1)] as const,
    select: (host: string | undefined) => hosts.get(host ?? "") ?? canonical,
  };
});
