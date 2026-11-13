# Upgrade the self-hosted Executor to beta40

Status is **DEPLOYED AND ACCEPTED ON PRODUCTION, 12 NOVEMBER 2026**. Vincent requested this plan on 11 November 2026 at 20:10 Stockholm.
The original plan granted no production permissions. The release-preparation authorization below supersedes only its named gates.
The target is the upstream-first beta40 code reviewed in the isolated sandbox.
Do not run the historical beta39 controller. Its broad log gate caused an unnecessary rollback.

## Git-backed Portainer management, 13 November

The approved migration completed. Production is now Git-backed Portainer stack28 on endpoint3, workflow3/source3, using `main` (renamed from `deploy/executor-production`) and `deploy/production/compose.yaml` at Git commit `be033924bf9690453a3bf36399167655db434774`. The application image, volumes, runtime environment, keys and app repositories are unchanged. Manual deployments remain in place. This supersedes the earlier editor-managed stack1 identity and procedure references below.

Fresh stopped-writer backups covered both data and Tailscale state, with verified off-host copies. Tailscale identity, shared network, unrelated containers and tsdproxy are preserved. Health/login/anonymous401, authenticated settings, Geotorget and natural Rakazo checks passed. See [the completed migration record](portainer-git-migration-20261113.md) for checksums, verification and recovery limits. Do not reuse operational scripts that hard-code stack1.

## Current production result, 12 November

Vincent authorized the editor-managed Portainer repair and beta40 upgrade with “u do it”. Stack `1`, endpoint `3`, on ARM64 `cluster` now pins `registry.depot.dev/5884x6f4tn@sha256:6bd69c2c64941d40821952511c6e829b1805a22e71ce5ae09b68fdac35c8da54`. The public build header is `2.0.0-beta.40-org-skills-9d19eb848-arm64`. App source remains frozen at `9d19eb8480b3aba979ac527c38cfdc005dda709f`. Portainer remains editor-managed, without Git or automatic updates.

The saved Portainer definition now preserves the running repaired `portainer-aws` origin and uses the new image. Environment, ports, network namespace, volume and sidecar IDs/start times are preserved. No manual header override was added. Only Executor and its own health watchdog/run-specific guard timers were operated.

Fresh stopped-writer backup B is `/opt/executor/backups/beta40-9d19eb848-20261112T144126Z`. `data-before.tar.gz` is 884580649 bytes, SHA256 `6284ecdb5021a0fba1e144a84e72b6b60b21d723546a4bbe11427fd315f68de6`. The old image archive SHA256 is `f51bd6bb064a301e2cdee4159e8167f4f258eec42d6b36242996c9b5712f5705`. Manifest SHA256 is `e4732c90f8f6b572af9504b14c64d4ebff22221e1af71d260a500f47928a4827`.
The complete verified off-host copy is `.local/beta40-portainer-deploy-20261112/offhost-beta40-9d19eb848-20261112T144126Z` in this checkout on FileVault-enabled storage. Server/off-host hashes, gzip integrity and archive listing passed; 9107 entries were listed. Both saved Portainer and repaired running definitions, image/config and directory-mode receipts are retained privately.

Public health/exact header, login HTML and referenced assets, anonymous MCP401, existing authenticated owner context, saved org instructions through MCP tools, authenticated Geotorget whoami and multiple natural Rakazo schedule runs passed. Org instruction revision and354-character additions match the baseline. Geotorget returned PLANA SOLUTIONS AB, customer50615201. All four reported stopped/paused computers remain stopped/paused; no enrollment/start/reconcile mutation was manually invoked.
All four identity/key fingerprints match. The original repositories are preserved. One concurrent `pstack Skills (trial)` app commit at20:30:48 UTC advanced its main branch to `8508b78885385327390643b38b811224b6e57515`, with the snapshot head as parent. Its three new objects and updated ref were retained. Other repository files match the snapshot; no app work was reset or published by the upgrade.

The ten-minute observation passed31 checks with zero restarts/OOM. The original health watchdog is active again. State is `ACCEPTED_DISARMED`; no rollback ran. Standalone generic timeout/script-termination logs and the known Better Auth client-IP fallback warning remain unresolved and did not coincide with a failed required workflow. Startup showed no storage/migration failure. Historical same-schema auth planning found zero pending DDL; fresh backupB SQL was not separately compiled and live DDL was not traced. A separate production initialize/discovery payload was not captured; instruction delivery was qualified on the exact native image with synthetic data, and preserved settings were read through authenticated production MCP tools.

The full commands, exact guarded rollback command and evidence are in [.local/beta40-portainer-deploy-20261112/report.md](../.local/beta40-portainer-deploy-20261112/report.md). The rollback command refuses after acceptance/expiry; any later full snapshot restore needs an explicit operator decision because later writes would be lost. The operational restore path was reviewed but not newly executed; prior native full-snapshot release journeys passed.

The remaining sections preserve historical preparation and runbook requirements. Earlier “no deploy approval”, unchecked pre-deploy gates and stale-definition stop records describe prior checkpoints; this result supersedes their release status. It does not turn the stated evidence limitations into passed checks.

## Current release scope and Portainer owner

Vincent deferred the custom cancellation runtime until a real app needs it and confirmed that Portainer owns the production stack. Current source is `9d19eb8480b3aba979ac527c38cfdc005dda709f`. Self-host runtime/pin/packager, SDK and app-data trees now match immutable upstream beta40 exactly. The retained product customizations are organization-wide MCP instructions (including its schema identity guard and Effect extension) and safe dashboard skill deletion.
The custom native-disconnect scenario and its helper-only return fields are removed with the deferred runtime guarantee. Ordinary upstream MCP cancellation coverage remains. Three focused source E2E scenarios passed for cancellation, organization instructions and skill deletion; format/full check passed.

