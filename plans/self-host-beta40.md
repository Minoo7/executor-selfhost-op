# Upgrade the self-hosted Executor to beta40

Status is **RELEASE PREPARATION PARTIAL. NO DEPLOY APPROVAL**. Vincent requested this plan on 11 November 2026 at 20:10 Stockholm.
The original plan granted no production permissions. The release-preparation authorization below supersedes only its named gates.
The target is the upstream-first beta40 code reviewed in the isolated sandbox.
Do not run the historical beta39 controller. Its broad log gate caused an unnecessary rollback.

## Release preparation authorized at 21:15 Stockholm

Vincent authorized building the frozen-source ARM64 artifact and a private retained-data rehearsal on 11 November 2026.
Deployment, backup B, Compose swap, volume rewrite, live Executor stop/restart and activation remain forbidden.
The proposed ARM-only tag/header is `2.0.0-beta.40-org-skills-runtime-d22ca5ba0-arm64`; it still names the same frozen application source.
The earlier two-platform build recipe is optional release preparation. This run builds only native ARM64 and records its own immutable digest.
Snapshot A's stopped-writer capture cannot run under the new no-stop/no-restart hard stop. Use an existing verified stopped-writer archive only if its provenance and approved private destination can be established.
Do not copy a running database directory as a substitute. If no safe snapshot exists, report the rehearsal blocked while completing the authorized build.
The private retained-data rehearsal must remain egress-isolated. Real Geotorget login and natural Rakazo reconciliation need external egress and may change external state.
Record those checks as blocked in the isolated copy unless separately approved scoped controls can prevent enrollment/start and protect copied credentials. Do not claim fixture or recorded responses as live provider acceptance.

## Release preparation result at 21:24 Stockholm

The native ARM64 build from frozen source `d22ca5ba0026abdb28fca0449f60472a383b1646` succeeded and is saved in Depot.

| Artifact               | Verified value                                                                   |
| ---------------------- | -------------------------------------------------------------------------------- |
| Tag                    | `registry.depot.dev/5884x6f4tn:2.0.0-beta.40-org-skills-runtime-d22ca5ba0-arm64` |
| Index                  | `sha256:6f46c01d5ba32ae7b1464c3715c7becbc3add49f4bd2f7423d89da3fbc26dba7`        |
| ARM manifest           | `sha256:1d9ea246761591371fdfe1d3a6b9d6cf5682c675ef1ba644937fd34474f77bc9`        |
| ARM raw workerd SHA256 | `7634ac29a730e8f100c4b47b1057a734740ad2f7309a8b4398c6e2f7dbf34578`               |

Registry architecture, labels, baked version and pinned workerd contents passed static verification. Runtime HTTP and retained-data checks have **not run** on this artifact.
The existing repaired stopped-writer data archive passed checksum/listing verification. Its SHA256 is `ff2a6f3dda35d1346823978f19fe38b3fcea9b2d4f9e6fbf983ce4b85cf5a6e2`, size 870090675 bytes.
Its local path is `/Users/minoo/m4_projs/executor-selfhost-op/.local/pomerado-dns-20261111/deploy/backup/data-before.tar.gz`.
It is historical input, not a fresh deployment backup B.

Vincent allowed a new private Daytona probe. It reported private access and blocked network, but booted `x86_64`.
Native ARM placement could not be established through the available CLI/account API. No secret-bearing data was uploaded and the probe was deleted.
The native ARM retained-data rehearsal is **BLOCKED**, not passed. No production service was queried or changed.
Detailed receipts and every requested check's status are in [.local/beta40-arm-production/report.md](../.local/beta40-arm-production/report.md).
Select or establish native ARM access before resuming. The egress-isolated rehearsal cannot itself prove live Geotorget or registry access.

## Use this approval sequence

One checkbox names one gate and the evidence that closes it. An unchecked gate blocks the next phase.
This is one service upgrade, not a PR merge program. No automatic merge or hourly deployment program is proposed.

1. Approve the feature scope and release-preparation work in this plan.
2. Prepare and qualify the production artifact without production access. Resolve the private ARM rehearsal-host requirement.
3. Obtain explicit authorization for production inspection, the authenticated provider calls, and snapshot A's writer stop/watchdog suspension.
   Name the downtime budget and the encrypted off-host and private ARM destinations before transferring data plus keys. This does not permit activation.
4. Rehearse the production snapshot privately. Fill the approval record with the immutable digest, results, and accepted risks.
5. Obtain Vincent's **explicit deploy approval for that digest** and maintenance window.
6. Execute the final identity gate, fresh backup, activation, and verification. Roll back only under the rules below.

The original planning task stopped at the document. The authorized preparation result above records the later ARM build. No production request, backup B, deployment, or live service action ran.

## Freeze the source and build an ARM production artifact

- [ ] Use branch `experiment/beta40-upstream-first-20261111` and freeze application source at `d22ca5ba0026abdb28fca0449f60472a383b1646`.
      Later plan-only commits do not change that code revision. Preserve the canonical beta39 branch at `eadfc28`.
- [ ] Record immutable upstream beta40 base `e3d989e4b977da51829ba006952c2c764c1f980f`.
- [ ] Preserve that code revision in an approved remote release ref or a checksum-verified Git bundle before deployment.
      Publication belongs to authorized release preparation. Do not push or merge `main`, or rebuild from a moving branch head.
- [ ] Preserve the reviewed artifact as reference, not as the ARM deployment target.
      Its tag is `registry.depot.dev/5884x6f4tn:2.0.0-beta.40-sandbox-org-skills-runtime-d22ca5ba0`.
      Its index is `sha256:ecd521e4cb96b6dfe639b67ae6f9bf7da48527be619f90880df9b50be2327ddf`.
      It contains the tested **amd64** image. Production was recorded as **arm64**.
- [ ] Build the normal complete source image for ARM64, with this production identity.
      `2.0.0-beta.40-org-skills-runtime-d22ca5ba0-arm64`.
      Retagging cannot change the baked header or add an ARM manifest. Do not use emulation as the production qualification.

Run this only during separately authorized release preparation, in an isolated export of the exact code revision.
Do not switch or modify the canonical checkout.

