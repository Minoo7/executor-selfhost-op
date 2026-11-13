# Executor production stack

Portainer deploys this Compose file from `Minoo7/executor-selfhost-op`, branch
`deploy/executor-production`, on the existing cluster endpoint. Git owns the
Compose configuration. Portainer owns deployments and environment inputs.
Automatic updates and webhooks stay disabled.

The image is pinned to the qualified ARM64 beta40 digest. It contains upstream
runtime behavior plus organization MCP instructions and safe skill deletion.
Changing this file does not rebuild the image or deploy it automatically.

## Required Portainer environment

Set `EXECUTOR_URL_ALLOW_HTTP_ORIGINS` to the exact JSON string captured from the
current production stack. Keep its repaired Geotorget origin. Its value is
preserved privately with the migration receipts; do not replace it with an
example or publish private configuration. Other environment values are unchanged.

Both volumes are external and must already exist:

- `executor_executor-v2-data` mounts at `/app/data`.
- `scape-egress_scape-egress-state` mounts at `/var/lib/tailscale`.

The telemetry configuration remains a read-only bind from
`/opt/executor/otel-sink.yaml`. Keep the existing Tailscale state, hostname,
container names, loopback port and ingress labels. Do not request a new auth key.

## Initial migration

The production migration completed on 13 November 2026. The following steps
are retained as migration/reinstall reference, not pending work. Portainer
2.45.1 cannot attach Git to an editor-managed stack in place. Its supported
migration recreates the same `executor` stack from this repository. That
interrupts Executor, its Tailscale sidecar and telemetry. It does not require
changing the application image or migrating its database.

Before teardown, obtain approval for the interruption and these container
replacements. Back up the saved stack/environment and telemetry configuration.
Stop the writer and take a fresh verified backup of the data volume, including
its keys. Capture the Tailscale state consistently while its sidecar is stopped.
Verify off-host copies, existing volume identities and locally available pinned
images. Preserve the health watchdog's runtime state.

Delete the existing stack through Portainer without removing volumes. Recreate
stack `executor` on the same endpoint from this branch and
`deploy/production/compose.yaml`. Supply the saved environment value. Leave
Git polling, webhooks, pruning and forced image pulls disabled. Record the new
stack ID and Git workflow/source linkage after asynchronous deployment finishes.

Require the same image/header, healthy startup, login/assets, anonymous MCP401,
authenticated organization settings and Geotorget whoami, successful natural
Rakazo runs and unchanged stopped-computer states. Verify Tailscale identity and
both volume mounts. Restore the original health watchdog state. Do not reuse
old operational scripts that hard-code stack ID1.

## Recovery

If Git deployment fails, preserve diagnostics and inspect actual stack state
before retrying a create request. Remove only a confirmed replacement Executor
stack, preserving both external volumes. Recreate the saved editor definition
on the original endpoint with its original environment and the same image.
This requires another interruption. Do not reset data to repair a Git linkage.

Full data restoration is reserved for an attributable data/storage failure and
uses the fresh stopped-writer snapshots. Preserve candidate data before restore
and account for writes made after the snapshot. Container writable layers are
not preserved by stack recreation; the required persistent state must be in the
verified named volumes or saved host configuration.

## Later updates

Commit and review configuration changes on this branch. Trigger Portainer's
manual pull/redeploy only after approval. Pin every image update to a verified
digest and keep the data-backup/rollback procedure appropriate to that release.
