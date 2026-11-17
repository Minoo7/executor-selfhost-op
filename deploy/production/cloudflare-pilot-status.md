# Executor pilot state on 17 November 2026

PR #7 added the pilot origin and connector configuration. Portainer stack 28
manually deployed main commit `777d24640b8a834209109562404dad933ff453fc`.
The Executor image remains the same pinned digest. The data volume remains
`executor_executor-v2-data` at `/app/data`. The Tailscale state uses its existing
external volume. Portainer recreated the Executor, Tailscale, and telemetry
containers during this redeploy.

## Live checks

- The original private hostname returns its original OAuth resource and MCP 401.
- The new private TLS hostname validates and advertises its own exact MCP resource
  and issuer. Public discovery through the tunnel advertises the same values.
- A Cloudflare server probe through Gateway receives native Executor OAuth 401.
  This check still passes after removing the superseded hostname route and
  removing the connector's container-local hosts override.
- A second probe using the original hostname on the shared proxy receives 403.
  Gateway HTTP analytics records `block` for that hostname and `allow` for the
  pilot hostname. These checks do not establish WARP-client denial.
- The connector has four ready connections. Its metrics listener binds only
  `127.0.0.1:20241`. ICMP proxy is disabled by the dropped capabilities.
- Executor reports healthy. The existing Codex MCP connection calls Portainer
  `/api/status` successfully and receives version 2.45.1.

## Open client acceptance

The real server is attached to the owner-only portal with per-user OAuth and
Code Mode off. The documentation diagnostic is detached. The owner requested
all apps and accounts. Native Executor sign-in and consent are still required.

Scape's saved connector times out on the portal's own server-list tool.
Reconnect reuses the existing connection. Pilot portal tokens were revoked to
request a clean login, but Scape still displays Connected without completing
new OAuth. The connector-reset confirmation is pending. No successful real
Executor tool call, token refresh, or unauthorized-identity client test through
Scape has been observed. Do not call this integration complete.

## Cloudflare resource identifiers

- Portal `executor-pilot`; Access application `df49a467-9708-40a4-9b06-0414b18ed844`.
- Real server `executor-selfhost-pilot`; Access application
  `7a13d3ad-c78c-478c-86a5-ee505f0c3197`.
- Pilot browser Access application `71423572-58db-4f21-b46e-998c600032cd`.
- Tunnel `47aa3917-4661-4538-8186-397de2fc635c`.
- Pilot auth DNS record `b724eb7b3dde044fbc08970fe4ac39d6`.
- Private IP route `1443d3dc-baef-4afa-ae1b-24d66d5681e0`.
- Network boundary `8a54c0be-97e9-45a4-9c82-b93f55ce3183`.
- DNS override `697e0dd4-56b4-4398-a17b-1657af1eedc5`.
- HTTP host boundary `58ef683a-4cff-49b4-834a-b4d574afe9dc`.

The failed service-header experiment's Access application and service token
were removed. No header-injection policy was created. The superseded private
hostname route `1384bb6a-5f61-45f3-97df-025e23e6f235` was removed.
Temporary unattached probe servers remain only for the acceptance checks and
must be removed when verification ends. The tunnel token exists only in a
root-owned mode-0600 file under `/opt/executor/pilot`.