```bash
set -euo pipefail
CODE_REV=d22ca5ba0026abdb28fca0449f60472a383b1646
BUILD=2.0.0-beta.40-org-skills-runtime-d22ca5ba0-arm64
RELEASE_CONTEXT=$(mktemp -d)
git archive "$CODE_REV" | tar -x -C "$RELEASE_CONTEXT"
depot build --project 5884x6f4tn --platform linux/arm64 \
  --file "$RELEASE_CONTEXT/apps/hosted/self-host/Dockerfile" \
  --build-arg "EXECUTOR_BUILD_VERSION=$BUILD" \
  --label org.opencontainers.image.source=https://github.com/Minoo7/executor-selfhost-op \
  --label "org.opencontainers.image.revision=$CODE_REV" \
  --label "org.opencontainers.image.version=$BUILD" \
  --label ai.executor.upstream-base=e3d989e4b977da51829ba006952c2c764c1f980f \
  --save --save-tag "$BUILD" "$RELEASE_CONTEXT"
```

- [ ] Read the final registry index back and record its index and ARM platform manifest digests.
      Verify source and version labels, ARM architecture, the baked header, and the selected workerd binary on ARM64.
      Pull with scoped private credentials and remove the credentials afterward. Do not move `latest`.
- [ ] Keep the exact qualified image available through the maintenance and rollback window.
      Verify Depot retention or copy the index and every referenced manifest/blob to a durable approved repository.
      Verify the destination digest after any copy. Never assume a registry copy or rebuild preserves a digest.
- [ ] Run actual ARM Linux containers on an operator-controlled, non-production runner.
      The runner is not selected yet. Record its identity before approval. Do not send production data or keys to the public Daytona review sandbox or a Depot build.
      If a private ARM runner is unavailable, stop qualification.
- [ ] Run the five named Docker migration/disconnect cases and the exact-input checks against the production-tagged artifact.
      Record test titles, counts, image digests, logs, and build headers. Run only named scenarios.
      BuildKit `RUN` smoke tests and the verified gzip hashes alone do not establish ARM container acceptance.
- [ ] Supply all three distinct ARM images required by the migration spec before those five cases run.
      Build a **synthetic qualification baseline** from source `1677c7860872be67d214ad6b52d6d46b24d2fdec` using its complete Dockerfile and an honest qualification header.
      Record its ARM manifest digest and source label. The existing `10023ab...` synthetic baseline is amd64-only and cannot fill this slot.
      Select and record the official stock beta40 ARM manifest digest for the stock-control slot, and record its reported version/label without claiming unproven source correspondence.
      Set `EXECUTOR_E2E_DOCKER_IMAGE`, `EXECUTOR_E2E_DOCKER_ORG_INSTRUCTIONS_BASELINE_IMAGE`, and `EXECUTOR_E2E_DOCKER_ORG_INSTRUCTIONS_STOCK_IMAGE` to those qualified ARM references.
      The exact production `1f921aad...` image is a separate input obtained only with snapshot A, not a prerequisite requiring unapproved production access.
- [ ] Derive the expected ARM workerd binary SHA256 by decompressing the verified `linux-arm64` archive pinned in `workerd.json`.
      Its gzip SHA256 is `f22cf953782ba645e45dbab96d5a1f9cf429389c8e7da840793448068db26ce9`.
      Record the derived raw hash, and match it against `/app/workerd` in the ARM candidate. Do not use the amd64 raw hash `129cc102...`.

The Dockerfile has inherited floating system inputs, including apt repositories and a distroless tag.
A new build is not byte-reproducible by assumption. Deploy the newly qualified immutable digest, never a later rebuild of its tag.
Any application or trust-policy fix changes the source SHA, build identity, and qualification record before approval.

## Approve what ships and what is deferred

| Behavior                       | Production proposal                                                                                                                                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Organization MCP instructions  | Ship admin browser-session saves, strict revision CAS, 8192-unit limit, member reads, and request-scoped initialize/stateless discovery. Preserve the deployed table and `10_org_mcp_instructions` identity.                  |
| Skill file and folder deletion | Ship the rebuilt dashboard flow. Confirm a fixed review, compare the selected subtree with a fresh read, preserve unrelated edits, and commit with an expected revision. Deletion does not deploy the whole working revision. |
| Large input                    | Ship bounded invocation-owned outer chunks and native inner streams through stateless, supervisor, and facet hops. No public app API change or raised message cap.                                                            |
| Cancellation                   | Ship unused-body cleanup and the existing `Minoo7/workerd` cancellation backport as a separate pin. Require ARM native disconnect acceptance.                                                                                 |
| Saved accounts                 | Use upstream personal/shared creation and app-scope linking. Do not ship ownership conversion or the extra in-list sharing controls. Do not convert or delete stored accounts to match the UI.                                |
| Credential entry               | Use upstream exact multiline paste/drop and privacy controls. **Credential file upload is explicitly deferred for production.** The button is absent. Existing saved credentials remain.                                      |
| Private HTTPS allowlist        | Keep upstream behavior and the current operator configuration, including the repaired Geotorget origin.                                                                                                                       |

- [ ] Include the loss of the file-upload button and ownership-conversion controls in the deploy approval.
- [ ] Verify existing account ownership, encrypted credential hashes, generation, grants, and app links on the retained-data rehearsal.
      The sandbox's native multi-user account test passed, but it does not prove every production account journey.
      Compare immutable credential/link state before authenticated verification. Record expected later session timestamps, job/run rows, last-use/health state, and any successful OAuth refresh separately.
      A credential refresh may legitimately replace ciphertext or generation. Require a correlated refresh receipt before treating that change as expected; do not ignore unexplained changes.
- [ ] Do not publish, reset, delete, or overwrite either app's unpublished work during this upgrade.

## Reconfirm the production identity after authorization

These are historical expectations from the final repair/rollback report, not a current live inspection.
Any identity or configuration mismatch stops execution before the writer is stopped.
Do not update expected hashes automatically to make the gate pass.