New image `registry.depot.dev/5884x6f4tn:2.0.0-beta.40-org-skills-9d19eb848-arm64` was built natively from the frozen commit with upstream's Dockerfile. Registry verification read back index `sha256:6bd69c2c64941d40821952511c6e829b1805a22e71ce5ae09b68fdac35c8da54` and ARM manifest `sha256:287961b0a921d232580677b63637e81067bffce38c84522ea573d12c41e37f7f`, checked their content hashes, source/version labels and baked build identity.
Its synthetic native ARM smoke checks passed health, exact header, login HTML, anonymous MCP401, organization guidance in initialize/discovery and a normal tool call. The packaged workerd matched the checksum-verified upstream ARM release. All four named native ARM migration/recovery scenarios passed in one run. The private runner finished and its files were removed. These synthetic checks do not constitute deployment approval.

Portainer ownership is confirmed by Vincent, not inferred from an old container label. The exact current stack ID, endpoint, configuration/environment and Git-backed versus editor-managed mode must be recorded read-only before any change. Use Portainer's existing stack ownership for activation and image reversion, preserving all services/env/volumes/ports. Do not bypass it by rewriting host Compose files or enabling automatic Git updates. At that release-preparation checkpoint no Portainer or production API request had been made; the authorized production result above records later actions.
Use the existing source mode: update the pinned Executor image in its Git source if Git-backed, or in its current Portainer stack definition otherwise. Rebuild is not a reason to migrate stack ownership. Keep the current stopped-writer backup/off-host verification and data-restore requirements. An image reversion in Portainer does not restore a database backup.
The older Compose/controller command bodies below are design references, not authority to bypass Portainer. A general controller is not required for Executor self-hosting; before activation, finalize the short Portainer update/data-restore procedure and either satisfy the requested automatic rollback rule with a reviewed narrow script or obtain an explicit change to supervised recovery. No deployment is authorized here.

The qualified OCI archive is 80148480 bytes, SHA256 `0efb9b2ec21ec5941024cf40e9fe0e4535d2a83e61c5b65043fa7578f29ce644`, with all 31 referenced blobs verified. Source bundle SHA256 is `3ae4ad41a716657e269012ecc1fa3d00fb9c4132f71c266fccdc3ade2abf36a9` and requires upstream base `e3d989e4b977da51829ba006952c2c764c1f980f`. Registry retention remains unconfirmed. These local archives are preservation inputs, not permission to deploy.
Build and native receipts are in [.local/beta40-org-skills-release-20261112/report.md](../.local/beta40-org-skills-release-20261112/report.md). Older runtime-customized image receipts remain historical and must not be used as the new release target.

## Read-only Portainer preflight on 12 November

**STOP_CONFIG_DRIFT. No production changes.** The live ARM container remains healthy on exact image `1f921aadddfee82de5fc796430bb1a83db963d4a95a048bcb1ac058eb051d6bb`, revision `1677c7860872be67d214ad6b52d6d46b24d2fdec`, using `executor_executor-v2-data` at `/app/data`.
Portainer stack `1` (`executor`), endpoint `3`, is editor/file-managed with no Git configuration or automatic updates. Its saved Compose checksum is `b4093df44583ac3e4d4efc18827af93de9b79c9d2b996e4e84833e6bc3d2f43b`. The running container's Compose source remains `/root/executor-skill-delete-20261104/docker-compose.after.yml`, checksum `b590fc08bb714b46e10424a01fb38731aca756fcca91817cf715a0e5209405e9`.
Resolved configuration differs in exactly one field, `services.executor.environment.EXECUTOR_URL_ALLOW_HTTP_ORIGINS`. Portainer retains `https://pomerado-aws.tailac7a97.ts.net:8080`; the running configuration uses the repaired `https://portainer-aws.tailac7a97.ts.net:8080`. An image-only update of the saved Portainer definition would undo that repair.
Do not activate from the stale definition. The proposed next change must explicitly preserve the running repaired origin and update only the Executor image, after private configuration backups, fresh backup B and approval. No stack reconciliation, writer stop, backup B or deployment occurred during preflight. Safe metadata is in `.local/beta40-portainer-preflight-20261112/receipt.json`.

## Scope change on 12 November

Vincent selected upstream behavior for large inputs and requested removal of our custom transport. Source `74c4d0b49c565ba27d340db4901a3243e04059e4` now restores the SDK/app-data input transport byte-for-byte to immutable upstream beta40 `e3d989e4b977da51829ba006952c2c764c1f980f`.
The chunk callback, inner stream helper and associated stream cleanup are removed, together with two custom large-input specs and their five scenario registrations. Upstream input-size limits are accepted. Organization MCP instructions and safe skill deletion are unchanged.
That intermediate source still retained the cancellation pin. Vincent subsequently deferred it; the current upstream-runtime scope above supersedes that intermediate state.

Four named self-host scenarios passed on freshly prepared source, covering MCP cancellation, storage callbacks, workflow reuse and organization instructions. One Local tool/workflow scenario passed. Format, full check and protocol verification passed. No production access, deployment or publication occurred.
The prior `d22ca5ba0` images and their native ARM receipts below are historical evidence. They contain the removed transport and **must not be deployed for the revised scope**. At that intermediate checkpoint no replacement image existed. The later upstream-runtime image and acceptance are recorded above; do not retag or deploy an old image.

The SDK/app-data restoration changes no auth/schema/organization-instruction migration source. Earlier database findings remain historical evidence. The current release section separately records the rebuilt artifact's synthetic acceptance. This scope change supersedes all earlier 35 MB success checks and production fixture requirements.
Evidence is in `.local/beta40-upstream-transport-restoration/`; the original handoff also identifies its owned E2E report directories.

