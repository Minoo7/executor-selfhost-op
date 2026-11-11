# Prepare and deploy the beta.39 production-baseline port

Updated 2026-11-11. The current request authorizes building, publishing and read-only
route inspection only. Do not execute the production commands below without a
separate deployment instruction. No production service was stopped or changed.

## Candidate and retained behavior

The source commit is `865206c42468e1c38f4272209cf682a66566c958` on
`upgrade/executor-beta39-20261110`. It extends the beta.39 merge `9baa000e3` with
all running-production changes from `1677c7860872be67d214ad6b52d6d46b24d2fdec`.
Subsequent documentation commits do not change the image source.

```text
registry.depot.dev/5884x6f4tn:2.0.0-beta.39-org-instructions-skill-delete-865206c42
Executor-Build: 2.0.0-beta.39-org-instructions-skill-delete-865206c42
```

Use the immutable index digest in `self-host-beta39-image.json` for activation.
The former `2.0.0-beta.39-org-instructions-9baa000e3` image is superseded because
it omits the production skill-delete feature. Neither image has been deployed.

The complete `f664b14bd..1677c7860` source delta contains two files:

- `packages/ui/src/contracts/app-management.ts` permits null content to delete
  a file or a folder and its descendants through the existing source commit API.
- `packages/ui/src/implementation/dashboard/skill-editor.tsx` adds confirmed
  Delete file and Delete skill actions, followed by deployment of the saved source.

Both were carried over. Beta.39's nonempty source type also requires a guard
before sending filtered files. An attempted empty-source commit is rejected.
Other retained behavior includes all 17 organization-instructions feature files,
account ownership conversion, app-account sharing, credential file upload, both
large-input RPC hops, and exact private HTTPS origins. Effect stays at 4.0.1 with
its custom dynamic-instructions patch. The custom workerd pin stays at
`Minoo7/workerd`, `v1.20260918.1-executor.cfdad918ad`, with both architecture hashes.

Folder deletion retains production semantics. It checks the working revision
between its read and write, but does not reject descendant edits already present
when that read begins. This port does not change that behavior.

The earlier beta.39 merge resolved only two test-registration conflicts, retaining
both organization-instructions scenarios and upstream migration/telemetry coverage.
Private HTTPS and credential PR #2 were already in the deployed ancestry.
Skill deletion is now included by explicit instruction. No other optional branch
was merged. The original skill-delete branch's stored patch was not merged as a
separate repository history.

## Proven current route and baseline

Read-only inspection and a unique request proved this route on 2026-11-11:

```text
executor.planasolutions.ai → DNS A 100.87.129.61
  → shared-proxy-owner Tailscale identity, managed by tsdproxy on cluster
  → executor proxy, 443/https → http://127.0.0.1:4400
  → executor-tailscale network namespace → executor-host in container executor
```

`/opt/tsdproxy/config/proxies.yaml` maps the hostname to provider `owner-shared`,
DNS target `100.87.129.61`, and the loopback backend. A GET to
`/__routeproof_00cb77de159040acbc6b809040866bfd` returned 307 through the hostname.
Cluster's tsdproxy log recorded that exact path, hostname, proxy, port and status.
Three current assets matched through the hostname and loopback by byte count and
SHA-256. `self-host-beta39-route.json` records those fingerprints.

The route uses tsdproxy, not the sidecar's Serve/Funnel route, which exposes only
`/mcp`. SSH refusal at `100.87.129.61:22` does not mean there is another Executor
host there. DNS resolves to a Tailscale address; unrestricted Internet access was
not established.

The running baseline is:

| Parameter               | Confirmed value                                                                |
| ----------------------- | ------------------------------------------------------------------------------ |
| Host                    | `cluster`, `100.79.50.99`                                                      |
| Container               | `executor`, `73717f869eac62257d9b05064b16b108f157862da7b8d55a190f27008869e637` |
| Image                   | `executor-org-instructions:skill-delete-1677c7860-arm64`                       |
| Source revision         | `1677c7860872be67d214ad6b52d6d46b24d2fdec`                                     |
| Image ID                | `sha256:1f921aadddfee82de5fc796430bb1a83db963d4a95a048bcb1ac058eb051d6bb`      |
| Compose project/service | `executor` / `executor`                                                        |
| Compose file            | `/root/executor-skill-delete-20261104/docker-compose.after.yml`                |
| Data volume             | `executor_executor-v2-data`, local Docker driver                               |
| Mount                   | `/app/data`                                                                    |
| Network                 | `network_mode: service:tailscale`                                              |
| Existing start time     | `2026-11-09T13:52:50.251328166Z`                                               |