| Item                            | Expected identity                                                                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Host                            | SSH alias `cluster`, recorded Tailscale IP `100.79.50.99`, ARM64 Docker engine                                                                  |
| Ingress                         | `executor.planasolutions.ai` resolves to `100.87.129.61`; `shared-proxy-owner` is a tsdproxy identity on cluster, forwarding to loopback `4400` |
| Compose                         | Project/service `executor` / `executor`; `/root/executor-skill-delete-20261104/docker-compose.after.yml`                                        |
| Compose checksum after repairs  | `b590fc08bb714b46e10424a01fb38731aca756fcca91817cf715a0e5209405e9`                                                                              |
| Baseline image reference        | `executor-org-instructions:skill-delete-1677c7860-arm64`                                                                                        |
| Baseline source label           | `1677c7860872be67d214ad6b52d6d46b24d2fdec`                                                                                                      |
| Baseline image ID               | `sha256:1f921aadddfee82de5fc796430bb1a83db963d4a95a048bcb1ac058eb051d6bb`                                                                       |
| Header, insufficient on its own | The baseline image bakes `2.0.0-beta.32-org-instructions-f664b14bd` despite containing skill deletion                                           |
| Volume                          | Local Docker volume `executor_executor-v2-data`, read-write at `/app/data`                                                                      |
| Network                         | `network_mode: service:tailscale`; preserve its actual namespace and port configuration                                                         |
| Watchdog                        | Record current `executor-health.timer` and service states; the last report restored the timer. Update timer was inactive/disabled.              |

- [ ] Resolve the current container through Compose. Do not require a historical container ID, and never reuse an ID after recreation.
- [ ] Verify labels, image ID, architecture, volume driver/options/mount source, Compose labels, and public header together.
      Verify one writer, no unexpected persistent mounts, and sufficient disk for backups, a full failed-data copy, and restoration.
- [ ] Reprove the ingress with a unique unauthenticated nonce and matching tsdproxy receipt, or equivalent request correlation.
      Do not edit DNS, tsdproxy, Serve, Funnel, Tailscale policy, telemetry, or other services.
- [ ] Capture the original Compose, resolved private Compose JSON, container/image inspections, explicit environment, key-file fingerprints, mounts, and sidecar IDs/start times.
      Keep secret-bearing files private. Preserve externally supplied keys and referenced config files too.
- [ ] Audit the Executor watchdog commands. They must not pin an old image or run updates during this operation.
      Record and later restore only their original runtime states. An unsafe watchdog is a blocker requiring a separate reviewed change.

## Capture a functional baseline and freeze acceptance expectations

Use existing authorized operator credentials. Do not expose passwords, copy secrets into this plan, send email codes, bypass approval cards, or create new grants as a shortcut.
Use the actual authorized MCP resource URL and organization ID from the operator session. The anonymous `/org/executor/mcp` check alone does not prove that slug's identity.

- [ ] Record health JSON, public header, login HTML/assets, a valid operator session, and anonymous MCP 401.
- [ ] Record saved organization additions and revision. Preserve the text privately; use a hash in the approval record.
      Compare additions/revision after upgrade, not the old combined intro, because upstream's intro can change.
- [ ] Run authenticated Geotorget `whoami` through Executor and retain the completed job receipt.
      Historical tool calls were `lantmateriet.geotorget.geotorget`, `lantmateriet.signIn.submitLogin`, and `lantmateriet.geotorget.get_job`.
      Submit `{input: {operation: "whoami"}}` to the router using its current schema.
      If needed, submit the existing saved account handle through the sign-in tool and poll the same job.
      Do not read plaintext fields or blindly repeat a login submission after a lost response.
      Expected authenticated customer is `PLANA SOLUTIONS AB`, customer number `50615201`.
- [ ] Verify Geotorget's active endpoint remains `https://portainer-aws.tailac7a97.ts.net:8080/servers/geotorget/mcp` and its saved credential grant includes that hostname and port.
      Historical app is `app_3fda8f8c-c475-4895-b7b5-3053f549c81d`, deployment `dpl_1be12381-f987-4b08-b502-fa735c1cd1f8`, working commit `e9c6f5550b053afdd431b16419395d3d06cc57ea` with 36 unpublished files.
- [ ] Read `rakazo-computer-networking.status`, `executor.schedules.list`, and `executor.schedules.runs`.
      Historical app is `app_4ac939b2-7ec9-4ece-892d-d3882f8e366d`, deployment `dpl_0245cf98-618e-410b-ac1c-7a3b8b0bf8d6`, working commit `a3f1544efdda9206a9e45e6044e00b18a599b3f6` with four unpublished files.
      Schedule `sch_d273a90c-0795-4e4e-b701-683000745caa`, name `computers`, is enabled at 60000 ms.
      Its registry URL is `https://rakazo-computer-registry.tailac7a97.ts.net/computers`.
      Observe at least two successful scheduled occurrences on the baseline. Do not invoke `reconcile`, `retry`, start, or resume manually.
- [ ] Snapshot computer identities and stopped/paused states. Confirm the next natural reconcile cannot start the two stopped computers.
      Stop preparation if unexpected enrollment or repair actions need fresh approval.
- [ ] Save active deployment IDs, working commits, file paths/content hashes, account/link/grant fingerprints, and schedule definition.
      Fresh legitimate work is preserved and reviewed, never replaced with historical snapshots to match this table.
- [ ] Capture a 10-minute baseline log window and request/job receipts.
      Record generic termination, timeout, onBroken, auth-IP, and telemetry signatures as observations, not harmless errors.
      If a required workflow already fails, stop and diagnose it separately before upgrading.

## Rehearse the retained data privately

The existing amd64 synthetic rehearsal passed. No actual production-state beta40 rehearsal or ARM runtime acceptance has run yet.

- [ ] Select an approved private ARM64 Docker runner with enough storage. Keep production snapshots off Git, CI artifacts, public Daytona, and Depot builds.
- [ ] After the explicit snapshot-A authorization, capture a uniquely named rehearsal archive and the **exact production image archive** while the baseline writer is stopped.
      Reuse the archive/manifest format below, but use an A-only directory and `BACKUP_PHASE=A`.
      Do not install `rollback.sh`, write an activation receipt, or update the `.current` pointer for snapshot A.
      Resume the original baseline and its recorded watchdog state after local archive verification, before off-host transfer/analysis.
- [ ] Restore snapshot A to a separate directory/volume on the private runner.
      Deny external egress, production routes, host services, Docker sockets, and Tailscale access before booting either copied image.
      Prove that control requests work but outbound requests cannot leave the rehearsal network.
      Do not invent a scheduler-disable variable. Copied schedules may mutate the copy, but must not reach real computers or providers.
- [ ] Preserve copied auth/encryption keys, use a loopback-only test origin, disable external analytics/exporters, and record test-origin-only changes.
      Never write the rehearsal data back to production.
