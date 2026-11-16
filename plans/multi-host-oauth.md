# Serve OAuth and MCP on two configured hostnames

## Final candidate

Prepared and qualified, not deployed. The short procedure is [the deploy note](multi-host-oauth-deploy.md).

- Release source `4a2e8bc9ee75fb9f8d5798d8c1afc01229e1f122`.
- ARM64 tag `registry.depot.dev/5884x6f4tn:2.0.0-beta.40-org-skills-multihost-4a2e8bc9e-arm64`.
- Index digest `sha256:eb61385f240512302f3d3a5e2e9c879485551ba8ff0696fc9c650a0384cdc5b3`.
- ARM64 manifest `sha256:d66fd2b1c6d776b3c6b5bf941bb2b4ad9483575a55e27397161aac3e6f60d1f2`.
- Depot build `2nrcswl09l`.

Eight focused source E2Es passed after the revocation fix, with full repository checks.
The final digest passed the corrected native ARM64 image scenario in one invocation.
It asserted the exact baked header, both authorization-server discovery paths and
host-specific authorization, token, registration, revocation and introspection endpoints,
protected-resource metadata, MCP challenges, unknown-host fallback, forbidden browser
Origin, alternate-host login, and Secure, HttpOnly, host-only cookies.

The owned ARM runner `87vdrc4q4ck31gm` finished and its staging files were removed.
Final receipts are under `.local/multi-host-oauth-20261114/final/`.
An OCI archive preserves all 31 referenced blobs. Its SHA-256 is
`43cc05ecf48a71a2defdd70164e0b6bc6c2fd0a8734fb6dc340d16af22afda7f`.
Depot retention remains unconfirmed, so the archive is retained as a separate recovery artifact.

Focused independent Codex review found no blockers in the revocation fix.
Explicit invalid-hint, unknown-token, and invalid-client revocation assertions remain
coverage gaps, although the guard leaves those paths to the pinned provider as reviewed.
Full device approval, dual-host API-token issuance, and an upgraded customized scoped
connection have not each received their own two-host E2E journey. No Cloud target ran.
External HTTPS, DNS, Grok Bot OAuth acceptance, and production workflows require a later
approved deployment check. This task made no production changes.

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

The qualified candidate and exact image are recorded above. No deployment is part of this task.
Keep `BETTER_AUTH_URL=https://executor.planasolutions.ai` and the existing persistent volume, secret, encryption configuration, ports, and ingress.
The short deploy note contains the allowlist, candidate digest, expected behavior and rollback instructions.

### Prepared configuration for a later approved deployment

Keep the canonical setting unchanged and add this value to the Executor container environment.

```text
EXECUTOR_PUBLIC_ORIGINS=https://executor.planasolutions.ai,https://executor-scape-egress.tailac7a97.ts.net
```

The Git-owned production Compose file currently has no mapping for this variable.
Adding a Portainer stack variable alone does not pass it into the container.
At deployment, add this mapping under `services.executor.environment` in the Git-owned Compose file.

```yaml
EXECUTOR_PUBLIC_ORIGINS: "${EXECUTOR_PUBLIC_ORIGINS:-https://executor.planasolutions.ai}"
```

Set the Portainer variable to the two-origin value above, and update only the Executor image digest through the existing Git-backed stack workflow.
Do not add a manual `EXECUTOR_BUILD_VERSION` override.
Preserve existing environment values, keys, volumes, ports, sidecar configuration, and ingress.
Neither the Compose mapping nor the Portainer variable has been applied by this task.

Each hostname advertises its own issuer and endpoints. Browser cookies remain host-only, so users sign in separately on the two names.
Existing canonical OAuth clients retain their code and refresh-token hashing. Tailnet clients register and authorize through the tailnet hostname.
An access token, code, refresh token, or device code from one hostname is refused by the other hostname.
Unknown Host values use canonical metadata and canonical origin checks. Forwarding headers cannot select an origin.

For rollback, restore the previous Git-owned Compose image digest and remove the new mapping and Portainer variable through Portainer's normal Git stack update.
The previous digest is `registry.depot.dev/5884x6f4tn@sha256:6bd69c2c64941d40821952511c6e829b1805a22e71ce5ae09b68fdac35c8da54`.
This feature adds OAuth resource rows without replacing existing rows and adds no schema migration.
New tailnet OAuth grants will not work on the old image. Preserve the stopped-writer backup required by the production runbook before any future deployment.
If later evidence requires a data restore, use that fresh deployment backup and the prior image together. No deployment backup or production restore was performed here.

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

This initial source qualification did not prove artifact or production acceptance.
Later qualification and review resolutions are recorded below.

The comment and complexity review identified live header-iterator mutation and repeated
SSO discovery. Header deletion now uses a fixed key snapshot. SSO discovery runs once
before constructing the fixed instances. Four obsolete or internal-wiring comment blocks
were removed. The named multi-host scenario and full repository check passed after these
fixes. The source run is `.local/e2e/2026-11-14T15-48-18.832Z-self-host-a97251/`.

## Review resolutions and final source qualification

The first ARM timeout had no retained JSON report. The second retained a 180-second
test timeout. Instrumentation later showed the image became healthy, but `it.effect`
froze the test clock before the fixture's existing startup retry could run. The release
scenario now uses `it.live`, like neighboring Docker scenarios. Its HTTP request helper
also sends the supplied browser Origin and cancels requests with the driver signal.
The corrected scenario passed on the diagnostic `29eff6351` image in 4.24 seconds.
That image is superseded by the rebuilt revocation-fix candidate.

Functional review found wrong-host access-token revocation could delete an issuing
host's token because the provider shares access-token hashes. The selected-resource
guard now checks the stored audience before the provider can revoke a known opaque
access token. It uses the public provider hash API and public authorization-scheme
parser. Unknown tokens retain the provider's handling. No hashing, schema, or provider
patch changed.

The expanded source E2E failed against the unfixed code with a wrong-host revoke
returning 200 instead of 400. With the guard, both directions reject foreign revocation
with and without a token-type hint, including a Bearer-prefixed token. Original-host
MCP calls still work. Own-host revocation returns 200 and subsequent MCP calls return 401.
All eight named regression scenarios passed after this fix. Full repository checks
also passed. Evidence is `.local/e2e/2026-11-14T16-19-07.977Z-self-host-79aee6/` and
`.local/multi-host-oauth-20261114/e2e-revoke-negative.log`.

Vincent approved retaining upstream shared refresh-family invalidation. These are
two origin-specific OAuth entry points into one installation, not isolated user or
client databases. A reused client ID and user retain one global refresh family.
Replay detection or revoking an already-revoked refresh token can invalidate that
family on both origins. This is an explicit exception to origin-specific credential
lookup and audience validation. Separately registered clients have separate families.
The existing refresh replay regression scenarios passed. A dedicated same-client,
two-origin family-invalidation journey has not been run.
