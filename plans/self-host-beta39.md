# Upgrade the customized self-host to beta.39

Prepared on 2026-11-10 and verified through 2026-11-11. No deployment is authorized
by this document.

The source merge is `9baa000e3abc275051e313efa3b4d0ffc43895de` on
`upgrade/executor-beta39-20261110`. Its parents are deployed `f664b14bd` and
upstream tag `executor@2.0.0-beta.39`, commit `e97eecce65f809de0ce1077ab2de8b17d967f4f7`.
Later commits on this branch contain the handoff records only.

## Published image

```text
registry.depot.dev/5884x6f4tn:2.0.0-beta.39-org-instructions-9baa000e3
```

The image includes native `linux/amd64` and `linux/arm64` builds. The build version
is `2.0.0-beta.39-org-instructions-9baa000e3`. The OCI revision names the source
merge above. No `latest` tag was moved.

The registry-verified immutable reference is:

```text
registry.depot.dev/5884x6f4tn@sha256:68ff0fed49249b3228939faebeaec1a30e8421b05d2813c4ecaa5702e2f7e900
```

Direct registry reads verified the index contains both architectures and each
image config carries the expected build version and source revision. Platform
manifest digests are recorded in `self-host-beta39-image.json`.

[Depot build hxnvnwjm68](https://depot.dev/orgs/4z8l73c27s/projects/5884x6f4tn/builds/hxnvnwjm68)
uses the complete `apps/hosted/self-host/Dockerfile`, including the custom source,
dashboard, app framework, Motel, native Go host and pinned workerd. It does not use
the beta.19 overlay Dockerfiles.

Build again from the source merge commit:

```sh
depot build --project 5884x6f4tn --platform linux/amd64,linux/arm64 \
  --file apps/hosted/self-host/Dockerfile \
  --build-arg EXECUTOR_BUILD_VERSION=2.0.0-beta.39-org-instructions-9baa000e3 \
  --label org.opencontainers.image.revision=9baa000e3abc275051e313efa3b4d0ffc43895de \
  --label org.opencontainers.image.version=2.0.0-beta.39-org-instructions-9baa000e3 \
  --save --save-tag 2.0.0-beta.39-org-instructions-9baa000e3 .
```

The old automation published `4z8l73c27s.registry.depot.dev/executor-selfhost`.
This candidate uses Depot's project registry above. The old f664 deployment report
records an image transferred between hosts, rather than a registry publication.

This command does not promise the same digest. The inherited Dockerfile uses a
floating distroless base and live apt repositories. Deploy the verified digest,
rather than rebuilding it during approval.

The authoritative digest above was read directly from the registry after Depot
finished publishing. Depot's intermediate descriptor and exported manifest-list
digests differ from that final registry index. Both architecture configs and the
CLI's saved-image listing independently agree with the registry reference.

[Depot documents](https://depot.dev/docs/registry/overview) project-level retention
for `--save` images, with Unlimited as the default. The current project's setting
could not be inspected with the available user token. Reconfirm image availability
before deployment; pulling does not extend a configured retention period.

## Retained changes

| Change                                           | Port result                                                                                                                                                                                                     |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Organization MCP instructions, `f664b14bd`       | All 17 feature files retained, including the journaled migration, API, admin UI, dynamic MCP instructions, Effect patch, and E2E coverage.                                                                      |
| Account ownership controls, `10c99cb`            | Personal/shared conversion, creator authorization, stale-revision checks, and credential/link retention preserved.                                                                                              |
| Both large-input RPC hops, `10c99cb`             | Callback slices on the outer hop and stream transport on the inner hop preserved.                                                                                                                               |
| Credential file upload, `8ff584b` and follow-ups | File controls, exact multiline content, size/read validation, privacy, and validation invalidation preserved.                                                                                                   |
| App-account sharing, `637f2e1`                   | Existing deployed sharing badges and controls preserved.                                                                                                                                                        |
| Private HTTPS origins, `92b017f`                 | Upstream already has the same exact-origin allowlist implementation.                                                                                                                                            |
| Custom workerd, `d67a030c`                       | `Minoo7/workerd` release `v1.20260918.1-executor.cfdad918ad` retained with both architecture hashes. Beta.39 still uses the older `caf569c512` binary without this downstream response-stream cancellation fix. |

The earlier preservation merges `80d70c0a` and `c154ba08` were inspected. The
merge has two conflicts, both resolved by retaining both sets of registrations:

- `e2e/test-plan.ts` retains organization-instructions scenarios and upstream
  storage-migration diagnostics.
- `e2e/ci-selection.ts` retains organization-instructions selection and upstream
  hosted request telemetry selection.

No product implementation required a manual conflict resolution. In particular,
upstream account protocol handling and credential repair advice remain present.
Effect remains **4.0.1**. Its deployed custom patch and workerd pin are unchanged.
All 22 installed dependency patches passed `patches:check`.

## Optional branches remain separate

| Branch or PR                                                                                       | Upstream beta.39                                                  | Treatment                                                                                            |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `fix/beta19-private-https-origins`, [PR #3](https://github.com/Minoo7/executor-selfhost-op/pull/3) | Covers the private HTTPS allowlist behavior.                      | No new merge. Its source history was already in deployed f664 through `af7bfde`.                     |
| `feat/skill-file-delete`                                                                           | Does not implement the proposed deletion UI.                      | No merge. This branch stores `patches/skill-file-delete.patch` and has unrelated history.            |
| `build/org-instructions-skill-delete`                                                              | Does not implement the proposed deletion UI.                      | No merge. The two-file addition on top of f664 remains excluded.                                     |
| `fix/app-account-sharing`                                                                          | Does not cover the custom app-list sharing controls.              | No new merge. Already ancestral to deployed f664, so its behavior is retained.                       |
| [PR #2](https://github.com/Minoo7/executor-selfhost-op/pull/2)                                     | Partial overlap in multiline privacy, but no file upload control. | PR #2 is credential-file upload, not app-account sharing. Its code is already deployed and retained. |

The separate deletion implementation can delete a whole skill folder with
`base: null`; it does not reject intervening descendant changes. That deserves
review before any later decision to add it.

## Verification

All of these completed successfully:

```sh
bun install --frozen-lockfile
bun run format
bun run check
bun run typecheck
bun run auth:security
bun run e2e:check
bun run e2e:prepare
bun run e2e:self-host --workers 2 --test-name 'Organization MCP instructions|App accounts show sharing|Account creators convert|App RPC delivers|Credential files preserve PEM'
bun run e2e:self-host --workers 1 --test-name 'failed executor upgrades report a safe SQLSTATE'
(cd apps/hosted/self-host/native && go test ./...)
```

Eleven self-host scenarios passed across eight spec files. The additional focused
run exercised exact multiline secret transport, the accessibility privacy check,
paste/drop editing, webhook signing secrets, and the credential-host disclosure.
The Cloud-only tenant
isolation case is intentionally inapplicable to a single-organization self-host.
No Cloud suite or production-data acceptance was run. Existing Effect diagnostic
warnings remain; they did not fail the completed checks.

The first typecheck and patch check started before installation finished, and the
first E2E attempt started before test npm archives were prepared. Those attempts
failed during setup. The retained logs distinguish them from the successful runs.

Local evidence is under `.local/beta39/`. Focused E2E evidence is under
`.local/e2e/2026-11-10T22-50-08.963Z-self-host-d196f4/`, and migration diagnostics
under `.local/e2e/2026-11-10T22-51-44.499Z-self-host-682137/`.
Credential privacy evidence is under
`.local/e2e/2026-11-10T23-02-16.822Z-self-host-b9a53d/`.

Both published Linux architectures passed an isolated startup/header smoke check
in Depot build `m5fdtsdkc6`, using the immutable image as the base and adding only
a BusyBox test helper. Each ran its packaged entrypoint and native host on fresh
synthetic data, returned a healthy response, and served the exact expected
`Executor-Build` header. This is a BuildKit execution check, not `docker run` or
production client acceptance. See `.local/beta39/image-smoke-clean-env.log`.

The first image test inherited BuildKit's `unix:` OTLP trace endpoint, which
Executor correctly rejects as a non-HTTP endpoint. A diagnostic copy printed the
underlying schema failure. Removing those injected OTLP variables in the test
process made the original published image pass without a product change. Earlier
smoke helper failures and all resulting logs are retained.

A separate amd64 retained-data check built f664 from source in Depot build
`881fxx0sb2`, then exercised both packaged runtimes against one synthetic data
directory in build `nnt7lnq6ls`. Public HTTP calls created an owner, organization,
and instruction additions on f664. The same session, organization, text and
revision survived the beta.39 upgrade. A candidate update survived repeat startup.
The f664 runtime reopened the candidate-written fixture successfully, and a
stopped-writer snapshot restore returned the original saved revision and text.
See `.local/beta39/upgrade-acceptance.log` and its Go HTTP driver and Dockerfile in
`.local/beta39/upgrade-context/`. These checks used synthetic data, not production
accounts, credentials, repositories or retained workflows.

## Migration and rollback boundaries

Beta.32 to beta.39 adds no SDK schema versions or hosted product migration steps.
SDK storage remains **4.0.16**. The existing deployed custom hosted step
`10_org_mcp_instructions` and its `hosted_org_mcp_instructions` table remain intact.
Recorded steps are not replayed on a normal upgrade.

Better Auth and its plugins move from **1.7.5 to 1.7.16**. Startup calls its dynamic
schema migrator, which may add missing tables, columns or indexes based on existing
state. Auth DDL can commit before a later product startup failure. No pending SQL
was computed against production because production access was prohibited.

An image-only rollback passed on the synthetic fixture above. Compatibility with
all production data and live workflows is unproven. The recovery plan
uses the exact old image, original configuration, and complete stopped-writer
pre-upgrade volume. Recovery discards post-snapshot writes; retain the failed
candidate's data separately. `EXECUTOR_DATA_STEPS=report` does not suppress schema
migrations.

## Confirm the current deployment after approval

The user identifies the current host as `shared-proxy-owner`, `100.87.129.61`, and
the volume as `executor-v2-data` mounted at `/app/data`. These were not inspected.
No SSH, Docker, restart, backup, or volume operation was run there.

Historical October 29 records describe a **different host**, `cluster`, with
container `executor`, Portainer stack 1 at endpoint 3,
`/data/compose/1/docker-compose.yml`, volume `executor_executor-v2-data`, Tailscale
and telemetry sidecars, and `executor-health.timer`. Those names and IDs must not
be reused as current facts.

The following commands are proposed for a later, approved operator session on the
current host. They are not a runnable deployment until the actual owner and
configuration have been identified. Do not run `docker compose down` or recreate
the Tailscale sidecar.

```sh
sudo docker ps -a --filter volume=executor-v2-data \
  --format '{{.ID}} {{.Names}} {{.Image}}'
sudo docker volume inspect executor-v2-data
sudo docker inspect "$CONTAINER" --format '{{json .Config.Labels}}'
sudo systemctl list-timers --all | rg 'executor|watchtower|update'
```

Privately capture the complete container inspection, original compose or Portainer
stack and environment, exact image ID/digest, network aliases, labels, mount paths,
and every writer/watchdog. Container inspection can contain secrets. Do not print
it into chat. Determine `CONTAINER`, `COMPOSE_FILE`, `COMPOSE_PROJECT`,
`EXECUTOR_SERVICE`, and `BACKUP_DIR` from that inspection.

If Portainer owns the stack, use its current stack API and preserve its Env array.
Do not use an independent Compose invocation that would bypass that ownership.

## Back up the stopped writer before activation

Run these sections in one Bash session with root access after separately approving
deployment. First complete the image pre-pull below while the old writer is still
running. The pull token is entered privately or transferred through the existing secret mechanism.
It is not a production application secret.

```sh
set -euo pipefail
umask 077
DATA_VOLUME=executor-v2-data
IMAGE=registry.depot.dev/5884x6f4tn@sha256:68ff0fed49249b3228939faebeaec1a30e8421b05d2813c4ecaa5702e2f7e900
BUILD=2.0.0-beta.39-org-instructions-9baa000e3
ROLLBACK_IMAGE=executor-rollback:pre-beta39-20261110-9baa000e3
test -n "$CONTAINER" && test -n "$BACKUP_DIR"
docker login registry.depot.dev --username x-token --password-stdin < "$DEPOT_PULL_TOKEN_FILE"
docker pull "$IMAGE"
docker image inspect "$IMAGE" --format '{{.Os}}/{{.Architecture}} {{index .Config.Labels "org.opencontainers.image.revision"}}'
mkdir -m 700 "$BACKUP_DIR"
docker inspect "$CONTAINER" > "$BACKUP_DIR/container-before.json"
OLD_IMAGE_ID=$(docker inspect "$CONTAINER" --format '{{.Image}}')
printf '%s\n' "$OLD_IMAGE_ID" > "$BACKUP_DIR/image-before.id"
if docker image inspect "$ROLLBACK_IMAGE" >/dev/null 2>&1; then
  echo 'Choose an unused rollback tag before proceeding.' >&2
  exit 1
fi
docker tag "$OLD_IMAGE_ID" "$ROLLBACK_IMAGE"
DATA_DIR=$(docker volume inspect "$DATA_VOLUME" --format '{{.Mountpoint}}')
test -d "$DATA_DIR" && test ! -L "$DATA_DIR"
stat -c '%u %g %a' "$DATA_DIR" > "$BACKUP_DIR/data-before.mode"
```

Back up the original deployment definition and environment privately into
`BACKUP_DIR`. Disable the **confirmed** watchdog/update mechanisms first. Preserve
their previous enabled/active state for later restoration. Then:

```sh
docker stop --time 30 "$CONTAINER"
test -z "$(docker ps -q --filter "volume=$DATA_VOLUME")"
docker save "$ROLLBACK_IMAGE" | gzip -1 > "$BACKUP_DIR/image-before.tar.gz"
tar --numeric-owner --xattrs --acls -C "$DATA_DIR" -cpf - . |
  gzip -1 > "$BACKUP_DIR/data-before.tar.gz"
gzip -t "$BACKUP_DIR/data-before.tar.gz"
tar -tzf "$BACKUP_DIR/data-before.tar.gz" >/dev/null
(cd "$BACKUP_DIR" && sha256sum image-before.tar.gz data-before.tar.gz > SHA256SUMS)
(cd "$BACKUP_DIR" && sha256sum --check SHA256SUMS)
```

Also verify that no host process writes the mount directory. Copy the backup to a
separate machine and verify its checksum before activation. The archive includes
the database, repositories, generated auth/encryption keys, and other `/app/data`
contents. Preserve externally supplied keys and other configured persistent
mounts too. Do not regenerate keys or reset the database.

## Activate through the existing deployment owner

The preceding pre-pull must complete before the writer is stopped. On a workstation,
`depot pull-token --project 5884x6f4tn` generates a private token for that step.
Confirm the platform matches the host and the revision is
`9baa000e3abc275051e313efa3b4d0ffc43895de` before activation.

Change only Executor's image in the original deployment definition to the
published image's immutable index digest recorded with the image evidence.
Preserve all environment entries, volume mappings, networks, sidecars, and restart
settings. An explicitly configured old `EXECUTOR_BUILD_VERSION` must be updated
to `$BUILD`, because a container environment entry overrides the image default.

For a confirmed Compose-owned installation, after updating its original file:

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
  https://executor.planasolutions.ai/ -o /dev/null
grep -Fi "executor-build: $BUILD" "$BACKUP_DIR/headers-after.txt"
```

For confirmed Portainer ownership, update the current stack via its supported API
with the modified `StackFileContent`, unchanged `Env`, `PullImage: false`, and
`Prune: false` after pre-pulling. Historical stack/endpoint IDs are not usable.
Resolve its replacement container ID again through that stack's confirmed service
labels, then apply the same bounded health wait before checking the header.

Verify login, existing organization instructions through a new MCP session,
representative account links and credential use, and the large-input path before
restoring the confirmed health watchdog. A health response or header alone does
not establish real-client acceptance.

## Roll back without overwriting candidate evidence

Stop the confirmed watchdog and all candidate writers. Validate the backup:

```sh
(cd "$BACKUP_DIR" && sha256sum --check SHA256SUMS)
docker stop --time 30 "$CONTAINER"
test -z "$(docker ps -q --filter "volume=$DATA_VOLUME")"
docker load -i "$BACKUP_DIR/image-before.tar.gz"
test "$(docker image inspect "$ROLLBACK_IMAGE" --format '{{.Id}}')" = "$(cat "$BACKUP_DIR/image-before.id")"
```

Preserve candidate data before restoring. For a confirmed ordinary local Docker
volume, the following uses a sibling directory on the same filesystem. Stop if
the mount is external or this layout does not apply.

```sh
test -d "$DATA_DIR" && test ! -L "$DATA_DIR"
FAILED_DIR="${DATA_DIR}.candidate-$(date -u +%Y%m%dT%H%M%SZ)"
test ! -e "$FAILED_DIR"
mv "$DATA_DIR" "$FAILED_DIR"
mkdir "$DATA_DIR"
read -r DATA_UID DATA_GID DATA_MODE < "$BACKUP_DIR/data-before.mode"
chown "$DATA_UID:$DATA_GID" "$DATA_DIR"
chmod "$DATA_MODE" "$DATA_DIR"
tar --numeric-owner --xattrs --acls -xzpf "$BACKUP_DIR/data-before.tar.gz" -C "$DATA_DIR"
```

Restore the original deployment definition and environment, selecting
`$ROLLBACK_IMAGE`, then recreate only Executor through its
confirmed owner. Use the same Compose command above only for Compose ownership.
Resolve the recreated container ID again and wait for its health as above.
Verify the old build header, health, original instructions and a representative
credential-backed call before restoring watchdogs. Keep both archives and the
candidate directory until recovery is accepted.

## Historical evidence

Local records inspected for build/deployment history:

- `/Users/minoo/.t3/scratch/2026-10-29-handoff-find-the-lost-check-e511ed75/deployment-upgrade-evidence/deployment-candidate.md`
- The same directory's `deployment-live.md`, `deploy_verified.py`, and
  `Dockerfile.arm64-artifacts`.