## Release preparation authorized at 21:15 Stockholm

Vincent authorized building the frozen-source ARM64 artifact and a private retained-data rehearsal on 11 November 2026.
Deployment, backup B, Compose swap, volume rewrite, live Executor stop/restart and activation remain forbidden.
The initial ARM-only tag/header was `2.0.0-beta.40-org-skills-runtime-d22ca5ba0-arm64`; that artifact is now historical after the scope change above.
The earlier two-platform build recipe is optional release preparation. This run builds only native ARM64 and records its own immutable digest.
Snapshot A's stopped-writer capture cannot run under the new no-stop/no-restart hard stop. Use an existing verified stopped-writer archive only if its provenance and approved private destination can be established.
Do not copy a running database directory as a substitute. If no safe snapshot exists, report the rehearsal blocked while completing the authorized build.
The private retained-data rehearsal must remain egress-isolated. Real Geotorget login and natural Rakazo reconciliation need external egress and may change external state.
Record those checks as blocked in the isolated copy unless separately approved scoped controls can prevent enrollment/start and protect copied credentials. Do not claim fixture or recorded responses as live provider acceptance.

## Initial preparation result before the Depot continuation

The native ARM64 build from frozen source `d22ca5ba0026abdb28fca0449f60472a383b1646` succeeded and is saved in Depot.

| Artifact               | Verified value                                                                   |
| ---------------------- | -------------------------------------------------------------------------------- |
| Tag                    | `registry.depot.dev/5884x6f4tn:2.0.0-beta.40-org-skills-runtime-d22ca5ba0-arm64` |
| Index                  | `sha256:6f46c01d5ba32ae7b1464c3715c7becbc3add49f4bd2f7423d89da3fbc26dba7`        |
| ARM manifest           | `sha256:1d9ea246761591371fdfe1d3a6b9d6cf5682c675ef1ba644937fd34474f77bc9`        |
| ARM raw workerd SHA256 | `7634ac29a730e8f100c4b47b1057a734740ad2f7309a8b4398c6e2f7dbf34578`               |

Registry architecture, labels, baked version and pinned workerd contents passed static verification. At this initial checkpoint, runtime HTTP and retained-data checks had not run. The Depot continuation below supersedes that status.
The existing repaired stopped-writer data archive passed checksum/listing verification. Its SHA256 is `ff2a6f3dda35d1346823978f19fe38b3fcea9b2d4f9e6fbf983ce4b85cf5a6e2`, size 870090675 bytes.
Its local path is `/Users/minoo/m4_projs/executor-selfhost-op/.local/pomerado-dns-20261111/deploy/backup/data-before.tar.gz`.
It is historical input, not a fresh deployment backup B.

Vincent allowed a new private Daytona probe. It reported private access and blocked network, but booted `x86_64`.
Native ARM placement could not be established through the available CLI/account API. No secret-bearing data was uploaded and the probe was deleted.
At this checkpoint the native ARM retained-data rehearsal was blocked. The completed core Depot journey below supersedes that blocker. No production service was queried or changed.
Detailed receipts and every requested check's status are in [.local/beta40-arm-production/report.md](../.local/beta40-arm-production/report.md).
Native ARM access was subsequently established through Depot. The egress-isolated rehearsal cannot itself prove live Geotorget or registry access.

## Depot native ARM rehearsal result

Vincent proposed Depot after the Daytona probe. SDK sandbox `72njgz00lfvx13g` booted native ARM64, with Docker also reporting `aarch64`.
Automatic tailnet enrollment and shared Depot cache were disabled. The copied servers used an internal Docker network that refused outbound traffic.
The candidate passed exact HTTP build identity, health, login HTML and anonymous MCP401 on synthetic and retained data.
Synthetic authenticated MCP initialize/discovery and four exact digest calls passed, including 35200010 bytes on stateless and SQL-facet paths.
The retained-data candidate and repeat startup passed. Logical fingerprints matched for 62 of 63 tables, including accounts, apps, links, schedules, org instructions and the journal. Only rateLimit changed.
All 3325 repository files matched byte-for-byte. Column metadata showed no differences; DDL statements and lock timing were not traced.
Full restoration from the original verified tar booted beta32 and passed HTTP recovery with preserved key fingerprints.
Eight restored table fingerprints differed from the earlier post-start baseline. Row-level attribution is incomplete, so full logical rollback acceptance remains open.
The baseline database exporter also hit its 128 MiB Blob limit on this roughly 981 MB database. Stopped inspection clones used the existing PGlite adapter instead.
Existing-user sign-in, retained authenticated MCP, live Geotorget/registry, and ARM disconnect acceptance remain unverified.
No production endpoint or host was accessed. Private copies were removed and the dedicated sandbox was stopped.
The current report and receipts are [.local/beta40-arm-production/depot-rehearsal-report.md](../.local/beta40-arm-production/depot-rehearsal-report.md).
This supersedes the earlier runner blocker, not the remaining release gates. No deployment approval is implied.

## Follow-up qualification result

The completed follow-up supersedes the open offline checks in the first Depot report above.
Private native ARM sandbox `793bfw0850n685q` used disabled tailnet enrollment/cache and an internal Docker network. Private copies and credential files were removed, and the sandbox finished at `2026-11-11T22:01:01.851Z`.
No production request, external workflow call, computer enrollment/start, or deployment ran.

