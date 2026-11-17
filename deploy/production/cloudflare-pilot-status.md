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

## Scape acceptance

Only the real server is attached to the owner-only portal. It uses per-user
OAuth and Code Mode is off. The owner requested all apps and accounts. Native
Executor sign-in and consent completed for Plana Solutions; no administrative
bearer was provided to the portal.

The owner approved removing and re-adding the saved Scape connector. The initial
automatic upstream OAuth configuration remained in Waiting with no registered
client. A sync attempt did not complete authentication. The Cloudflare dashboard
accepted the cached password but required a security key; its login was not
completed and MFA was not changed.

The working alternative uses [Cloudflare's manual OAuth configuration](https://developers.cloudflare.com/cloudflare-one/access-controls/ai-controls/mcp-portals/#configure-manual-oauth-credentials).
A confidential client named `Cloudflare Executor portal` was registered through
Executor's public native registration endpoint. It uses `client_secret_basic`,
`mcp offline_access`, authorization-code and refresh-token grants, and the shared
callback `https://oauth-callbacks.cloudflareaccess.com/cdn-cgi/access/outbound-oauth-callback`.
Its secret was passed directly to Cloudflare's API and was not written to these
files. The server has `is_shared_oauth_callback_enabled=true`; the portal retains
per-user authorization. No routing, Access policy, or Executor image change was
needed for this alternative.

Scape Reconnect opened the portal login. The Tailscale identity link did not
finish loading during the attempt; the existing owner email-code method worked.
Native Executor sign-in used the existing 1Password login. Consent displayed
all apps available to the owner and approvals through the agent. The portal
then showed the real backend Connected and returned to Scape's callback.

Cloudflare reports the backend Ready with six native tools: `skills`, `search`,
`describe`, `call`, `execute`, and `resume`. Through Scape, `portal_list_servers`
returned the real backend. Native search and describe found
`tools.portainer.api.status.statusInspect`. A call through
`executor-selfhost-pilot_call` returned Portainer version `2.45.1`. The successful input was
`{"calls":{"path":"tools.portainer.api.status.statusInspect","input":{}}}`.
Scape required its own approval cards. The read-only Executor tool did not
require a second native approval. Earlier attempts with `{path,args}` failed
schema validation; that was a client invocation error, not an ingress failure.

Refresh, revocation, an unauthorized identity, nested `execute`, native approval
resume, long operations, and capacity have not been tested through Scape.
ChatGPT.com has not been tested. This establishes a working Scape read, not full
security or scale acceptance. Executor approval settings remain unchanged.

## Current Cloudflare resources

- Portal `executor-pilot`; Access application `df49a467-9708-40a4-9b06-0414b18ed844`.
- Real server `executor-selfhost-pilot`; Access application
  `7a13d3ad-c78c-478c-86a5-ee505f0c3197`.
- Native OAuth client `mLFjtEiLSKBWaGPyVhBJOWAUzCasckxb`, named
  `Cloudflare Executor portal`.
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
