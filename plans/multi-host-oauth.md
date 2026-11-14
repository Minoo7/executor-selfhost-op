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