- Cold restoration matched all 63 table fingerprints, columns, indexes, migration journal and inspected rows before any serve boot.
- An old-image-only control reproduced the eight running-state table differences. Row classification of that control, candidate/repeat and restored-old boots found no unexpected changes or workflow-account relationship violations. This does not reconstruct historical rows that the first run did not retain.
- Supported existing-user login passed on both copied images. Personal access tokens were created and deleted through the supported API, sessions signed out, and copied credentials removed. Saved instructions/revision matched the cold snapshot. Authenticated MCP initialize returned exact combined guidance on both images; candidate stateless discovery also passed.
- Five distinct named native ARM release cases passed across retained runs, covering four migration journeys and native dropped-response cancellation. The initial migration invocation passed three and failed the divergent-identity case at an insufficient readiness predicate. Its corrected named rerun passed. The original failure remains recorded; this was not one clean five-case invocation.
- The E2E-only fix consumes the startup response and waits for the actual storage-refusal log with the existing retry count and spacing and unchanged 180-second scenario timeout. Each attempt now also reads logs. Frozen application/build inputs remain unchanged. Full local `bun run check` passed. Native ARM static typecheck was unavailable because `tsc-rs` 0.1.0 has no published linux-arm64 package; native ARM runtime cases did run.

The exact archived ARM `1677c7860` image supplied the synthetic migration baseline, avoiding a redundant source build. The stock ARM control manifest was `sha256:aa79860449bb041b249f2b09a0bbeeb0d97c9205501c974c4d6c49eaff4fd654`. Its upstream source-label correspondence remains unproven; it is a compatibility control only.
At that checkpoint, captured columns/indexes were unchanged but DDL statements and lock timing were not traced. The historical auth-plan review below supersedes the open auth-DDL identification item; fresh verification remains required.

The complete candidate OCI archive is `.local/beta40-arm-followup/candidate-oci.tar`, 80138240 bytes, SHA256 `9723b366b021b19515ef8537e2c654a13458d37bcd0a523d315bccf456b261c2`.
All 31 referenced OCI blobs were verified. Depot retention could not be confirmed with the available user token. This archive preserves the artifact but is not an automatic deployment fallback. Recheck registry availability or validate an approved import/publication path before activation.
The source bundle `.local/beta40-arm-followup/release-d22ca5ba0.bundle` has SHA256 `bb17ec762bb7d06c083b4efc891c1d109a7cbf1580b94edb4d1e66505f47d02b`; it requires upstream base `e3d989e4b977da51829ba006952c2c764c1f980f`.

**At that historical checkpoint deployment remained blocked on live workflow qualification, fresh identity/backup B, approved encrypted off-host capacity, controller qualification and the remaining approval-record fields.** The current Portainer procedure above supersedes the generic-controller requirement. This Mac repeatedly reached ENOSPC and cannot currently satisfy the backup-space gate. Do not stop the production writer until destination capacity is verified.
A full copied install starts schedules immediately, with no supported quiet-serve option. Do not enable broad private egress to obtain Geotorget/Rakazo acceptance. A separately approved constrained integration path is required; the two stopped computers remain untouched.
Cancellation during input transfer remains unproven. The client-IP warning, generic script-termination logs and baseline exporter Blob limit remain documented limitations.

Full receipts, test titles and first failures are in [.local/beta40-arm-followup/report.md](../.local/beta40-arm-followup/report.md) and `qualification-summary.json` beside it.

## Historical auth SQL plan reviewed on 12 November

A database-only stopped-copy inspection used the existing repaired archive, without a server boot or production request. Free space was checked against the actor SQLite/WAL/SHM size plus 1 GiB before each copy. The task-owned copies were removed afterward.
The frozen schema-setup constructor, real `makeAuthDatabase`/PGlite adapter and patched Better Auth 1.7.16 compiled **zero pending auth SQL statements**, with no planned tables/columns/indexes, schema problems, unsafe changes or warnings. PostgreSQL read-only mode was enabled, no migrations were applied, and all 63 public tables' row fingerprints stayed equal.
The same inspector compiled 43 statements against an empty in-memory control. Runtime versions were verified as PGlite 0.5.8, Better Auth 1.7.16 and Effect SQL PGlite 4.0.1. No existing-user credential or production signing key was needed for schema planning.

This closes pending auth-DDL identification for the historical rehearsal snapshot only. It does not inspect today's production schema or prove a new backup B has the same plan.
After B is captured and verified, inspect its stopped copy before activation. Require the expected empty auth plan; any nonempty/incompatible plan is HOLD for SQL/additive/backfill/index review. If this exhausts the pre-activation budget, verify/resume the original baseline without restoring data and reschedule.

Better Auth executes generated builders sequentially; committed auth additions are not undone by a later product migration failure. The five-second lock and sixty-second statement limits belong to `migrateHostedDatabase`, which Cloud calls. Self-host calls `migrateHostedSchemas` directly under exclusive engine startup before routes/schedules start. Do not claim the Cloud limits bound self-host Better Auth SQL.
There is no planned auth DDL on this historical snapshot, so no auth DDL write-blocking or lock-wait timing was measured. Retain the full-snapshot rollback method and separately review SDK/product steps.

The client-IP warning remains unresolved. Source places it in Better Auth's HTTP rate-limit resolver, not the schema planner. The native proxy overwrites the trusted header; the Worker maps it to the Effect request address, and the auth handler rebuilds that header from the address. The existing logs do not identify which request lost a trustworthy address. No trust policy or rate-limit setting changed.
Evidence and source hashes are in [.local/beta40-auth-ddl/report.md](../.local/beta40-auth-ddl/report.md), `summary.json` and `inspection-receipt.json` beside it. These are offline adapter results, separate from native ARM packaged-image acceptance.

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

- [x] Use branch `experiment/beta40-upstream-first-20261111` and freeze application source at `9d19eb8480b3aba979ac527c38cfdc005dda709f`. Both runtime customizations are deferred.
      Later documentation, E2E and top-level operator-tool commits do not change that application/build revision. Preserve the canonical beta39 branch at `eadfc28`.