- [ ] Inspect supported offline exports through the real PGlite adapter while each copy is stopped.
      Never modify raw `executor_pg_files` pages or open two engines on the same directory.
- [ ] Load snapshot A's saved image archive and require image ID `sha256:1f921aadddfee82de5fc796430bb1a83db963d4a95a048bcb1ac058eb051d6bb`.
      This private retained-data journey uses that exact production image, not the newly source-built synthetic qualification baseline.
      Boot it on a copy, then the qualified ARM candidate, repeat the candidate, and restore a full snapshot to the exact old image.
      Verify saved guidance/revision, all journal identities, retained deployed bundles, credentials/grants/links, working files, and schedule definitions.
      Distinguish expected copied run-history/auth-origin changes from schema or user-state loss.
- [ ] Capture schema before/after and the actual Better Auth DDL or schema diff on the copy.
      Keep one completed `10_org_mcp_instructions` journal row with name `org_mcp_instructions`.
      Refuse unknown completed journal identities. Do not relabel versions, delete the journal, replay backfills, or use `IF NOT EXISTS` to hide a mismatch.
- [ ] Confirm SDK storage remains 4.0.16 and that no unexpected data step is pending.
      Better Auth advances from 1.7.5 to 1.7.16. Its startup migration can commit DDL independently of later product startup.
      The product's lock/statement limits do not prove that every independent auth-pool statement has the same limits.
      `EXECUTOR_DATA_STEPS=report` is not a schema-migration dry-run.
- [ ] Require repeat-start and full-restore evidence on ARM. Image-only rollback is not the production recovery method.

## Fill the deploy approval record

Before activation approval, provide Vincent all of these values. Missing values block deployment.

| Field                                          | Required value or current state                                                                                                                                                                                                               |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Application source                             | Frozen `d22ca5ba0026abdb28fca0449f60472a383b1646`, or a separately reviewed replacement SHA                                                                                                                                                   |
| Production build header                        | Proposed `2.0.0-beta.40-org-skills-runtime-d22ca5ba0-arm64`                                                                                                                                                                                   |
| Production index and ARM manifest digests      | Built in the authorized preparation. See the exact verified digests in the release preparation result above. ARM runtime qualification remains blocked.                                                                                       |
| Synthetic ARM baseline and stock ARM controls  | **Not built/selected**. Record both immutable manifest digests and labels before synthetic qualification.                                                                                                                                     |
| Exact production baseline archive              | Existing off-host `1f921aad...` OCI index, ARM manifest, config and revision verified. No new production snapshot captured.                                                                                                                   |
| ARM workerd binary hash                        | Raw ARM hash `7634ac29...` derived and matched to image-layer contents. A running-container match remains pending.                                                                                                                            |
| Private ARM runner and receipts                | Daytona private probe booted x86_64 and was deleted. Native ARM runner not established.                                                                                                                                                       |
| Fresh identity and required baseline workflows | **Not inspected in this planning task**                                                                                                                                                                                                       |
| Snapshot A and private rehearsal               | Existing stopped-writer archive verified locally. No new snapshot taken; rehearsal not run.                                                                                                                                                   |
| Better Auth DDL and locking review             | **Not run**. Supply before/after schema, DDL diff, lock/write-blocking review, timing and repeat/full-restore receipts.                                                                                                                       |
| Durable image repository and retention         | **Not selected/confirmed**. Record the exact repository/index/ARM manifests used for qualification and deployment.                                                                                                                            |
| Snapshot destinations and space                | **Not approved**. Name encrypted off-host storage, runner identity, access controls, and the space receipts below before snapshot A.                                                                                                          |
| Verifier authentication                        | Record authorized actor/resource/scopes and validity through the window plus 30 minutes for recovery. If TTL is opaque, require a successful validity probe and an operator available to renew it. Do not send email codes or broaden grants. |
| Dependency controls and fixture                | Approve the per-workflow controls below and the private fixture source, ownership, visibility and removal policy. Unavailable controls force HOLD for ambiguous network failures.                                                             |
| Risks accepted or fixed                        | Each item in the risk table below                                                                                                                                                                                                             |
| Maintenance budget                             | Proposed 30-minute window, not a measured downtime estimate. Include off-host transfer and a 10-minute acceptance window.                                                                                                                     |
| Exact scripts/controller                       | Stage new beta40 scripts, syntax-check and exercise them on the private rehearsal before approval. No old beta39 log-grep controller.                                                                                                         |

Do not use the amd64 review digest as a fallback when the production digest is missing.

## Take fresh stopped-writer backup B after deploy approval

These are body sections for the newly reviewed beta40 scripts, not a standalone controller.
Stage and exercise their failure handling privately before approval. Never paste `set -e` into an interactive root shell.
Only backup B can authorize an activation or rollback. Snapshot A never updates the `.current` pointer.

Initialize B from the approved repository, digest, and window. Do not substitute the review registry if the artifact was copied elsewhere.

```bash
set -euo pipefail
umask 077
: "${PROD_IMAGE_REPOSITORY:?Set the repository from the approval record}"
: "${PROD_INDEX_DIGEST:?Set the qualified index digest from the approval record}"
: "${APPROVED_WINDOW_END_EPOCH:?Set the approved UTC window end}"
[[ "$PROD_INDEX_DIGEST" =~ ^sha256:[0-9a-f]{64}$ ]]
[[ "$APPROVED_WINDOW_END_EPOCH" =~ ^[0-9]+$ ]]
test "$PROD_INDEX_DIGEST" != sha256:ecd521e4cb96b6dfe639b67ae6f9bf7da48527be619f90880df9b50be2327ddf
BACKUP_PHASE=B
RUN_ID="beta40-d22ca5ba0-$(date -u +%Y%m%dT%H%M%SZ)"
STAGE_DIR="/opt/executor/upgrades/$RUN_ID"
BACKUP_DIR="/opt/executor/backups/$RUN_ID"
PROJECT_DIR=/root/executor-skill-delete-20261104
COMPOSE_FILE="$PROJECT_DIR/docker-compose.after.yml"
COMPOSE_PROJECT=executor
SERVICE=executor
DATA_VOLUME=executor_executor-v2-data
IMAGE="$PROD_IMAGE_REPOSITORY@$PROD_INDEX_DIGEST"
BUILD=2.0.0-beta.40-org-skills-runtime-d22ca5ba0-arm64
ROLLBACK_IMAGE="executor-rollback:$RUN_ID-1677c7860"
REVIEWED_COMPOSE_SHA=b590fc08bb714b46e10424a01fb38731aca756fcca91817cf715a0e5209405e9
```

