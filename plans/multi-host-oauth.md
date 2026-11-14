# Serve OAuth and MCP on two configured hostnames

## Scope and baseline

Build from deployed application source `9d19eb8480b3aba979ac527c38cfdc005dda709f` on branch `feat/multi-host-oauth-20261114`.
Preserve organization MCP instructions, safe skill deletion, stock runtime, and existing credentials.
Production inspection is read-only. No deployment, restart, configuration write, or production data access is authorized.

Done means real synthetic OAuth authorization, code exchange, refresh, and MCP calls work on both configured hosts, unknown hosts use the canonical origin, and an immutable ARM64 image is pushed with a matching baked build identity.

## Observed proxy headers

Unauthenticated nonce-tagged health requests returned 200 through both routes.
Packet inspection in the existing sidecar network namespace showed the following headers at backend port 4400.
Only headers from the probe were retained. Raw traffic was not saved.

| Route           | Host                                    | X-Forwarded-Host                        | X-Forwarded-Proto |
| --------------- | --------------------------------------- | --------------------------------------- | ----------------- |
| TSDProxy        | executor.planasolutions.ai              | executor.planasolutions.ai              | https             |
| Tailscale Serve | executor-scape-egress.tailac7a97.ts.net | executor-scape-egress.tailac7a97.ts.net | https             |

Evidence is local under `.local/multi-host-oauth-20261114/`.
The Mac could not resolve the tailnet hostname. A cluster-host probe also timed out. The successful tailnet probe ran inside the sidecar network namespace with its current IP pinned and certificate validation enabled. This proves backend header handling, not access from Grok Bot.

## Selected design

Use an immutable registry of exact configured HTTP or HTTPS origins, indexed by host.
Canonical `BETTER_AUTH_URL` stays first and is the fallback. Ignore forwarding headers for origin selection.
Reject ambiguous host entries and malformed origins at startup.

Construct bounded fixed-origin Better Auth instances over the existing shared database adapter and secret. Select the matching authentication services per request. Do not mutate singleton options or contexts.
Every instance trusts all configured origins through Better Auth, while Executor's browser-write checks require the selected request origin. Keep host-only cookies and independent browser sign-in on each hostname.

Keep canonical token hashing unchanged. Use the provider's public token-storage hashing option to namespace alternate-origin authorization codes and refresh tokens by issuer and token type. Keep access-token hashing compatible with existing SQL lookup. Validate its exact persisted resource against the selected host's singleton resource origins.
No schema migration is planned. Opaque tokens do not carry a separately verified JWT issuer. Code and refresh lookup isolation plus exact audience validation enforce the hostname boundary.
Reject foreign-host authorization resources before issuance and cover supported resolved authorization-request paths. A rejected cross-host redemption must leave the credential usable on the original host.

Provision missing OAuth resource rows insert-only for every origin, including existing and newly created connection resources. Keep one background lifecycle.

## Design comparison

Both candidates were read in full against actual pinned Better Auth 1.7.16 source.

| Criterion, 0 to 2                                | Fixed instances A | Dynamic instance B |
| ------------------------------------------------ | ----------------- | ------------------ |
| Reuses current captured-origin contracts         | 2                 | 1                  |
| Trusted selection and consistent request context | 2                 | 2                  |
| Code, refresh, and audience isolation            | 2                 | 1                  |
| Preserves canonical behavior and credentials     | 2                 | 2                  |
| Concrete end-to-end verification                 | 2                 | 2                  |

A is the base because fixed instances reuse existing origin-dependent closures and the public storage-hash hook. B's native dynamic baseURL is supported but requires wider conversion of captured-origin code and an additional pre-consumption token guard. Take B's explicit normalization of auth-facing request URLs and coverage of headerless in-process calls.
No cross-lab judge was available in the provider catalog. Both design runs used Codex high, never xhigh. An independent Codex functional review follows implementation.

## Execution and verification