- [x] Record immutable upstream beta40 base `e3d989e4b977da51829ba006952c2c764c1f980f`.
- [x] Preserve that code revision in an approved remote release ref or a checksum-verified Git bundle before deployment.
      Publication belongs to authorized release preparation. Do not push or merge `main`, or rebuild from a moving branch head.
- [x] Preserve the reviewed artifact as reference, not as the ARM deployment target.
      Its tag is `registry.depot.dev/5884x6f4tn:2.0.0-beta.40-sandbox-org-skills-runtime-d22ca5ba0`.
      Its index is `sha256:ecd521e4cb96b6dfe639b67ae6f9bf7da48527be619f90880df9b50be2327ddf`.
      It contains the tested **amd64** image. Production was recorded as **arm64**.
- [x] Build the normal complete source image for ARM64, with this production identity.
      `2.0.0-beta.40-org-skills-9d19eb848-arm64`.
      Retagging cannot change the baked header or add an ARM manifest. Do not use emulation as the production qualification.

The build is complete. The block below is a historical rebuild recipe, not an instruction to rebuild the qualified digest. The executed command used a streamed Git archive and explicit native ARM build placement; see the release report and build receipt.
Do not switch or modify the canonical checkout.

```bash
set -euo pipefail
CODE_REV=9d19eb8480b3aba979ac527c38cfdc005dda709f
BUILD=2.0.0-beta.40-org-skills-9d19eb848-arm64
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

- [x] Read the final registry index back and record its index and ARM platform manifest digests.
      Verify source and version labels, ARM architecture, the baked header, and the selected workerd binary on ARM64.
      Pull with scoped private credentials and remove the credentials afterward. Do not move `latest`.
- [ ] Keep the exact qualified image available through the maintenance and rollback window.
      Verify Depot retention or copy the index and every referenced manifest/blob to a durable approved repository.
      Verify the destination digest after any copy. Never assume a registry copy or rebuild preserves a digest.
- [x] Run actual ARM Linux containers on an operator-controlled, non-production runner.
      The completed Depot runners and isolation receipts are recorded above. Record a new approved runner if further qualification is needed. Do not send production data or keys to the public Daytona review sandbox or a Depot build.
      If a private ARM runner is unavailable, stop qualification.
- [x] Run the four named Docker org-instruction migration cases and normal upstream tool calls against the newly built artifact. The custom native-disconnect requirement is deferred. No custom oversized-input success check is required.
      Record test titles, counts, image digests, logs, and build headers. Run only named scenarios.
      BuildKit `RUN` smoke tests and the verified gzip hashes alone do not establish ARM container acceptance.
- [x] Supply all three distinct ARM images required by the migration spec. The revised candidate, historical baseline and pinned stock control were supplied to the passing run.
      The verified archived production ARM image supplied the baseline. The current candidate digest is recorded above; the baseline and stock-control digests are recorded in the native QA report and earlier stock receipt.
      Synthetic migration fixtures used these images without accessing production. The amd64-only `10023ab...` baseline was not used.
- [x] Derive the expected ARM workerd binary SHA256 by decompressing the verified `linux-arm64` archive pinned in `workerd.json`.
      Its upstream gzip SHA256 is `b02c76c0425f32570eb114eea6a3cfce176b79710c8aaf6bc48c23b2d7f2b53f`.
      Record the derived raw hash, and match it against `/app/workerd` in the ARM candidate. Do not use the amd64 raw hash `129cc102...`.

The Dockerfile has inherited floating system inputs, including apt repositories and a distroless tag.
A new build is not byte-reproducible by assumption. Deploy the newly qualified immutable digest, never a later rebuild of its tag.
Any application or trust-policy fix changes the source SHA, build identity, and qualification record before approval.

Completed gates are evidenced by `.local/beta40-org-skills-release-20261112/report.md`, `registry-verification.json`, `source-bundle.json`, `smoke-results.json` and `migration-results.json`. The verified raw ARM workerd SHA256 is `dbadc8499a75750c312b3f8f9f7ca5c0980d85f18fdde065e57f93936c72c375`. Registry retention remains open.

## Approve what ships and what is deferred

| Behavior                       | Production proposal                                                                                                                                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Organization MCP instructions  | Ship admin browser-session saves, strict revision CAS, 8192-unit limit, member reads, and request-scoped initialize/stateless discovery. Preserve the deployed table and `10_org_mcp_instructions` identity.                  |
| Skill file and folder deletion | Ship the rebuilt dashboard flow. Confirm a fixed review, compare the selected subtree with a fresh read, preserve unrelated edits, and commit with an expected revision. Deletion does not deploy the whole working revision. |
| Large input                    | Use exact upstream beta40 input transport and limits. Custom chunking/streaming and oversized-input success requirements were removed at Vincent's request.                                                                   |
| Cancellation                   | Use upstream beta40 runtime and ordinary cancellation semantics. The custom workerd fork, associated native-disconnect guarantee/spec and input-stream cleanup are deferred.                                                  |
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

The amd64 and native ARM synthetic journeys passed. The native ARM follow-up also passed retained existing-user authentication, exact cold restoration, row-level background-drift controls and native disconnect acceptance. External workflows and fresh auth-plan verification remain open; the historical auth plan and source lock boundary are reviewed above. Historical archive qualification does not replace fresh identity verification or deployment backup B. The checklist below describes the full contract; the result sections above distinguish completed work.

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

| Field                                          | Required value or current state                                                                                                                                                                                                                                                        |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Application source                             | Frozen 9d19eb8480b3aba979ac527c38cfdc005dda709f on experiment/beta40-upstream-first-20261111; only org instructions and safe deletion product deltas remain.                                                                                                                           |
| Production build header                        | 2.0.0-beta.40-org-skills-9d19eb848-arm64; baked into the new ARM image and returned by native smoke.                                                                                                                                                                                   |
| Production index and ARM manifest digests      | sha256:6bd69c2c64941d40821952511c6e829b1805a22e71ce5ae09b68fdac35c8da54 / sha256:287961b0a921d232580677b63637e81067bffce38c84522ea573d12c41e37f7f. Native synthetic acceptance passed; no deploy approval.                                                                             |
| Synthetic ARM baseline and stock ARM controls  | Archived exact ARM baseline and stock ARM control supplied; see the follow-up result and image receipts.                                                                                                                                                                               |
| Exact production baseline archive              | Existing off-host `1f921aad...` OCI index, ARM manifest, config and revision verified. No new production snapshot captured.                                                                                                                                                            |
| ARM workerd binary hash                        | Replaced the custom fork with upstream caf569c512. New native image binary matched the verified upstream archive; raw SHA256 dbadc8499a75750c312b3f8f9f7ca5c0980d85f18fdde065e57f93936c72c375.                                                                                         |
| Private ARM runner and receipts                | Historical private-copy runners finished and copies/credentials were removed. New synthetic-only ARM runner 3fnxt7jbkvg9wb3 also finished with files removed; all four current-image migration journeys passed.                                                                        |
| Fresh identity and required baseline workflows | **Not inspected in this planning task**                                                                                                                                                                                                                                                |
| Snapshot A and private rehearsal               | Historical repaired archive rehearsed privately on ARM. No fresh snapshot A or backup B captured; live workflow gates remain. Cold restoration and row-level controls passed.                                                                                                          |
| Better Auth DDL and locking review             | Historical snapshot plan compiled through the real adapter: zero auth DDL, warnings/problems or unsafe changes. No DDL locks to time for that plan. Recheck backup B; unexpected SQL requires review. Self-host startup does not use the Cloud job timeout wrapper.                    |
| Durable image repository and retention         | Depot retention unconfirmed. Complete verified OCI archive preserved locally; validate registry availability or an approved durable copy before activation.                                                                                                                            |
| Snapshot destinations and space                | **Open capacity gate**. Mac hit ENOSPC. Name and verify adequate encrypted off-host storage and free-space reserve before any production stop.                                                                                                                                         |
| Verifier authentication                        | Record authorized actor/resource/scopes and validity through the window plus 30 minutes for recovery. If TTL is opaque, require a successful validity probe and an operator available to renew it. Do not send email codes or broaden grants.                                          |
| Dependency controls and fixture                | Per-workflow controls remain required. The custom large-input fixture is withdrawn. Any destructive skill fixture needs separately approved visibility and cleanup.                                                                                                                    |
| Risks accepted or fixed                        | Each item in the risk table below                                                                                                                                                                                                                                                      |
| Maintenance budget                             | Proposed 30-minute window, not a measured downtime estimate. Include off-host transfer and a 10-minute acceptance window.                                                                                                                                                              |
| Exact update/recovery procedure                | Use the Portainer-owned stack. Finalize the short update and full-data-restore steps from captured stack identity. Old generic-controller design below is reference only; requested automatic recovery still needs a narrow qualified script or explicit supervised-recovery decision. |

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
test "$PROD_INDEX_DIGEST" != sha256:6f46c01d5ba32ae7b1464c3715c7becbc3add49f4bd2f7423d89da3fbc26dba7
BACKUP_PHASE=B
RUN_ID="beta40-9d19eb848-$(date -u +%Y%m%dT%H%M%SZ)"
STAGE_DIR="/opt/executor/upgrades/$RUN_ID"
BACKUP_DIR="/opt/executor/backups/$RUN_ID"
PROJECT_DIR=/root/executor-skill-delete-20261104
COMPOSE_FILE="$PROJECT_DIR/docker-compose.after.yml"
COMPOSE_PROJECT=executor
SERVICE=executor
DATA_VOLUME=executor_executor-v2-data
IMAGE="$PROD_IMAGE_REPOSITORY@$PROD_INDEX_DIGEST"
BUILD=2.0.0-beta.40-org-skills-9d19eb848-arm64
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
      Only then atomically point `/opt/executor/upgrades/beta40-9d19eb848.current` at this B stage.
      Record its physical path and run ID in the operator receipt. A must never create that pointer or contain `rollback.sh`.
- [ ] Suspend only the confirmed Executor watchdog. Leave an already disabled update timer unchanged.
- [ ] Stop only Executor, then archive. A failed `docker ps` must fail the assignment, not masquerade as an empty writer list.

```bash
set -euo pipefail
source /opt/executor/upgrades/beta40-9d19eb848.current/recovery.env
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
[[ "$RUN_ID" =~ ^beta40-9d19eb848-[0-9]{8}T[0-9]{6}Z$ ]]
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