- [ ] Re-run the identity and required-baseline gates immediately before the stop.
      If material state differs from rehearsal A, resume preparation rather than improvising during activation.
- [ ] Pull/inspect the approved digest before downtime using a disposable Docker credential directory.
      Verify ARM labels/header/checksum. Remove the pull credential directory.
- [ ] Check disk space after images are present. Let `V` be the full uncompressed volume size, `I` the saved baseline image size, and `C` the largest loaded qualification image.
      Reserve at least `V + I + 1 GiB` on the backup filesystem and `V + 1 GiB` on the data filesystem.
      If they share a filesystem, require at least `2V + I + 1 GiB` free instead.
      Require `V + I + 1 GiB` off-host for the archive copy. On the private rehearsal runner, after loading images, reserve `5V + I + 2C + 1 GiB` for copies, exports, and temporary container roots.
      Record `du`, `df`, image-size and storage-driver receipts. Recheck before the stop. These are conservative operational reserves, not measured compression promises.
- [ ] Capture the files below while the baseline is online. The baseline expectation receipt comes from the authorized functional gates, not an empty generated object.
      Archive every referenced external config/key file in a reviewed private config archive; use a valid empty archive only when the reviewed reference list is empty.

```bash
set -euo pipefail
umask 077
: "${BASELINE_EXPECTATIONS_FILE:?Supply the reviewed private baseline receipt}"
: "${OPERATOR_CONFIG_ARCHIVE:?Supply the reviewed private config archive}"
mkdir -m 700 "$STAGE_DIR" "$BACKUP_DIR"
printf '%s  %s\n' "$REVIEWED_COMPOSE_SHA" "$COMPOSE_FILE" | sha256sum --check -
CONTAINER=$(docker compose --project-directory "$PROJECT_DIR" -p "$COMPOSE_PROJECT" \
  -f "$COMPOSE_FILE" ps -q "$SERVICE")
test -n "$CONTAINER"
OLD_IMAGE_ID=$(docker inspect "$CONTAINER" --format '{{.Image}}')
OLD_IMAGE_REF=$(docker inspect "$CONTAINER" --format '{{.Config.Image}}')
test "$OLD_IMAGE_ID" = sha256:1f921aadddfee82de5fc796430bb1a83db963d4a95a048bcb1ac058eb051d6bb
test "$OLD_IMAGE_REF" = executor-org-instructions:skill-delete-1677c7860-arm64
DATA_DIR=$(docker volume inspect "$DATA_VOLUME" --format '{{.Mountpoint}}')
test -d "$DATA_DIR" && test ! -L "$DATA_DIR"
cp --preserve=all "$COMPOSE_FILE" "$BACKUP_DIR/docker-compose.before.private.yml"
stat -c '%u %g %a' "$DATA_DIR" > "$BACKUP_DIR/data-before.mode"
printf '%s\n' "$OLD_IMAGE_ID" > "$BACKUP_DIR/image-before.id"
printf '%s\n' "$OLD_IMAGE_REF" > "$BACKUP_DIR/image-before.ref"
docker inspect "$CONTAINER" > "$BACKUP_DIR/container-before.private.json"
docker image inspect "$OLD_IMAGE_ID" > "$BACKUP_DIR/image-before.private.json"
docker compose --project-directory "$PROJECT_DIR" -p "$COMPOSE_PROJECT" \
  -f "$COMPOSE_FILE" config --format json > "$BACKUP_DIR/compose-resolved.before.private.json"
systemctl show executor-health.timer executor-health.service executor-update.timer \
  > "$BACKUP_DIR/watchdog-before.private.txt"
cp "$BASELINE_EXPECTATIONS_FILE" "$BACKUP_DIR/baseline-expectations.private.json"
cp "$OPERATOR_CONFIG_ARCHIVE" "$BACKUP_DIR/operator-config.private.tar.gz"
gzip -t "$BACKUP_DIR/operator-config.private.tar.gz"
declare -p BACKUP_PHASE RUN_ID STAGE_DIR BACKUP_DIR PROJECT_DIR COMPOSE_FILE \
  COMPOSE_PROJECT SERVICE DATA_VOLUME IMAGE BUILD ROLLBACK_IMAGE REVIEWED_COMPOSE_SHA \
  CONTAINER OLD_IMAGE_ID OLD_IMAGE_REF DATA_DIR PROD_IMAGE_REPOSITORY PROD_INDEX_DIGEST \
  APPROVED_WINDOW_END_EPOCH > "$STAGE_DIR/recovery.env"
chmod 600 "$STAGE_DIR/recovery.env"
cp "$STAGE_DIR/recovery.env" "$BACKUP_DIR/recovery.env"
docker tag "$OLD_IMAGE_ID" "$ROLLBACK_IMAGE"
docker save "$ROLLBACK_IMAGE" | gzip -1 > "$BACKUP_DIR/image-before.tar.gz"
gzip -t "$BACKUP_DIR/image-before.tar.gz"
```

- [ ] Install the reviewed scripts and their recorded hashes in this root-owned stage.
      Require the no-writer verifier to accept `DATA_DIR` and inspect writable handles/mappings.
      Only then atomically point `/opt/executor/upgrades/beta40-d22ca5ba0.current` at this B stage.
      Record its physical path and run ID in the operator receipt. A must never create that pointer or contain `rollback.sh`.
- [ ] Suspend only the confirmed Executor watchdog. Leave an already disabled update timer unchanged.
- [ ] Stop only Executor, then archive. A failed `docker ps` must fail the assignment, not masquerade as an empty writer list.

