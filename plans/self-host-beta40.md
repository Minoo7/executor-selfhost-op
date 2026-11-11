# Upgrade the self-hosted Executor to beta40

Status is **PLAN ONLY**. Vincent requested this plan on 11 November 2026 at 20:10 Stockholm.
This document grants no permission to inspect, stop, back up, or change production.
The target is the upstream-first beta40 code reviewed in the isolated sandbox.
Do not run the historical beta39 controller. Its broad log gate caused an unnecessary rollback.

## Use this approval sequence

One checkbox names one gate and the evidence that closes it. An unchecked gate blocks the next phase.
The operator follows the tailored Frame, Design, Verify, and Audit workflow from the p3stack `figure-it-out` skill.
This is one service upgrade, not a PR merge program. No automatic merge or hourly deployment program is proposed.

1. Approve the feature scope and release-preparation work in this plan.
2. Prepare and qualify the production artifact without production access. Resolve the private ARM rehearsal-host requirement.
3. Obtain explicit authorization before production preflight and snapshot collection. That authorization does not permit activation.
4. Rehearse the production snapshot privately. Fill the approval record with the immutable digest, results, and accepted risks.
5. Obtain Vincent's **explicit deploy approval for that digest** and maintenance window.
6. Execute the final identity gate, fresh backup, activation, and verification. Roll back only under the rules below.

This planning task stops at the document. No image promotion, production request, backup, deployment, or service action ran.

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
- [ ] Build the normal complete source image for both platforms, with this proposed production identity.
      `2.0.0-beta.40-org-instructions-skill-delete-runtime-d22ca5ba0`.
      Retagging cannot change the baked header or add an ARM manifest. Do not use emulation as the production qualification.

Run this only during separately authorized release preparation, in an isolated export of the exact code revision.
Do not switch or modify the canonical checkout.

```bash
set -euo pipefail
CODE_REV=d22ca5ba0026abdb28fca0449f60472a383b1646
BUILD=2.0.0-beta.40-org-instructions-skill-delete-runtime-d22ca5ba0
RELEASE_CONTEXT=$(mktemp -d)
git archive "$CODE_REV" | tar -x -C "$RELEASE_CONTEXT"
depot build --project 5884x6f4tn --platform linux/amd64,linux/arm64 \
  --file "$RELEASE_CONTEXT/apps/hosted/self-host/Dockerfile" \
  --build-arg "EXECUTOR_BUILD_VERSION=$BUILD" \
  --label org.opencontainers.image.source=https://github.com/Minoo7/executor-selfhost-op \
  --label "org.opencontainers.image.revision=$CODE_REV" \
  --label "org.opencontainers.image.version=$BUILD" \
  --label ai.executor.upstream-base=e3d989e4b977da51829ba006952c2c764c1f980f \
  --save --save-tag "$BUILD" "$RELEASE_CONTEXT"
```

- [ ] Read the final registry index back and record its digest and both platform manifest digests.
      Verify source and version labels, ARM architecture, the baked header, and the selected workerd binary on each platform.
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
- [ ] After snapshot authorization, obtain rehearsal snapshot A with the stopped-writer procedure below, then resume the original baseline.
      Do not leave production stopped throughout off-host analysis. Restore the recorded Executor watchdog state.
- [ ] Restore snapshot A to a separate directory/volume on the private runner.
      Deny external egress, production routes, host services, Docker sockets, and Tailscale access before booting either copied image.
      Prove that control requests work but outbound requests cannot leave the rehearsal network.
      Do not invent a scheduler-disable variable. Copied schedules may mutate the copy, but must not reach real computers or providers.
- [ ] Preserve copied auth/encryption keys, use a loopback-only test origin, disable external analytics/exporters, and record test-origin-only changes.
      Never write the rehearsal data back to production.
- [ ] Inspect supported offline exports through the real PGlite adapter while each copy is stopped.
      Never modify raw `executor_pg_files` pages or open two engines on the same directory.
- [ ] Boot the baseline, the qualified ARM candidate, repeat the candidate, and restore a full snapshot to the baseline.
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