## Prepare a separate Compose candidate

The bounded preparer is implemented at [scripts/self-host/prepare-compose-candidate.py](../scripts/self-host/prepare-compose-candidate.py).
It is an operator tool outside the frozen image's Docker COPY inputs. It neither installs its output nor starts a service.
Use only a reviewed private source with its expected SHA256 and the original project/environment context.
The tool reads that source without following a source-file symlink, resolves the exact bytes through real Docker Compose with every profile enabled, and requires the entire resolved configuration to differ only at `services.executor.image`.
It writes only a new mode-0600 candidate and `<output>.receipt.json` under a private operator-owned directory outside the project. Existing output or receipt paths are refused. The receipt is published last; a candidate without its receipt is incomplete.
No resolved environment values or raw Compose errors are emitted or retained. References and hash metadata in the receipt are not authentication evidence.

```bash
python3 -I scripts/self-host/prepare-compose-candidate.py \
  --source "$COMPOSE_FILE" --source-sha256 "$REVIEWED_COMPOSE_SHA" \
  --project-directory "$PROJECT_DIR" --project-name "$COMPOSE_PROJECT" \
  --old-image "$OLD_IMAGE_REF" --new-image "$IMAGE" \
  --output "$STAGE_DIR/candidate/compose.private.yml"
```