```bash
set -euo pipefail
source /opt/executor/upgrades/beta40-d22ca5ba0.current/recovery.env
test "$BACKUP_PHASE" = B
docker stop --time 30 "$CONTAINER"
writers=$(docker ps -q --filter "volume=$DATA_VOLUME")
test -z "$writers"
python3 "$STAGE_DIR/verify-no-writers.py" "$DATA_DIR"
tar --numeric-owner --xattrs --acls -C "$DATA_DIR" -cpf - . |
  gzip -1 > "$BACKUP_DIR/data-before.tar.gz"
gzip -t "$BACKUP_DIR/data-before.tar.gz"
tar -tzf "$BACKUP_DIR/data-before.tar.gz" >/dev/null
stat -c '%s' "$BACKUP_DIR/data-before.tar.gz"
(cd "$BACKUP_DIR" && sha256sum \
  data-before.tar.gz image-before.tar.gz docker-compose.before.private.yml \
  data-before.mode recovery.env image-before.id image-before.ref \
  container-before.private.json image-before.private.json \
  compose-resolved.before.private.json watchdog-before.private.txt \
  baseline-expectations.private.json operator-config.private.tar.gz > SHA256SUMS)
(cd "$BACKUP_DIR" && sha256sum --check SHA256SUMS)
```

Keep later logs and activation receipts in the stage, outside this fixed checksum manifest.
If backup B fails before any activation receipt exists, the staged error handler must verify the original image/mounts, restart that original container, and restore its watchdog state.
If that safety check fails, stop and report the incident instead of starting an uncertain writer.
No production backup was created now. Old beta39 archives are not substitutes for B.

- [ ] Copy the complete backup to an approved encrypted off-host filesystem, proposed `/Users/minoo/.executor-upgrade-backups/$RUN_ID/`, mode 0700.
      The archive contains decryption keys as well as encrypted credentials. Treat it as secret and use SSH, never a public artifact store.
- [ ] Independently verify all checksums, gzip integrity, archive listing, and size off-host.
      Record actual paths, size and SHA256 before activation. Stop if available space or recovery data is insufficient.

On the authorized operator workstation, use the exact B run ID from the host receipt.

```bash
set -euo pipefail
umask 077
: "${RUN_ID:?Use the exact B run ID from the host receipt}"
[[ "$RUN_ID" =~ ^beta40-d22ca5ba0-[0-9]{8}T[0-9]{6}Z$ ]]
OFFHOST_DIR="/Users/minoo/.executor-upgrade-backups/$RUN_ID"
mkdir -m 700 -p "$OFFHOST_DIR"
rsync -a --no-owner --no-group --rsync-path='sudo -n rsync' \
  "cluster:/opt/executor/backups/$RUN_ID/" "$OFFHOST_DIR/"
(cd "$OFFHOST_DIR" && shasum -a 256 -c SHA256SUMS)
gzip -t "$OFFHOST_DIR/data-before.tar.gz"
tar -tzf "$OFFHOST_DIR/data-before.tar.gz" >/dev/null
```

- [ ] Keep the writer stopped between backup B and activation. If transfer fails or the pre-activation budget expires, verify/resume the original baseline and reschedule.
      No data restore is needed before the candidate opens data. Never advance the controller merely because a snapshot file exists.

## Activate only Executor

- [ ] Stage a byte-preserving candidate Compose file that changes only `services.executor.image` to the approved digest.
      The repaired private-origin entry, all other env, volumes, network mode, ports, and other services must remain identical.
      The recorded baseline has no manual `EXECUTOR_BUILD_VERSION` override; the old misleading header is baked into its image.
      If a new override is discovered, stop and review its removal explicitly. The candidate uses its baked honest header.
- [ ] Compare resolved Compose objects using the original `--project-directory` and environment for both files.
      Require exactly the reviewed image delta. Do not reserialize or reformat other service definitions.
- [ ] Check the live Compose checksum again against the captured/reviewed bytes immediately before installing the candidate atomically.
      No concurrent stack edits are allowed. Keep the original file in backup B.
- [ ] The qualified activation script must prepare candidate bytes from the saved original, replacing exactly one plain image scalar matching `OLD_IMAGE_REF` with `IMAGE`.
      Refuse ambiguous YAML or multiple matches. Compare resolved JSON and require only `services.executor.image` to differ.
      Keep every other byte unchanged, including other services. Preserve file ownership/mode on a same-directory temporary file, recheck the live checksum, then atomically rename it over the Compose file.
      This recipe is a specification for that script, not an implemented installer.
- [ ] Before changing Compose or starting the candidate, require backup phase B and a matching approved run ID, verified local/off-host manifests, and the approved digest.
      Write an activation receipt containing that run ID, backup-manifest hash, candidate digest and activation time.
      Persist controller state `ARMED` with a deadline no later than the approved window end or 15 minutes after activation, whichever comes first.
      A command failure after this receipt must enter the classifier, never blindly resume the old engine against candidate-written data.
- [ ] Run only the following service recreation after the guarded installer succeeds. This block is an excerpt, not the complete activation script. Resolve the new container ID immediately afterward.

```bash
set -euo pipefail
source /opt/executor/upgrades/beta40-d22ca5ba0.current/recovery.env
docker compose --project-directory "$PROJECT_DIR" -p "$COMPOSE_PROJECT" \
  -f "$COMPOSE_FILE" up -d --no-deps --pull never --force-recreate "$SERVICE"
CONTAINER=$(docker compose --project-directory "$PROJECT_DIR" -p "$COMPOSE_PROJECT" \
  -f "$COMPOSE_FILE" ps -q "$SERVICE")
test -n "$CONTAINER"
```

## Verify the candidate and classify failures

- [ ] Allow at most 120 seconds for healthy startup, using bounded health polling. Record migration logs, restarts, OOM state, and image identity.
- [ ] Require public `/health` 200 with `{"status":"ok"}`, exact `Executor-Build`, login HTML and assets, and anonymous `/org/executor/mcp` 401.
- [ ] Verify an authorized operator session without sending email. Compare preserved key fingerprints and explicit config.
- [ ] Read organization instructions and compare additions/revision with backup B. On a new authorized MCP connection, require initialize and stateless discovery to match the candidate's combined instructions.
- [ ] Complete authenticated Geotorget whoami through Executor using the existing saved account. Require the expected customer and terminal successful job, not only MCP initialization or an input-required response.
- [ ] Observe at least two fresh successful Rakazo `computers` schedule occurrences after candidate startup, within the 10-minute healthy observation period.
      Require the same enabled interval, registry URL, source versions, working files, and stopped computer states. Do not trigger the mutation manually.
