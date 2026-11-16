# Executor production stack

Portainer deploys `deploy/production/compose.yaml` from branch `main` of this repository, on the
existing endpoint for the ARM64 host `cluster`. Git owns the Compose file. Portainer owns deployments
and environment inputs. Automatic updates, Git polling, webhooks, pruning and forced pulls stay off.
A push to `main` does not build or deploy anything. The `executor` image is pinned by digest.

## Stack and environment

- Set `EXECUTOR_URL_ALLOW_HTTP_ORIGINS` in Portainer to the exact JSON string the running stack uses,
  including its repaired Geotorget origin. The value is private. Never publish it or swap in an example.
- Volume `executor_executor-v2-data` mounts at `/app/data`. It holds the database, the auth and
  encryption keys, and the app repositories. Volume `scape-egress_scape-egress-state` mounts at
  `/var/lib/tailscale`. Both are external and must already exist.
- Telemetry reads `/opt/executor/otel-sink.yaml` read-only. Keep the Tailscale state, hostname,
  container names, loopback port `4400` and tsdproxy labels. Do not request a new Tailscale auth key.
  Find the stack by name (`executor`) and endpoint, never by a stored stack ID.
- `executor-health.timer` is the watchdog. It must never pin an image or run updates. Suspend only it
  during maintenance and restore its original state after verification.

## Upgrade to a new image

Get owner approval for the digest and the window first. Leave DNS, tsdproxy, Tailscale Serve and
policy, telemetry and other services alone. Never start stopped computers to repair state.

### Build and qualify

1. Merge the source change to `main`. Build from that merge commit through `git archive`, never from
   a working tree or a moving branch head.
2. Build natively for `linux/arm64` with `apps/hosted/self-host/Dockerfile`, never under emulation.
   Pass `EXECUTOR_BUILD_VERSION` as a build argument (`<upstream version>-<features>-<short sha>-arm64`)
   and set the OCI `source`, `revision` and `version` labels. A retag cannot change the baked header.
   Never set `EXECUTOR_BUILD_VERSION` in the container environment.
3. Read the registry index back and record the index and ARM64 manifest digests. Check the labels,
   architecture, baked header, and that `/app/workerd` matches the decompressed `linux-arm64` archive
   pinned in `workerd.json`. Pull with a disposable credential directory. Do not move `latest`.
4. On a native ARM64 runner that is not production, run `e2e/docker-release.config.ts` with
   `EXECUTOR_E2E_DOCKER_IMAGE` set to the candidate digest, and check health, the header, login, MCP
   401, organization instructions in MCP initialize and discovery, and a normal tool call.
5. Use synthetic data. Production data goes only to a private runner with outbound traffic blocked
   (a copied install starts its schedules at once), never to a public sandbox or Depot build.
6. Keep the exact image until the rollback window ends, as a full OCI archive or a digest-checked
   durable copy. Builds are not reproducible: deploy the qualified digest, never a rebuild of its tag.

If Better Auth or the schema changes, review the planned SQL on a stopped copy of the backup first;
Better Auth commits startup DDL on its own, and `EXECUTOR_DATA_STEPS=report` is not a dry run. Never
relabel versions, delete the journal, replay backfills, or use `IF NOT EXISTS` to hide a mismatch.

### Back up

1. Read the stack definition and environment from Portainer and compare them with the running
   container. If they differ, stop: an update from a stale definition reverts live repairs.