| Field                                          | Required value or current state                                                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Application source                             | Frozen `d22ca5ba0026abdb28fca0449f60472a383b1646`, or a separately reviewed replacement SHA                                           |
| Production build header                        | Proposed `2.0.0-beta.40-org-instructions-skill-delete-runtime-d22ca5ba0`                                                              |
| Production index and ARM manifest digests      | **Not built or assigned by this planning task**                                                                                       |
| Private ARM runner and receipts                | **Not selected or run**                                                                                                               |
| Fresh identity and required baseline workflows | **Not inspected in this planning task**                                                                                               |
| Snapshot A and private rehearsal               | **Not taken or run**                                                                                                                  |
| Risks accepted or fixed                        | Each item in the risk table below                                                                                                     |
| Maintenance budget                             | Proposed 30-minute window, not a measured downtime estimate. Include off-host transfer and a 10-minute acceptance window.             |
| Exact scripts/controller                       | Stage new beta40 scripts, syntax-check and exercise them on the private rehearsal before approval. No old beta39 log-grep controller. |

Do not use the amd64 review digest as a fallback when the production digest is missing.

## Take fresh stopped-writer backup B after deploy approval

Every shell block below is a future operator recipe. Run it in a separate root-owned Bash script, not an interactive `set -e` shell.
Persist the actual run paths and recovery variables before stopping the writer.

```bash
set -euo pipefail
umask 077
: "${PROD_INDEX_DIGEST:?Set the approved qualified production index digest}"
[[ "$PROD_INDEX_DIGEST" =~ ^sha256:[0-9a-f]{64}$ ]]
test "$PROD_INDEX_DIGEST" != sha256:ecd521e4cb96b6dfe639b67ae6f9bf7da48527be619f90880df9b50be2327ddf
RUN_ID="beta40-d22ca5ba0-$(date -u +%Y%m%dT%H%M%SZ)"
STAGE_DIR="/opt/executor/upgrades/$RUN_ID"
BACKUP_DIR="/opt/executor/backups/$RUN_ID"
PROJECT_DIR=/root/executor-skill-delete-20261104
COMPOSE_FILE="$PROJECT_DIR/docker-compose.after.yml"
COMPOSE_PROJECT=executor
SERVICE=executor
DATA_VOLUME=executor_executor-v2-data
IMAGE="registry.depot.dev/5884x6f4tn@$PROD_INDEX_DIGEST"
BUILD=2.0.0-beta.40-org-instructions-skill-delete-runtime-d22ca5ba0
ROLLBACK_IMAGE="executor-rollback:$RUN_ID-1677c7860"
```

- [ ] Re-run the identity and required-baseline gates immediately before the stop.
      If material state differs from rehearsal A, resume preparation rather than improvising during activation.
- [ ] Pull/inspect the approved digest before downtime using a disposable Docker credential directory.
      Verify ARM labels/header/checksum. Remove the pull credential directory.
- [ ] Create unused 0700 stage/backup directories. Save the original image reference, exact image ID, Compose bytes/checksum, resolved config, private environment, key fingerprints, volume path/owner/mode, watchdog states, and acceptance expectations.
      Save `recovery.env` mode 0600 in the stage and backup directories. It must survive a new SSH session.
      Point `/opt/executor/upgrades/beta40-d22ca5ba0.current` at this exact stage and report that path before stopping.
- [ ] Tag and archive the old image while it is still online. Save the dedicated rollback tag, not only an untagged image ID.

```bash
set -euo pipefail
source /opt/executor/upgrades/beta40-d22ca5ba0.current/recovery.env
docker tag "$OLD_IMAGE_ID" "$ROLLBACK_IMAGE"
docker save "$ROLLBACK_IMAGE" | gzip -1 > "$BACKUP_DIR/image-before.tar.gz"
gzip -t "$BACKUP_DIR/image-before.tar.gz"
```

- [ ] Suspend only the confirmed Executor watchdog. Do not alter the update timer if it is already disabled.
- [ ] Stop only Executor and prove no Docker or host process can write the volume.
      Reuse the reviewed no-writer inspection and verify writable handles/mappings, not just container count. Missing inspection is a stop, not a pass.