The private candidate directory must exist with mode 0700. Run only after the separately approved source/context capture; no live configuration was read to qualify this tool.
The image scalar must be plain, unquoted and occur exactly once, with no duplicate reference even in a comment. A trailing comment on its own line is retained.
To prevent include/extends resolution without implementing another YAML parser, the tool conservatively refuses those raw words or any backslash anywhere in the source. This also refuses harmless comments/escaped values. If the approved source needs wider syntax, stop for review rather than changing its bytes to pass.
The proof covers one explicit source file only. It does not cover an implicit override, a multi-file `-f` set or inherited `COMPOSE_FILE`. Before activation, require Compose labels/context to name exactly the reviewed explicit file and use that same file set for resolution and recreation. Otherwise stop for review.
Post-resolution source hash/file-identity checks detect drift but do not establish a concurrency guarantee. The future installer must recheck source bytes, resolution context, backup-B bindings and approval independently.

Three named real CLI scenarios passed locally with Docker CLI 28.3.3 and Compose 2.39.4, using a nonexistent Docker socket. Final qualified script SHA256 is `66b21ca94f3bee85845554a685ad7304ca8d1241d0225e29d0094e4d755de660`, also recorded in the decisions log and `.local/beta40-controller-design/qualification.json`. They cover exact CRLF/comment preservation, original relative path/environment resolution, private output/receipt, semantic neighbour protection, source drift, mutable tags, ambiguous inputs, source/output symlinks, collisions and secret-safe errors. Removing the semantic-delta guard made the neighbour-refusal case fail; the guard was restored. Full `bun run check` passed.
The inactive-profile shared-anchor probe initially reproduced an unsafe preparation. Adding `--profile '*'` to the semantic proof made it refuse the neighbour change. The environment fixture now requires its secret variable, so missing project `.env` context fails instead of comparing two empty values.
These CLI checks do not qualify Linux installation, atomic live replacement, backup/off-host handoff, the ARMED controller or any workflow verifier. Those remain separate gates. Receipts and first harness failures are in `.local/beta40-controller-design/`. Release workflow triggers and POSIX/Python prerequisites could not be checked because this checkout lacks `.github/`; no CI execution claim is made.

## Activate only Executor through Portainer

The previous host-file installer and direct `docker compose up` recipe are superseded and must not be executed. Activation and image reversion belong to the existing Portainer stack. This section is a pending procedure, not an executable installer.

- [ ] Capture the current Portainer endpoint, stack ID, source mode and complete configuration read-only. Confirm the production identity and preserve its env, volume, ports and all other services.
- [ ] Prepare the Executor-image-only update in the stack's existing source of truth. Use its Git source if Git-backed, or its Portainer stack definition otherwise. Require both the text diff and resolved configuration to preserve every unrelated setting. Do not enable automatic updates or migrate stack ownership.
- [ ] Recheck the captured stack/config identity immediately before submission. Require the approved immutable digest and verified local/off-host backup B manifests bound to the approved run ID.
- [ ] Finalize and qualify the exact Portainer update request before deployment approval. It must update only Executor and preserve sidecars. Do not substitute a host Compose write or direct service recreation.
- [ ] Record activation time, stack/config identity, run ID, backup-manifest hash and candidate digest. Resolve the resulting Executor container ID afresh.
- [ ] Satisfy the requested bounded automatic data-rollback rule with a narrow reviewed procedure, or obtain an explicit decision to use supervised recovery instead. No general deployment controller is required by upstream self-hosting.

## Verify the candidate and classify failures

- [ ] Allow at most 120 seconds for healthy startup, using bounded health polling. Record migration logs, restarts, OOM state, and image identity.
- [ ] Require public `/health` 200 with `{"status":"ok"}`, exact `Executor-Build`, login HTML and assets, and anonymous `/org/executor/mcp` 401.
- [ ] Verify an authorized operator session without sending email. Compare preserved key fingerprints and explicit config.
- [ ] Read organization instructions and compare additions/revision with backup B. On a new authorized MCP connection, require initialize and stateless discovery to match the candidate's combined instructions.
- [ ] Complete authenticated Geotorget whoami through Executor using the existing saved account. Require the expected customer and terminal successful job, not only MCP initialization or an input-required response.
- [ ] Observe at least two fresh successful Rakazo `computers` schedule occurrences after candidate startup, within the 10-minute healthy observation period.
      Require the same enabled interval, registry URL, source versions, working files, and stopped computer states. Do not trigger the mutation manually.
- [ ] Verify a normal read-only tool call through an existing approved app. Geotorget whoami may supply this control.
      No custom large-input app is created or removed in production for this release scope. Upstream-size-limit failures alone are not a regression against a withdrawn custom requirement.
- [ ] Compare both app deployment IDs and unpublished working refs/content with backup B. Confirm account links/grants and sidecar IDs/start times remain intact.
- [ ] Observe health, crashes/restarts, required workflow receipts, and logs for 10 minutes after readiness, completing within the 15-minute activation budget. Restore the original safe Executor watchdog state after acceptance, then check health again.

The new controller must use explicit verifier outcomes, not `grep ERROR` and not a blanket `trap ERR` that restores data for every command failure.