- [ ] After backup B, create the approved disposable fixture named `upgrade-probe-$RUN_ID` on the candidate, with no accounts, schedules, outbound requests or real data.
      Its qualified source exposes only exact digest tools for stateless and SQL-facet invocation. Record its app ID, owner, source hash and active revision immediately.
      Approve its member visibility explicitly if the native model cannot make it private. Never modify a real app or publish its working tree.
      Run the small control and 35,200,010-byte input, requiring exact length, UTF-8 bytes and SHA256 on both paths.
      On retry use the recorded app ID. After a lost creation response, recover it by exact name, owner and source inspection; never blindly redeploy by name or overwrite an existing app.
      After acceptance, remove only this fixture through the supported API if its source/active revision is unchanged and it has no user edits. Otherwise retain it and report why.
      Fixture creation and conditional removal are production writes covered by deploy approval. Full snapshot rollback removes it automatically.
- [ ] Compare both app deployment IDs and unpublished working refs/content with backup B. Confirm account links/grants and sidecar IDs/start times remain intact.
- [ ] Observe health, crashes/restarts, required workflow receipts, and logs for 10 minutes after readiness, completing within the 15-minute activation budget. Restore the original safe Executor watchdog state after acceptance, then check health again.

The new controller must use explicit verifier outcomes, not `grep ERROR` and not a blanket `trap ERR` that restores data for every command failure.

| Outcome                | Controller action                                                                                                                                                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0 ACCEPTED`           | All required gates pass. Record separately any explicitly accepted pre-existing warning/log signatures.                                                                                                                                                   |
| `20 ROLLBACK_REQUIRED` | Invoke rollback once. Examples are broken candidate startup, migration/storage failure, crash/OOM/restart loop, data/identity loss, or a required workflow regression attributable to Executor.                                                           |
| `30 HOLD_OPERATOR`     | Stop further rollout actions and report the evidence. Examples are an expired verifier credential, an unhealthy external provider/control, unavailable evidence, or an unclassified failure. Do not silently accept or restore data based on uncertainty. |

Use these controls and classifications. No helper container, sidecar command, network-policy change or new grant is authorized merely to obtain a control.

| Check                     | Attributable failure requesting outcome 20                                                                                         | Ambiguous outcome requiring 30                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Startup/storage/identity  | Failed migration, failed health within the qualified startup deadline, crash/OOM loop, missing preserved data or wrong image/mount | Missing evidence or unavailable verifier                                                                        |
| Geotorget                 | Explicit Executor credential/decryption/runtime failure or a completed authenticated result for the wrong customer                 | Provider/login/network failure without an independently approved passing control                                |
| Rakazo                    | Fresh `status` proves a successful current registry fetch but the preserved enabled schedule fails inside Executor                 | `status` cannot prove a fresh fetch, or registry/network control also fails                                     |
| Organization instructions | Preserved additions/revision differ, wrong combined text, or an explicit MCP initialization error with valid auth                  | Expired auth, ingress failure, or unavailable evidence                                                          |
| Large input               | Wrong exact digest or an explicit Executor transport/runtime error on a qualified fixture                                          | Public ingress 413/502 or timeout without a separately approved normal-auth loopback control isolating Executor |
| Skill deletion            | Qualified fixture deletion changes neighbours, active version, or unrelated files                                                  | Unavailable browser/auth evidence                                                                               |

A passing baseline with the same scope supports attribution for existing workflows. New feature correctness does not require beta32 to pass a 35 MB call.
The private rehearsal does not qualify 35 MB through production tsdproxy. An ingress-only failure therefore holds unless a separately approved control isolates the candidate.
For Rakazo, verify that `status` actually performs a fresh registry fetch before using it as that control; a cached status is insufficient.
Explicit Executor errors still require request/job correlation, rather than a matching generic log string.

The known `script terminated for unknown reasons`, `connect(): Connection timed out`, and `onBroken()` signatures **alone never request rollback**.
Capture timestamp/request/job correlation and baseline comparison. If the same signature accompanies an attributable required-workflow failure, that failure still requests rollback.
Do not label the messages harmless or suppress their collection. The same classification applies during rollback verification, so a familiar standalone log line cannot falsely turn functional recovery into `ROLLBACK_FAILED`.

Automatic rollback is allowed only while this run is `ARMED` and before its persisted deadline.
On `HOLD_OPERATOR`, acceptance, or deadline expiry, persist `DISARMED` before exiting the controller. A hold leaves the current service unaccepted, reports its actual health, and restores only a previously active, audited health-only watchdog.
A hard failure observed within the armed window requests rollback immediately. Once disarmed, any later snapshot restore needs a new operator decision because intervening writes may be lost.
A failed rollback stops automation and leaves the incident with the operator. Never restore repeatedly or start the old engine on partially restored data.
Controller terminal outcomes are `40 ROLLED_BACK_VERIFIED` and `50 ROLLBACK_FAILED`; verifier outcomes remain 0, 20 and 30. The historical beta39 controller used different meanings and must not be reused.

## Restore the exact old image and fresh backup B

The future staged command is `sudo bash /opt/executor/upgrades/<B-RUN-ID>/rollback.sh --run-id <B-RUN-ID>`.
Use the physical stage path recorded in the activation receipt, never infer it from a stale `.current` pointer.
The script must compare its independently supplied run ID with `recovery.env` and the activation receipt, require `BACKUP_PHASE=B`, and verify the manifest hash and candidate digest.
Automatic invocation also requires `ARMED` state and an unexpired deadline. Manual invocation after disarm requires a new explicit operator decision.
Snapshot A has no rollback script. Do not reuse any beta39 rollback path or pre-Geotorget snapshot.
The following body is an excerpt after those guards; it is not a ready-to-run recovery controller.

- [ ] Save candidate logs and failure receipts. Suspend only the audited Executor watchdog.
- [ ] Resolve the current Executor container by Compose labels, not the pre-deploy ID. Stop and remove only that container.
- [ ] Reverify backup B's checksums, the current local volume identity, and absence of all writers.
- [ ] Require the confirmed ordinary local volume directory, not a separate mounted filesystem. Preserve failed data by a same-filesystem rename.
- [ ] Restore the complete archive, ownership/mode, original Compose/config, and the exact saved image.
      Retag the saved image to the captured original Compose reference and forbid registry pulls.

```bash
set -euo pipefail
source "$STAGE_DIR/recovery.env"
(cd "$BACKUP_DIR" && sha256sum --check SHA256SUMS)
CURRENT_CONTAINER=$(docker compose --project-directory "$PROJECT_DIR" -p "$COMPOSE_PROJECT" \
  -f "$COMPOSE_FILE" ps -aq "$SERVICE")