```bash
set -euo pipefail
source /opt/executor/upgrades/beta40-d22ca5ba0.current/recovery.env
docker stop --time 30 "$CONTAINER"
test -z "$(docker ps -q --filter "volume=$DATA_VOLUME")"
# Run the staged no-writer verifier before archiving.
python3 "$STAGE_DIR/verify-no-writers.py" "$DATA_DIR"
tar --numeric-owner --xattrs --acls -C "$DATA_DIR" -cpf - . |
  gzip -1 > "$BACKUP_DIR/data-before.tar.gz"
gzip -t "$BACKUP_DIR/data-before.tar.gz"
tar -tzf "$BACKUP_DIR/data-before.tar.gz" >/dev/null
stat -c '%s' "$BACKUP_DIR/data-before.tar.gz"
(cd "$BACKUP_DIR" && sha256sum --check SHA256SUMS)
```

The staged backup script must create `SHA256SUMS` after all fixed backup inputs exist, before the check above.
Cover the data archive, image archive, original Compose/config, recovery file, and identity receipts. Store later logs separately.
No production backup was created now. The paths above expand to **fresh** backup B during execution; old beta39 archives are not substitutes.

- [ ] Copy the complete backup to an approved encrypted off-host filesystem, proposed `/Users/minoo/.executor-upgrade-backups/$RUN_ID/`, mode 0700.
      The archive contains decryption keys as well as encrypted credentials. Treat the whole archive as secret.
      Use SSH transport, never a public artifact store.
- [ ] Verify all checksums, gzip integrity, archive listing, and size independently off-host.
      Record the actual local/remote paths, sizes, and SHA256 values in the execution receipt before activation.
      Require usable off-host recovery data and the saved old image.

On the authorized operator workstation, use the exact recorded run ID. This command copies only the new backup directory.

```bash
set -euo pipefail
umask 077
: "${RUN_ID:?Use the exact run ID from the host preparation receipt}"
[[ "$RUN_ID" =~ ^beta40-d22ca5ba0-[0-9]{8}T[0-9]{6}Z$ ]]
OFFHOST_DIR="/Users/minoo/.executor-upgrade-backups/$RUN_ID"
mkdir -m 700 -p "$OFFHOST_DIR"
rsync -a --no-owner --no-group --rsync-path='sudo -n rsync' \
  "cluster:/opt/executor/backups/$RUN_ID/" "$OFFHOST_DIR/"
(cd "$OFFHOST_DIR" && shasum -a 256 -c SHA256SUMS)
gzip -t "$OFFHOST_DIR/data-before.tar.gz"
tar -tzf "$OFFHOST_DIR/data-before.tar.gz" >/dev/null
```

- [ ] Keep the writer stopped between backup B and activation. If backup/transfer fails before the candidate opens data, restart only the original container and restore its watchdog state. No data restore is needed then.
      If pre-activation work exhausts the maintenance budget, resume the baseline and reschedule.

## Activate only Executor

- [ ] Stage a byte-preserving candidate Compose file that changes only `services.executor.image` to the approved digest.
      The repaired private-origin entry, all other env, volumes, network mode, ports, and other services must remain identical.
      The recorded baseline has no manual `EXECUTOR_BUILD_VERSION` override; the old misleading header is baked into its image.
      If a new override is discovered, stop and review its removal explicitly. The candidate uses its baked honest header.
- [ ] Compare resolved Compose objects using the original `--project-directory` and environment for both files.
      Require exactly the reviewed image delta. Do not reserialize or reformat other service definitions.
- [ ] Check the live Compose checksum again against the captured/reviewed bytes immediately before installing the candidate atomically.
      No concurrent stack edits are allowed. Keep the original file in backup B.
- [ ] Run only the following service recreation. Resolve the new container ID immediately afterward.