| Outcome                | Controller action                                                                                                                                                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0 ACCEPTED`           | All required gates pass. Record separately any explicitly accepted pre-existing warning/log signatures.                                                                                                                                                   |
| `20 ROLLBACK_REQUIRED` | Invoke rollback once. Examples are broken candidate startup, migration/storage failure, crash/OOM/restart loop, data/identity loss, or a required workflow regression attributable to Executor.                                                           |
| `30 HOLD_OPERATOR`     | Stop further rollout actions and report the evidence. Examples are an expired verifier credential, an unhealthy external provider/control, unavailable evidence, or an unclassified failure. Do not silently accept or restore data based on uncertainty. |

Use these controls and classifications. No helper container, sidecar command, network-policy change or new grant is authorized merely to obtain a control.

| Check                     | Attributable failure requesting outcome 20                                                                                         | Ambiguous outcome requiring 30                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Startup/storage/identity  | Failed migration, failed health within the qualified startup deadline, crash/OOM loop, missing preserved data or wrong image/mount | Missing evidence or unavailable verifier                                         |
| Geotorget                 | Explicit Executor credential/decryption/runtime failure or a completed authenticated result for the wrong customer                 | Provider/login/network failure without an independently approved passing control |
| Rakazo                    | Fresh `status` proves a successful current registry fetch but the preserved enabled schedule fails inside Executor                 | `status` cannot prove a fresh fetch, or registry/network control also fails      |
| Organization instructions | Preserved additions/revision differ, wrong combined text, or an explicit MCP initialization error with valid auth                  | Expired auth, ingress failure, or unavailable evidence                           |
| Skill deletion            | Qualified fixture deletion changes neighbours, active version, or unrelated files                                                  | Unavailable browser/auth evidence                                                |

A passing baseline with the same scope supports attribution for existing workflows. Large-input custom success is no longer part of acceptance. Unclassified ingress failures hold unless an approved control isolates an Executor regression.
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

## Restore the exact old image and fresh backup B through Portainer

The future staged command is `sudo bash /opt/executor/upgrades/<B-RUN-ID>/rollback.sh --run-id <B-RUN-ID>`.
Use the physical stage path recorded in the activation receipt, never infer it from a stale `.current` pointer.
The script must compare its independently supplied run ID with `recovery.env` and the activation receipt, require `BACKUP_PHASE=B`, and verify the manifest hash and candidate digest.
Automatic invocation also requires `ARMED` state and an unexpired deadline. Manual invocation after disarm requires a new explicit operator decision.
Snapshot A has no rollback script. Do not reuse any beta39 rollback path or pre-Geotorget snapshot.
The former direct Compose restore/recreate block is superseded and removed. The requirements below must be implemented in the reviewed Portainer-owned recovery procedure before activation. No ready-to-run rollback command exists yet.

- [ ] Save candidate logs and failure receipts. Suspend only the audited Executor watchdog.
- [ ] Resolve the current Executor container by Compose labels, not the pre-deploy ID. Stop and remove only that container.
- [ ] Reverify backup B's checksums, the current local volume identity, and absence of all writers.
- [ ] Require the confirmed ordinary local volume directory, not a separate mounted filesystem. Preserve failed data by a same-filesystem rename.
- [ ] Restore the complete archive and ownership/mode, and restore the captured original stack/config and exact saved image through Portainer.
      Retag the saved image to the captured original Compose reference and forbid registry pulls.

Full-volume restoration still requires all writers stopped, verified backup B checksums, exact volume/mount identity, and a non-symlink ordinary local data directory. Refuse a separate mountpoint. Preserve failed candidate data by same-filesystem rename before restoring the complete archive with numeric ownership, ACLs and extended attributes. Restore the recorded directory owner/mode. Verify the saved old image ID and retag it to its captured reference if needed. Revert the image through the captured Portainer source mode with pulls disabled or an equivalently verified local-image path. Recheck the original stack/config checksum and ensure only Executor is recreated. These are recovery requirements, not authorization to perform them.

- [ ] Re-resolve the container and require the saved image ID and `1677c7860` source label, healthy startup, original header, login, and anonymous MCP 401.
- [ ] Verify saved org instructions, Geotorget customer, natural registry schedule receipts, working files, and stopped computer states.
      Retain candidate data and both local/off-host backups. Restore only the original safe watchdog state after functional recovery.
- [ ] Record any writes lost between backup B and rollback. External provider actions are not undone by restoring the volume.
      Escalate unexpected external actions separately; do not manipulate other services or start stopped computers to repair them.

## Accept or close the known risks

| Risk                                        | Proposed disposition before deployment                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Review image is amd64-only                  | Closed for the rebuilt 9d19eb848 ARM artifact: native smoke and four synthetic migration scenarios passed. Fresh production/provider checks remain separate.                                                                                                                                                                                                                                                                                |
| Production-state migrations                 | Must close. Private retained-data rehearsal and full restore passed; the historical auth plan is empty. Fresh backup B/off-host checksums and fresh schema review remain. Do not claim a current-production migration no-op.                                                                                                                                                                                                                |
| Client-IP/Better Auth warning               | Conditional acceptance for this upgrade if baseline and candidate auth work without a regression. The native host overwrites `x-executor-client-ip` from its TCP peer, runtime auth consumes it, and schema setup uses different options. The exact warning source/bucketing needs diagnosis. Do not trust arbitrary forwarded headers, disable rate limits, or invent an env fix. A trust-policy fix needs a new reviewed source/artifact. |
| Cancellation                                | Use upstream beta40 runtime and ordinary cancellation semantics. The custom workerd fork, associated native-disconnect guarantee/spec and input-stream cleanup are deferred.                                                                                                                                                                                                                                                                |
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
