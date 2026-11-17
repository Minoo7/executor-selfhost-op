# Executor pilot state on 17 November 2026

PR #7 added the pilot origin. Portainer stack 28 manually deployed main commit
`777d24640b8a834209109562404dad933ff453fc`. The Executor image and existing data
and Tailscale-state volumes remain unchanged. Portainer recreated the Executor,
Tailscale, and telemetry containers during that redeploy.

## Current dedicated origin

Review identified possible collateral from the initial shared-IP Gateway
policies. That route and all its policies were removed. The pilot now uses
`10.255.44.1/32` on loopback and a separate pinned nginx container. No current
pilot Gateway route or policy includes the shared proxy's `100.87.129.61`.

Systemd creates the dedicated address before Docker on boot. Nginx binds only
that address and mounts only the pilot hostname's ACME certificate directory,
read-only. Its variable certificate paths load the current files at each
handshake. TSDProxy manages ACME renewal; an actual renewal was not observed.

## Runtime checks

- The original private hostname advertises its original OAuth resource and MCP
  authentication challenge. The existing Codex MCP connection reads Portainer
  `/api/status` successfully and receives version 2.45.1.
- The pilot TLS hostname validates and advertises its exact MCP resource and
  issuer. Public discovery through the tunnel advertises the same origin.
  An anonymous public MCP initialize returns Access 302 without Executor headers.
- An actual Cloudflare Gateway probe to the dedicated origin receives native
  Executor OAuth 401. The nginx access log records MCP initialize with 401.
- Direct checks against the dedicated listener receive 404 for a management
  page, 421 for a wrong HTTP Host, and a TLS handshake rejection for unknown SNI.
- A temporary Gateway probe to a separate denial-test hostname on the dedicated
  IP initially returned `dns_error`, then rejected the TLS handshake after its
  DNS override propagated. This proves TLS rejection, not an HTTP-policy 403.
- A custom Host-header probe received 401 because the portal apparently replaced
  that header. It does not establish a wrong-Host denial through Gateway.
- The connector has four ready connections. Its metrics bind only
  `127.0.0.1:20241`. Executor reports healthy. No reboot, WARP-client denial,
  capacity, or high-availability test was performed.

## Open Scape acceptance

Only the real server is attached to the owner-only portal. It uses per-user
OAuth and Code Mode is off. The owner requested all apps and accounts. Native
Executor sign-in and consent are still required; no administrative bearer was
provided to the portal.

Scape's saved connector times out on the portal's server-list tool. Reconnect
returns to Connected without a new visible OAuth flow. Pilot portal tokens were
revoked, but this did not trigger visible reauthorization. The cause of Scape's
remaining failure is not established. Confirmation to remove and re-add this
pilot connector is pending because Scape labels that action permanent.

No successful real Executor tool call, refresh, or unauthorized-identity test
through Scape has been observed. Do not call this integration complete.

## Current Cloudflare resources

- Portal `executor-pilot`; Access application `df49a467-9708-40a4-9b06-0414b18ed844`.
- Real server `executor-selfhost-pilot`; Access application
  `7a13d3ad-c78c-478c-86a5-ee505f0c3197`.
- Pilot browser Access application `71423572-58db-4f21-b46e-998c600032cd`.
- Tunnel `47aa3917-4661-4538-8186-397de2fc635c`.
- Pilot auth DNS record `b724eb7b3dde044fbc08970fe4ac39d6`.
- Dedicated IP route `f0399bf0-067d-4482-be2c-577f1b7250ba`.
- Network boundary `922e9451-145d-406f-babf-438b0732514b`.
- DNS override `118a6918-1169-49ed-b894-b96a2e171f23`.
- HTTP host boundary `b7ec6785-ecf5-449b-b99d-82be14fc1bea`.

The failed service-header experiment's application and service token were
removed. No header-injection policy was created. The superseded private
hostname route, shared-IP route, and shared-IP policies were removed. All four
unattached probe servers, the temporary denial-test DNS policy, and the public
documentation diagnostic server and its Access application were removed.

The tunnel token exists only in a root-owned mode-0600 file under
`/opt/executor/pilot`. The private baseline receipts are retained there.