Compose calls the volume `executor-v2-data` with `external: true` and explicit
`name: executor_executor-v2-data`. Do not substitute an unprefixed volume or let
Compose create a new one. The file contains the existing tailscale and otel-sink
services. Do not recreate either service.

The baseline image itself bakes the misleading f664 build string. Its Compose
service has no `EXECUTOR_BUILD_VERSION` environment entry or env_file. This corrects
the earlier inference that a container-level override caused the old header.
The new image bakes its honest version. Keep manual header overrides absent.

## Verification and image construction

The full static check includes typecheck and dependency-patch validation:

```sh
bun run format
bun run check
bun run e2e:prepare
bun run e2e:self-host --workers 2 --test-name 'Skill deletion confirms|Skill editor saves minimal|Organization MCP instructions|App accounts show sharing|Account creators convert|App RPC delivers|Credential files preserve PEM'
```

Eight scenarios passed across seven spec files. The one Cloud-only tenant-isolation
case is inapplicable to single-organization self-host. The new deletion scenario
checks canceled confirmations, rejection of a changed file, committed and deployed
single-file deletion, nested folder deletion, and preservation of unrelated and
similarly prefixed skills. It waits for persisted source changes rather than a
transiently hidden loading list.

Evidence is in `.local/beta39-skill-delete/` and
`.local/e2e/2026-11-11T07-39-51.223Z-self-host-61ea74/`.
Earlier test-authoring and typecheck failures remain in the evidence directory.
The prior source-port report also records native host tests, credential privacy
checks and migration diagnostics. No production data was used for testing.

