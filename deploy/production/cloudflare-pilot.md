# Connect Scape through the Executor pilot

The pilot keeps the existing Executor and Tailscale origins. It adds
`https://executor-auth-pilot.planasolutions.ai` through the deployed image's
`EXECUTOR_PUBLIC_ORIGINS` setting. The image and data volumes stay unchanged.

The portal is `https://executor-pilot.planasolutions.ai/mcp`. Its real upstream
uses native Executor OAuth and per-user authorization. The owner requested all
apps and accounts. The portal admits only `vincent@planasolutions.ai`; Code Mode
stays off. Cloudflare documents this external integration; Executor does not
certify it.

## Apply the configuration

1. Review the added public origin in `compose.yaml`. Pull and redeploy Portainer
   Git stack 28 on endpoint 3, preserving its saved environment and disabling
   image pulls and pruning. Check existing private clients again.
2. Keep the tunnel token only in `/opt/executor/pilot/tunnel-token`, owned by root
   with mode 0600. Install `cloudflare-pilot.compose.yaml` as
   `/opt/executor/pilot/compose.yaml` and `cloudflare-pilot.nginx.conf` as
   `/opt/executor/pilot/nginx.conf`.
3. Install `cloudflare-pilot-origin-address.service` as
   `/etc/systemd/system/executor-pilot-origin-address.service`. Enable
   `executor-pilot-origin-address.service` before starting the separate
   `executor-pilot` Compose project. The dedicated address
   is `10.255.44.1/32` on loopback. Neither container shares Executor's data or
   Tailscale state. Nginx binds only the dedicated address, rejects unknown SNI
   and HTTP hosts, and forwards only MCP and OAuth paths to loopback port 4400.
4. Add `cloudflare-pilot.tsdproxy.yaml` to the current
   `/opt/tsdproxy/config/proxies.yaml`. Its existing ACME provider obtains and
   renews the origin's publicly trusted certificate. Nginx mounts only this
   hostname's certificate directory read-only. Variable certificate paths load
   renewed files at each TLS handshake without a restart.
5. Maintain a proxied CNAME from the auth hostname to the tunnel hostname. Its
   content matches `dnsTarget`. The inspected TSDProxy provider preserves an
   existing record whose content matches, including its proxied setting.
6. Apply `cloudflare-pilot.gateway.json`. Gateway overrides only the pilot auth
   hostname to `10.255.44.1` and routes that /32 through the connector. The network
   policy blocks other sources and ports. The HTTP policy blocks other hostnames.
   Do not use the shared proxy's `100.87.129.61` address in these policies or the
   route. Gateway must validate the origin certificate.
7. Apply `cloudflare-pilot.tunnel.json`. Public ingress permits discovery, OAuth,
   login, consent, approval, and build assets. It excludes `/mcp` transport and
   management pages. The final rule returns 404.
8. Keep the auth hostname's Access application owner-only. Its public destination
   overrides permit discovery, OAuth registration, token exchange, and token
   revocation. Executor authenticates these protocol requests. Browser
   authorization retains both Access and native Executor sign-in.
9. Add the real OAuth server with server-level Gateway routing. Attach it to the
   portal with Require user auth enabled. Complete native Executor consent in
   the browser, then reconnect Scape. Do not attach the documentation diagnostic.

## Verify before calling the connection complete

Check TLS and the exact resource and issuer through the dedicated private
origin. Public discovery must advertise the pilot origin; direct public MCP
must not reach Executor. Check unknown SNI, a wrong HTTP Host, and a management
path against the dedicated listener. Verify Gateway allows only the pilot host.

Complete Scape sign-in, consent, tool listing, a harmless real Executor tool
call, refresh, and an unauthorized-identity test. Check the original private
URL, existing clients, and a real Tailscale-backed call. The current acceptance
state is recorded in `cloudflare-pilot-status.md`.

The portal has a documented 60-second upstream tool timeout. Long operations
may exceed it. Capacity and high availability have not been measured. Every-app
access permits powerful operations through native Executor policy. This grant
is not least privilege.

## Roll back the integration

1. Detach the real upstream from the portal and revoke its native Executor grant.
2. Remove the pilot /32 route and DNS override. Remove only the pilot Gateway
   policies after the route is gone.
3. Stop the separate `executor-pilot` Compose project. Disable and stop
   `executor-pilot-origin-address.service` to remove the dedicated address.
4. Remove only the new TSDProxy entry, pilot auth DNS record, and pilot auth Access
   application. Revert the added public origin through Git and manually redeploy
   stack 28. Preserve data, keys, existing DNS, the sidecar, state, and grants.

Do not restore an older database for an ingress-only failure.

## Remove the complete pilot

After the integration rollback, delete the pilot portal, its Access application
and DNS record, the real server and its Access application, and the unused
public-documentation diagnostic and its Access application. Remove all temporary
probe servers and their DNS policies. Delete the tunnel after its connector is
stopped, then remove its root-owned token file. Retain private baseline receipts
until the operator no longer needs recovery evidence. Use the identifiers in
`cloudflare-pilot-status.md`; inspect ownership before deleting any resource.