test -n "$CURRENT_CONTAINER"
docker stop --time 30 "$CURRENT_CONTAINER"
docker rm "$CURRENT_CONTAINER"
writers=$(docker ps -q --filter "volume=$DATA_VOLUME")
test -z "$writers"
test "$(docker volume inspect "$DATA_VOLUME" --format '{{.Mountpoint}}')" = "$DATA_DIR"
test "$DATA_DIR" = /var/lib/docker/volumes/executor_executor-v2-data/_data
test -d "$DATA_DIR" && test ! -L "$DATA_DIR"
python3 "$STAGE_DIR/verify-no-writers.py" "$DATA_DIR"
if mountpoint -q "$DATA_DIR"; then exit 1; fi
docker load -i "$BACKUP_DIR/image-before.tar.gz"
test "$(docker image inspect "$ROLLBACK_IMAGE" --format '{{.Id}}')" = "$OLD_IMAGE_ID"
docker tag "$ROLLBACK_IMAGE" "$OLD_IMAGE_REF"
FAILED_DIR="${DATA_DIR}.candidate-$RUN_ID"
test ! -e "$FAILED_DIR"
mv "$DATA_DIR" "$FAILED_DIR"
mkdir "$DATA_DIR"
read -r DATA_UID DATA_GID DATA_MODE < "$BACKUP_DIR/data-before.mode"
chown "$DATA_UID:$DATA_GID" "$DATA_DIR"
chmod "$DATA_MODE" "$DATA_DIR"
tar --numeric-owner --xattrs --acls -xzpf "$BACKUP_DIR/data-before.tar.gz" -C "$DATA_DIR"
cp -p "$BACKUP_DIR/docker-compose.before.private.yml" "$COMPOSE_FILE"
printf '%s  %s\n' "$REVIEWED_COMPOSE_SHA" "$COMPOSE_FILE" | sha256sum --check -
docker compose --project-directory "$PROJECT_DIR" -p "$COMPOSE_PROJECT" \
  -f "$COMPOSE_FILE" up -d --no-deps --pull never --force-recreate "$SERVICE"
```

- [ ] Re-resolve the container and require the saved image ID and `1677c7860` source label, healthy startup, original header, login, and anonymous MCP 401.
- [ ] Verify saved org instructions, Geotorget customer, natural registry schedule receipts, working files, and stopped computer states.
      Retain candidate data and both local/off-host backups. Restore only the original safe watchdog state after functional recovery.
- [ ] Record any writes lost between backup B and rollback. External provider actions are not undone by restoring the volume.
      Escalate unexpected external actions separately; do not manipulate other services or start stopped computers to repair them.

## Accept or close the known risks

| Risk                                        | Proposed disposition before deployment                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Review image is amd64-only                  | Must close. Build and qualify real ARM containers from the frozen source.                                                                                                                                                                                                                                                                                                                                                                   |
| Production-state migrations                 | Must close. Private retained-data rehearsal, full restore test, and fresh backup B/off-host checksums. No DDL no-op claim.                                                                                                                                                                                                                                                                                                                  |
| Client-IP/Better Auth warning               | Conditional acceptance for this upgrade if baseline and candidate auth work without a regression. The native host overwrites `x-executor-client-ip` from its TCP peer, runtime auth consumes it, and schema setup uses different options. The exact warning source/bucketing needs diagnosis. Do not trust arbitrary forwarded headers, disable rate limits, or invent an env fix. A trust-policy fix needs a new reviewed source/artifact. |
| Cancellation during input transfer          | Explicit residual uncertainty. Completed-transfer MCP cancellation, slot reuse, and native disconnect passed. Qualify them on ARM. Do not claim mid-transfer coverage. If Vincent requires it as a release gate, add an observable held-transfer E2E before promotion.                                                                                                                                                                      |
| Generic workerd termination/timeouts        | Accept observation with the attribution rule, not a clean-log promise. Investigate separately. Crashes, resource exhaustion, or attributable workflow failures still request rollback.                                                                                                                                                                                                                                                      |
| Telemetry trace-export warning              | Recheck local collector/export health during qualification. Capture failures without changing the telemetry service. Obtain explicit acceptance if still unresolved.                                                                                                                                                                                                                                                                        |
| Credential file upload absent               | Explicit production deferral. Upstream multiline paste/drop is the approved replacement. No saved secret is deleted.                                                                                                                                                                                                                                                                                                                        |
| Ownership conversion/in-list sharing absent | Explicit native-model choice. Verify retained account/link use, and document the UI change.                                                                                                                                                                                                                                                                                                                                                 |
| Snapshot rollback loses later writes        | Vincent coordinates a human/MCP write pause for maintenance. Candidate schedules and verification can still write. Explicitly accept loss of all post-backup-B writes if rollback is needed, and preserve failed data. If zero write loss is required, block this plan until a separate admission/quiescence design exists. No proxy change is smuggled into this upgrade.                                                                  |

## Record execution evidence and stop

Use `plans/self-host-beta40-decisions.tsv` for public decisions. Keep sensitive execution data outside Git.
The completion receipt must name the approved source/index/ARM manifest, actual build header, current host/container, backup B paths/size/checksum on both hosts, commands/scripts, required workflow/job IDs, and rollback command.
Record accepted warnings and unresolved observations separately from failed gates.

Planning is complete only after review of this document. Deployment remains blocked until the release and data gates are filled and Vincent explicitly approves activation.

## Evidence used without production access

- Current source and `.local/beta40-review/final-image-metadata.json`, `final-image-results.json`, and `final-runtime-verification.json` in this worktree.
- [Sandbox handoff](/Users/minoo/.p3stack/runs/executor-selfhost-op/upstream-beta40-review-20261111/observations/final-handoff.md).
- Historical canonical checkout records `.local/pomerado-dns-20261111/final-report.md`, `registry-repair-verified.private.json` metadata, and `deploy/acceptance.private.json` tool names.
- Historical `plans/self-host-beta39.md` and its deployment/rollback records. They establish context, not today's live identity or reusable activation approval.
- Current `migrations.ts`, storage migrations, workerd pin, Dockerfile, native proxy, and self-host auth source. No live production endpoint was queried to write this plan.
