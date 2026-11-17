# Connect Scape through the Executor pilot

The pilot keeps the existing Executor and Tailscale origins. It adds
`https://executor-auth-pilot.planasolutions.ai` through the deployed image's
documented `EXECUTOR_PUBLIC_ORIGINS` setting. The image and data volumes stay
unchanged.

Cloudflare's portal is `https://executor-pilot.planasolutions.ai/mcp`.
The upstream is `https://executor-auth-pilot.planasolutions.ai/mcp` with native
Executor OAuth and per-user authorization. The owner requested all apps and
accounts. The portal admits only `vincent@planasolutions.ai`; Code Mode stays off.
This external integration is documented by Cloudflare, not certified by Executor.

## Apply the configuration

1. Review the single added public origin in `compose.yaml`. Pull and redeploy
   Portainer Git stack 28 on endpoint 3, preserving its saved environment and
   disabling image pulls and pruning. Check both existing private origins again.
2. Keep the tunnel token only in `/opt/executor/pilot/tunnel-token`, owned by root
   with mode 0600. Install `cloudflare-pilot.compose.yaml` as
   `/opt/executor/pilot/compose.yaml`. Run its separate `executor-pilot` Compose
   project. It does not share the Executor data volume or Tailscale state.
3. Apply `cloudflare-pilot.tsdproxy.yaml` as one additive entry in the current
   `/opt/tsdproxy/config/proxies.yaml`. The existing ACME provider obtains and
   renews the private origin's publicly trusted TLS certificate.
4. Maintain a proxied CNAME from the pilot auth hostname to the tunnel hostname.
   Its content matches `dnsTarget`. The inspected TSDProxy provider preserves an
   existing record whose content matches, including its proxied setting.
5. Route only the exact pilot auth hostname privately through this tunnel.
   The connector's container-local hosts entry resolves that hostname to
   `100.87.129.61`, so private traffic reaches TSDProxy instead of recursively
   entering the public tunnel. Gateway must validate the origin certificate.
6. Apply `cloudflare-pilot.tunnel.json`. Public ingress permits only discovery,
   OAuth, login, consent, approval, and build asset paths. It excludes `/mcp`
   transport and management pages. The final ingress rule returns 404.
7. Keep the pilot auth hostname's Access application owner-only. Its public
   destination overrides allow discovery, OAuth registration, and token exchange.
   Executor still authenticates those requests. Browser authorization retains
   both Access and native Executor login.
8. Add the upstream OAuth server with server-level Gateway routing. Attach it to
   the portal with Require user auth enabled. Complete native Executor consent
   in the browser, then reconnect Scape.

## Verify before calling the connection complete

Check TLS and the exact pilot resource and issuer through private routing.
Public discovery must identify the pilot origin; direct public MCP must not
reach Executor. Check Scape's upstream consent, tool listing, a harmless real
Executor tool call, refresh, and an unauthorized identity. Verify the original
private URL, existing clients, and a real Tailscale-backed request.

The portal has a documented 60-second upstream tool timeout. Long Executor
operations may exceed it. This pilot does not establish capacity or high
availability. Granting every app permits powerful operations through native
Executor policy. Do not describe this connection as least privilege.

## Roll back

Detach the real upstream from the portal first. Stop only the separate
`executor-pilot` Compose project. Remove only the new TSDProxy entry, private
hostname route, pilot auth DNS record, and pilot auth Access application.
Revert the added public origin through Git and manually redeploy stack 28.
Preserve Executor data, keys, existing DNS, the sidecar, its state, and its grants.
Do not restore an older database for an ingress-only failure.
