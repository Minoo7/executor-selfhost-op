# Deploy the two-host OAuth candidate

Prepared only. This task does not deploy or change production.

## Candidate

- Source `4a2e8bc9ee75fb9f8d5798d8c1afc01229e1f122` on `feat/multi-host-oauth-20261114`.
- ARM64 tag `registry.depot.dev/5884x6f4tn:2.0.0-beta.40-org-skills-multihost-4a2e8bc9e-arm64`.
- Immutable image `registry.depot.dev/5884x6f4tn@sha256:eb61385f240512302f3d3a5e2e9c879485551ba8ff0696fc9c650a0384cdc5b3`.
- Baked `Executor-Build` value `2.0.0-beta.40-org-skills-multihost-4a2e8bc9e-arm64`.

## Configuration for the later approved deployment

Keep `BETTER_AUTH_URL=https://executor.planasolutions.ai`.
Add this mapping under `services.executor.environment` in the Git-owned production Compose file.

```yaml
EXECUTOR_PUBLIC_ORIGINS: "${EXECUTOR_PUBLIC_ORIGINS:-https://executor.planasolutions.ai}"
```

Set the Portainer stack variable to this value.

```text
https://executor.planasolutions.ai,https://executor-scape-egress.tailac7a97.ts.net
```

A Portainer variable alone does not inject it into the container without the Compose mapping.
Update the Executor image to the immutable digest through the existing Git-backed Portainer workflow.
Keep automatic updates disabled. Do not set a manual `EXECUTOR_BUILD_VERSION` override.
Preserve all other settings, secret values, sidecars, ports, ingress, and persistent volumes.
Keep `executor_executor-v2-data` at `/app/data` and retain the original authentication and encryption keys.
Take and verify a fresh stopped-writer backup under the production runbook before activation.

## Expected behavior

Both hostnames advertise their own OAuth issuer, endpoints, and MCP resource metadata.
Each browser signs in separately with host-only cookies, using the same existing user database.
Canonical clients retain their credentials. Tailnet clients register and authorize on the tailnet origin.
Codes, refresh and device lookups, MCP audiences, and access-token revocation enforce the selected origin.
Unknown hosts fall back to canonical. Forwarding headers cannot select an origin.

Refresh-family invalidation retains upstream behavior. The same client ID and user share a family across origins.
Replay detection or revocation of an already-revoked refresh token can sign out both origins.
Register clients separately for independent client families.

After an approved deployment, check health and the baked build header on both names, anonymous MCP 401 challenges, discovery endpoints, and a complete tailnet-client OAuth and MCP call.
Check existing canonical login, MCP clients, organization instructions, skill deletion, and required app workflows.
The artifact E2E models HTTPS through Host on the native proxy. It does not prove external DNS, TLS, or Grok Bot acceptance.

## Rollback

Restore the prior Git-owned Compose image reference through Portainer.

```text
registry.depot.dev/5884x6f4tn@sha256:6bd69c2c64941d40821952511c6e829b1805a22e71ce5ae09b68fdac35c8da54
```

Remove the new Compose mapping and Portainer variable. Keep `BETTER_AUTH_URL` and all existing keys and volume mappings.
No schema migration is added. Missing OAuth resource rows are inserted without replacing existing rows.
The prior image will not support the new tailnet OAuth grants.
If data restoration is required, restore the fresh deployment backup together with the prior image, as the production runbook specifies.