2. Run [Verify](#verify) on the old image. If a required workflow already fails, fix that first.
3. With `V` the volume size and `I` the saved image size, reserve `V + I + 1 GiB` for the backup,
   `V + 1 GiB` on the data filesystem (`2V + I + 1 GiB` if shared), and `V + I + 1 GiB` off-host.
4. Pull and inspect the new digest on the host. The stack uses `pull_policy: never`.
5. Save the stack definition, environment, telemetry config and old image (`docker save`). Ask people
   to pause writes; schedules still write.
6. Stop only `executor` and confirm that no container uses the data volume (a failed `docker ps` is
   an error). Never copy a running database. Older archives are no substitute for a fresh backup.
7. Archive with `tar --numeric-owner --xattrs --acls`, record the directory owner and mode, run
   `gzip -t`, list the archive, and write a SHA-256 manifest. Back up Tailscale state the same way,
   with its sidecar stopped, when the sidecar will be recreated.
8. Copy it over SSH to encrypted off-host storage, mode 0700 (it holds the keys), and check the
   manifest, `gzip -t` and listing there. If the copy fails or the window ends, restart the original.

### Activate

Activate and revert only through Portainer. Never write host Compose files, run `docker compose up`,
or change who owns the stack. Merge the new `executor` digest to `main`, check that nothing else
changed, and run Portainer's manual Git pull and redeploy.

### Verify

- Healthy within 120 seconds with no restarts or OOM kills. `/health` returns 200 `{"status":"ok"}`
  with the exact `Executor-Build` header, login and assets load, anonymous `/org/executor/mcp` is 401.
- An operator session works. Never send email codes, bypass approvals or create grants for a check.
- Organization instruction additions and revision match the backup.
- Geotorget `whoami` completes as the expected customer with the saved account.
- Two natural Rakazo `computers` schedule runs succeed. Stopped computers stay stopped. Never call
  reconcile, retry, start or resume by hand.
- App deployments, unpublished app work, account links and grants are unchanged.
- Watch health, restarts and required workflows for 10 minutes, then restore the watchdog.

Classify failures by cause, never by `grep ERROR`. **Roll back** for a failed migration or startup,
a crash or OOM loop, lost data, or a required workflow failing inside Executor. **Hold** and report
for expired credentials, a provider or network failure, or missing evidence; never restore on a guess.
Known log lines alone never cause a rollback, but keep collecting them: `script terminated for unknown
reasons`, `connect(): Connection timed out`, `onBroken()`, and the Better Auth client-IP warning.
Never silence that warning by trusting forwarded headers or disabling rate limits.

### Roll back

An image rollback is a Git change: restore the old digest, merge, redeploy. It does not restore data.

Restore data only for an attributable data or storage failure, using this deployment's backup with
the old image. It loses every write since the backup; external provider actions stay done. After
acceptance, a restore needs a new owner decision.

1. Stop the writer, confirm that nothing uses the volume, and check the manifest.
2. Require an ordinary local directory, not a symlink or mountpoint. Rename the failed data aside on
   the same filesystem. Extract with numeric ownership, ACLs and xattrs; restore owner and mode.
3. Load the saved old image, restore the old digest in Git, redeploy, and run [Verify](#verify).

Never start the old engine on partly restored data, and never restore twice. If a rollback fails,
stop and hand over to the operator.

## Multi-host OAuth

`compose.yaml` sets `EXECUTOR_PUBLIC_ORIGINS` to the canonical origin (`BETTER_AUTH_URL`, always
first), then the tailnet origin. A Portainer variable alone does not reach the container; Compose
must map it. [The self-host README](../../apps/hosted/self-host/README.md#multiple-public-oauth-origins)
defines the format.

- Host selects the origin; unknown hosts get the canonical one. Forwarding headers never select one,
  so both routes (tsdproxy and Tailscale Serve) must pass the public Host.
- Each host has its own issuer, tokens and host-only cookies. A token from one host fails on the
  other. One client ID and user share a refresh family on both hosts; register clients per host.
- No migration. Missing OAuth resource rows are inserted, never overwritten.

After changing these settings, check on both hosts: health and header, anonymous MCP 401
challenges, authorization-server and protected-resource discovery, and a full OAuth flow and MCP call
from a tailnet client. Then run the canonical checks in [Verify](#verify) plus existing MCP clients
and skill deletion. Device approval, API tokens, upgraded scoped connections and same-client refresh
invalidation have no two-host E2E; check them by hand when they matter.

## Recovery

If a Portainer Git deployment fails, keep the diagnostics and inspect the actual stack state before a
retry. Remove only a confirmed replacement stack and keep both volumes. Never reset data to repair a
Git link.

Portainer cannot attach Git to an editor-managed stack in place. To recreate it, back up as above
(with Tailscale state), delete it without removing volumes, and create `executor` on the same
endpoint from `main` with the saved environment. Writable container layers are lost, so all state
must live in the volumes or saved host config.

Inspect a database only as a stopped copy through the PGlite adapter. Never edit `executor_pg_files`
pages or open two engines on one directory.