```bash
set -euo pipefail
source /opt/executor/upgrades/beta40-d22ca5ba0.current/recovery.env
# The staged activation script checks and installs the reviewed Compose first.
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
- [ ] Observe at least two fresh successful Rakazo `computers` schedule occurrences after candidate startup, within the 10-minute acceptance window.
      Require the same enabled interval, registry URL, source versions, working files, and stopped computer states. Do not trigger the mutation manually.
- [ ] Run a 35,200,010-byte exact digest query on an explicitly approved disposable app fixture, plus a small control.
      Prefer a fixture qualified before maintenance. Never modify a real app or publish a working tree for this check.
      Require exact input length, UTF-8 byte count, and SHA256. Retain the ARM stateless/facet acceptance receipts too.
      Creating this fixture is a production write covered by deploy approval, not read-only preflight. Its app has no real credentials or schedules.
- [ ] Compare both app deployment IDs and unpublished working refs/content with backup B. Confirm account links/grants and sidecar IDs/start times remain intact.
- [ ] Observe health, crashes/restarts, required workflow receipts, and logs for 10 minutes. Restore the original safe Executor watchdog state after acceptance, then check health again.

The new controller must use explicit verifier outcomes, not `grep ERROR` and not a blanket `trap ERR` that restores data for every command failure.

| Outcome                | Controller action                                                                                                                                                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0 ACCEPTED`           | All required gates pass. Record separately any explicitly accepted pre-existing warning/log signatures.                                                                                                                                                   |
| `20 ROLLBACK_REQUIRED` | Invoke rollback once. Examples are broken candidate startup, migration/storage failure, crash/OOM/restart loop, data/identity loss, or a required workflow regression attributable to Executor.                                                           |
| `30 HOLD_OPERATOR`     | Stop further rollout actions and report the evidence. Examples are an expired verifier credential, an unhealthy external provider/control, unavailable evidence, or an unclassified failure. Do not silently accept or restore data based on uncertainty. |

A workflow failure is attributable when its baseline passed in this run with the same scope/state, the external dependency control still works from the relevant Executor network, and the candidate returns a failing or wrong result.
Explicit Executor errors such as credential decryption, migration failure, or changed app/account identity qualify directly.
If the dependency/control also fails, hold for the operator instead of blaming the upgrade.

The known `script terminated for unknown reasons`, `connect(): Connection timed out`, and `onBroken()` signatures **alone never request rollback**.
Capture timestamp/request/job correlation and baseline comparison. If the same signature accompanies an attributable required-workflow failure, that failure still requests rollback.
Do not label the messages harmless or suppress their collection. The same classification applies during rollback verification, so a familiar standalone log line cannot falsely turn functional recovery into `ROLLBACK_FAILED`.

On `HOLD_OPERATOR`, keep the current healthy service running and restore its previously active, audited health-only watchdog.
Do not declare acceptance. If health instead meets a hard failure predicate, request rollback automatically.
A failed rollback stops automation and leaves the incident with the operator. Never restore repeatedly or start the old engine on partially restored data.
After acceptance, disarm this automatic snapshot-restore controller. A later incident needs a new decision about intervening writes.

## Restore the exact old image and fresh backup B

The staged command is `sudo bash /opt/executor/upgrades/beta40-d22ca5ba0.current/rollback.sh`.
It must resolve its physical stage directory and source that run's saved `recovery.env`.
Do not reuse any beta39 rollback path or pre-Geotorget snapshot.

- [ ] Save candidate logs and failure receipts. Suspend only the audited Executor watchdog.
- [ ] Resolve the current Executor container by Compose labels, not the pre-deploy ID. Stop and remove only that container.
- [ ] Reverify backup B's checksums, the current local volume identity, and absence of all writers.
- [ ] Require the confirmed ordinary local volume directory, not a separate mounted filesystem. Preserve failed data by a same-filesystem rename.
- [ ] Restore the complete archive, ownership/mode, original Compose/config, and the exact saved image.
      Retag the saved image to the captured original Compose reference and forbid registry pulls.

```bash
set -euo pipefail
source /opt/executor/upgrades/beta40-d22ca5ba0.current/recovery.env
(cd "$BACKUP_DIR" && sha256sum --check SHA256SUMS)
# The rollback script has stopped/removed only Executor and verified no writers.
python3 "$STAGE_DIR/verify-no-writers.py" "$DATA_DIR"
! mountpoint -q "$DATA_DIR"
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