The published immutable image was started on both Linux architectures in
[Depot smoke build 8rbnshggck](https://depot.dev/orgs/4z8l73c27s/projects/5884x6f4tn/builds/8rbnshggck).
Both returned healthy responses and the honest skill-delete build header. No
`EXECUTOR_BUILD_VERSION` override was supplied. A BusyBox helper was added only
to the test layer. BuildKit's injected `unix:` OTLP variables were unset there
because Executor expects HTTP exporter endpoints. The image itself was unchanged.
This verifies packaged startup through BuildKit, not a production deployment.

[Synthetic upgrade build 68zpk0b7hn](https://depot.dev/orgs/4z8l73c27s/projects/5884x6f4tn/builds/68zpk0b7hn)
used an amd64 source build of `1677c7860` as its real baseline. It created an
owner, organization, instructions and an app source fixture through public HTTP
routes, then committed deletion of a skill reference. Beta.39 preserved that
state, performed a folder deletion, and retained it across repeat startup and
image-only rollback to the baseline runtime. Restoring the stopped-writer snapshot
returned the original file-deletion state and org revision. This covers synthetic
state, not production credentials, deployed app bundles or retained workflows.
The driver and logs are in `.local/beta39-skill-delete/upgrade-context/` and
`upgrade-acceptance.log`.

The private proposed Compose copy is
`.local/beta39-skill-delete/docker-compose.beta39.candidate.private.yml`.
An object comparison verified that it changes only Executor's image and keeps the
header override absent; all other services and settings match the source file.
It has not been installed on cluster.

The complete source Dockerfile builds the product, browser assets, app framework,
Motel, native Go host and custom workerd for amd64 and arm64. It uses neither
beta.19 overlays nor an official image without our source changes:

```sh
depot build --project 5884x6f4tn --platform linux/amd64,linux/arm64 \
  --file apps/hosted/self-host/Dockerfile \
  --build-arg EXECUTOR_BUILD_VERSION=2.0.0-beta.39-org-instructions-skill-delete-865206c42 \
  --label org.opencontainers.image.revision=865206c42468e1c38f4272209cf682a66566c958 \
  --label org.opencontainers.image.version=2.0.0-beta.39-org-instructions-skill-delete-865206c42 \
  --save --save-tag 2.0.0-beta.39-org-instructions-skill-delete-865206c42 .
```

A rebuild does not promise the same digest because the inherited Dockerfile has
live apt repositories and a floating distroless base. Use the verified index,
not a rebuild, during deployment. Direct registry reads are authoritative because
Depot's intermediate export descriptors may differ from the final registry index.
[Depot's registry documentation](https://depot.dev/docs/registry/overview) describes
project retention for saved images. The current project's setting remains
uninspected with the available user token; recheck availability before deployment.

## Migration and rollback boundaries

SDK storage remains 4.0.16. Beta.32 to beta.39 adds no SDK schema version or hosted
product step. Existing `10_org_mcp_instructions` remains registered and journaled.
Skill deletion adds no database migration.

Better Auth and plugins advance from 1.7.5 to 1.7.16. Its dynamic startup migrator
can add missing tables, columns or indexes, and auth DDL can commit independently
of later product startup. No pending SQL was calculated against production.
Rollback must retain the exact skill-delete baseline image, original configuration,
and complete stopped-writer snapshot. Do not substitute the older f664 image.
A restore discards post-snapshot writes; retain failed candidate data separately.
`EXECUTOR_DATA_STEPS=report` does not suppress schema migration.
Image-only rollback passed for the synthetic fixture, but the production plan
still restores the full pre-upgrade snapshot because production-state compatibility
has not been established.

## Approved deployment session only

Reconfirm the host, source revision, image ID, mount and route immediately before
activation. Stop if any changed. Use the existing Compose project and exact file.
Old Portainer stack IDs and definitions are historical, not the current file.

Run the following in one root Bash session on cluster only after new approval.
Resolve the candidate's immutable index from `self-host-beta39-image.json`.
Supply Depot's pull token privately. On a workstation,
`depot pull-token --project 5884x6f4tn` can generate it.

```sh
set -euo pipefail
umask 077
COMPOSE_PROJECT=executor
COMPOSE_FILE=/root/executor-skill-delete-20261104/docker-compose.after.yml
EXECUTOR_SERVICE=executor
DATA_VOLUME=executor_executor-v2-data
BUILD=2.0.0-beta.39-org-instructions-skill-delete-865206c42
IMAGE=registry.depot.dev/5884x6f4tn@sha256:962cd475cb48f2e9c389982642f84051918e42d7add6942f9763f1f489baab53
BACKUP_DIR=/opt/executor/backups/beta39-skill-delete-865206c42
ROLLBACK_IMAGE=executor-rollback:1677c7860-before-beta39-865206c42
CONTAINER=$(docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" ps -q "$EXECUTOR_SERVICE")
test -n "$CONTAINER"
test "$(docker inspect "$CONTAINER" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')" = 1677c7860872be67d214ad6b52d6d46b24d2fdec
OLD_IMAGE_ID=$(docker inspect "$CONTAINER" --format '{{.Image}}')
test "$OLD_IMAGE_ID" = sha256:1f921aadddfee82de5fc796430bb1a83db963d4a95a048bcb1ac058eb051d6bb
docker login registry.depot.dev --username x-token --password-stdin < "$DEPOT_PULL_TOKEN_FILE"
docker pull "$IMAGE"
test "$(docker image inspect "$IMAGE" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')" = 865206c42468e1c38f4272209cf682a66566c958
mkdir -m 700 "$BACKUP_DIR"
docker inspect "$CONTAINER" > "$BACKUP_DIR/container-before.private.json"
cp -p "$COMPOSE_FILE" "$BACKUP_DIR/docker-compose.before.private.yml"
printf '%s\n' "$OLD_IMAGE_ID" > "$BACKUP_DIR/image-before.id"
if docker image inspect "$ROLLBACK_IMAGE" >/dev/null 2>&1; then
  echo 'Choose an unused rollback tag.' >&2
  exit 1
fi
docker tag "$OLD_IMAGE_ID" "$ROLLBACK_IMAGE"
DATA_DIR=$(docker volume inspect "$DATA_VOLUME" --format '{{.Mountpoint}}')
test -d "$DATA_DIR" && test ! -L "$DATA_DIR"
stat -c '%u %g %a' "$DATA_DIR" > "$BACKUP_DIR/data-before.mode"
```

Privately preserve any externally supplied keys and other persistent mounts.
Confirm all writers and Executor-specific watchdogs first. Record their existing
states and suspend only confirmed Executor watchdogs during the maintenance.
Do not change tsdproxy, Tailscale, telemetry or other services.

```sh
docker stop --time 30 "$CONTAINER"
test -z "$(docker ps -q --filter "volume=$DATA_VOLUME")"
docker save "$ROLLBACK_IMAGE" | gzip -1 > "$BACKUP_DIR/image-before.tar.gz"
tar --numeric-owner --xattrs --acls -C "$DATA_DIR" -cpf - . |
  gzip -1 > "$BACKUP_DIR/data-before.tar.gz"
gzip -t "$BACKUP_DIR/data-before.tar.gz"
tar -tzf "$BACKUP_DIR/data-before.tar.gz" >/dev/null
stat -c '%s' "$BACKUP_DIR/data-before.tar.gz"
(cd "$BACKUP_DIR" && sha256sum image-before.tar.gz data-before.tar.gz > SHA256SUMS)
(cd "$BACKUP_DIR" && sha256sum --check SHA256SUMS)
```

Also confirm that no host process writes the data directory. Copy the complete
backup and private configuration off-host and verify the same archive checksums
there before activation. Do not reset databases or regenerate encryption keys.

Update only `services.executor.image` in the existing Compose file to `$IMAGE`.
Leave `EXECUTOR_BUILD_VERSION` absent from its environment. Keep all other values,
volume mappings, services and network settings unchanged. A private proposed Compose
copy can be prepared locally for review; it is not an applied production change.

```sh
docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" \
  up -d --no-deps --force-recreate "$EXECUTOR_SERVICE"
CONTAINER=$(docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" ps -q "$EXECUTOR_SERVICE")
test -n "$CONTAINER"
ready=0
for attempt in $(seq 1 120); do
  if [ "$(docker inspect "$CONTAINER" --format '{{.State.Health.Status}}')" = healthy ]; then
    ready=1
    break
  fi
  sleep 1
done
test "$ready" = 1
docker exec "$CONTAINER" executor-host health
curl --fail --silent --show-error --dump-header "$BACKUP_DIR/headers-after.txt" \
  https://executor.planasolutions.ai/health -o "$BACKUP_DIR/health-after.json"
grep -Fi "executor-build: $BUILD" "$BACKUP_DIR/headers-after.txt"
test "$(curl --silent --output /dev/null --write-out '%{http_code}' https://executor.planasolutions.ai/org/executor/mcp)" = 401
```

Verify that the login page loads, inspect candidate logs, and verify stored org
instructions through an authorized API/MCP session if one is available. Anonymous
401 is expected and must not be bypassed. Check representative credential-backed
calls and skill deletion on approved fixtures before calling customer acceptance
complete. Restore only the recorded Executor watchdog states after acceptance.

## Immediate rollback on activation or verification failure

Stop confirmed Executor watchdogs and candidate writers. Do not start the old
image on production data modified by the candidate; restore the snapshot too.

```sh
(cd "$BACKUP_DIR" && sha256sum --check SHA256SUMS)
docker stop --time 30 "$CONTAINER"
test -z "$(docker ps -q --filter "volume=$DATA_VOLUME")"
docker load -i "$BACKUP_DIR/image-before.tar.gz"
test "$(docker image inspect "$ROLLBACK_IMAGE" --format '{{.Id}}')" = "$(cat "$BACKUP_DIR/image-before.id")"
FAILED_DIR="${DATA_DIR}.candidate-$(date -u +%Y%m%dT%H%M%SZ)"
test ! -e "$FAILED_DIR"
mv "$DATA_DIR" "$FAILED_DIR"
mkdir "$DATA_DIR"
read -r DATA_UID DATA_GID DATA_MODE < "$BACKUP_DIR/data-before.mode"
chown "$DATA_UID:$DATA_GID" "$DATA_DIR"
chmod "$DATA_MODE" "$DATA_DIR"
tar --numeric-owner --xattrs --acls -xzpf "$BACKUP_DIR/data-before.tar.gz" -C "$DATA_DIR"
cp -p "$BACKUP_DIR/docker-compose.before.private.yml" "$COMPOSE_FILE"
docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" \
  up -d --no-deps --force-recreate "$EXECUTOR_SERVICE"
CONTAINER=$(docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" ps -q "$EXECUTOR_SERVICE")
```

Use the bounded health wait above. Confirm the restored image's actual ID and
1677c7860 revision, not just its misleading f664 header. Recheck identity,
organization instructions, representative credentials and original skill deletion.
Restore watchdog states only after acceptance. Retain both archives and the
candidate directory. The directory move assumes the confirmed ordinary local
Docker volume, not a remote driver or nonstandard mount.