One code owner implements the origin registry, request selection, OAuth isolation, and focused E2E coverage. Parent reviews, verifies the source delta, builds the ARM artifact from committed source only, checks registry identity, and runs synthetic image acceptance.
Run format, check, protocol verification, and only named E2E scenarios. Cover complete flows on both hosts, unknown host, spoofed forwarding, concurrent origins, same-origin writes, rejected foreign credentials, canonical restart compatibility, and existing org/skill features.
Use synthetic fixtures only. The repository's referenced `notes/` directory is absent, so available AGENTS.md, E2E guidance, and existing code patterns govern this change.

## Deployment note

Pending implementation and qualification. No deployment is part of this task.
Keep `BETTER_AUTH_URL=https://executor.planasolutions.ai` and the existing persistent volume, secret, encryption configuration, ports, and ingress.
The new allowlist variable, exact candidate digest, observed checks, and rollback instructions will be recorded after qualification.

## Implemented local policy

`EXECUTOR_PUBLIC_ORIGINS` is a comma-separated exact-origin allowlist with
`BETTER_AUTH_URL` first. An unset variable retains one canonical origin. Configured
entries require HTTPS except HTTP localhost origins. Duplicate hosts, user information,
wildcards, paths, queries, fragments and a different first origin fail startup.
Host alone selects an instance. Unknown hosts use the canonical instance. Existing
app-domain routing remains separate. Forwarding headers are removed before product dispatch.

Each fixed instance supplies Authentication, McpAuthentication, ApiAuthentication,
app-session services, metadata and dashboard document resource URLs for its selected origin.
The existing database adapter and secret are shared. The canonical grant-expiry and
scheduler lifecycles remain the only background owners. There is no schema change.

Canonical token storage is unchanged. Alternate instances use the public provider
`storeTokens.hash(token, type)` option. Access tokens use the provider's existing
SHA-256 and unpadded base64url format. Every other token type hashes the JSON tuple
`[issuer, type, token]`. Code lookup and replay cleanup therefore share the namespace,
and refresh lookup occurs before rotation, replay or family revocation. Device
verification identifiers use the alternate issuer as an HMAC input namespace.
The default hash was checked against the installed provider 1.7.16 implementation.
The implementation uses Web Crypto and Effect's public base64url encoder.
No private dependency import or dependency patch was added.

Selected-origin resource checks reject explicit foreign authorization resources.
Consent and device approval retain exact grant-target checks. The provider does not
configure a request_uri resolver and refuses request_uri at its supported boundary.
The provider claim callback rejects foreign opaque-token resources during introspection,
which the provider reports as inactive without an issuer. SQL MCP and API validators
retain singleton selected-origin audience lists and their existing access-token hash.
Resources for new connections are seeded at every configured origin. Startup inserts
missing resources for existing non-revoked connections at each fixed instance's origin.
Existing resource rows are never overwritten.

## Local qualification

The focused self-host run executed eight scenarios successfully. It covered the new
multi-host scenario, both existing MCP refresh scenarios, OAuth discovery and revocation,
live grant narrowing, organization MCP instructions, skill deletion, and private app bookmarks.
The new scenario verifies PKCE code exchange and refresh on both hosts, cross-host
rejection before consumption, MCP initialize and tools/list, concurrent refresh and
listing, canonical credentials issued before enabling the allowlist, restart, browser
sign-in cookies, selected-origin writes, spoofed forwarding, unknown Host fallback,
device polling isolation, introspection, request_uri refusal and invalid startup settings.

A temporary mutation replaced alternate issuer/type hash input with the raw token.
The named scenario failed because foreign code exchange returned 200 instead of 400.
The mutation was restored. Evidence and commands are in
`.local/multi-host-oauth-20261114/implementation-handoff.md`.

Image build, registry identity, synthetic image acceptance and actual endpoint access
remain the parent's work. Local source qualification is not artifact or production acceptance.
