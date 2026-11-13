# Git-backed Executor production management

Completed and verified on 13 November 2026 after Vincent approved the one-time maintenance window. The beta40 application image did not change.

## Deployment source

- Repository: `https://github.com/Minoo7/executor-selfhost-op`.
- Branch: `deploy/executor-production`.
- File: `deploy/production/compose.yaml`.
- Deployed Git commit: `be033924bf9690453a3bf36399167655db434774`.
- Compose SHA256: `2066310faeffccbfa7ae17fa455b63105b1957cbd39a09579275e3a282a7758e`.
- Current Portainer stack: `28` (`executor`), endpoint `3`, workflow `3`, source `3`.
- Image index: `sha256:6bd69c2c64941d40821952511c6e829b1805a22e71ce5ae09b68fdac35c8da54`.
- Application build: `2.0.0-beta.40-org-skills-9d19eb848-arm64`.

Portainer AutoUpdate is null. No webhook or polling interval was configured. Git owns Compose edits; deployment remains manual through Portainer. The private origin allowlist stays in Portainer's environment inputs. Later documentation-only branch commits do not change the image or Compose content and are not automatically deployed.

The native migration deleted editor stack1 and recreated the same project from Git. Only Executor, its Tailscale sidecar and telemetry were replaced. Both explicitly external named volumes were reused. The shared Docker network, five unrelated attached containers and tsdproxy retained their identities and start times where applicable. Tailscale retained its node identity and addresses. Old scripts hard-coding stack1 must not be reused; resolve the current stack by name and endpoint.

## Fresh verified backups

Server directory: `/opt/executor/upgrades/portainer-git-20261113T083655Z/backup`.
Off-host directory in this checkout: `.local/portainer-git-live-20261113/offhost-portainer-git-20261113T083655Z`.
The off-host destination has FileVault enabled. Every file matched the manifest, and gzip integrity and archive listings passed on both sides.

| Archive                                  |     Bytes | SHA256                                                             |
| ---------------------------------------- | --------: | ------------------------------------------------------------------ |
| `executor_executor-v2-data.tar.gz`       | 916792502 | `e5648d9f4d4911888d0e13e8bb1f0e5db8d66e20269858994670fdb367d4cd4a` |
| `scape-egress_scape-egress-state.tar.gz` |     12312 | `e8843d5f0a83f6d02d1f82de318aa05c1591e915426e9dc6b430db13db75b9bf` |
| `images.tar.gz`                          | 172418094 | `dbc96cd7dfdf9efce75cc4712f5326ae121720f00e38065833d00b9a3d6e0a79` |

Manifest SHA256: `53ca1c5969b0b02e6d0e93b9ca927eb57acb7d59deaa897ee8d7f8d0f9d6ac4f`.
Both volume snapshots were stopped-writer backups. Original stack/env, telemetry configuration, volume metadata, identity fingerprints and the three pinned images were saved privately.

## Verification and remaining limits

Health/exact header, login and referenced assets, anonymous MCP401, authenticated owner context and saved org instructions passed. Instructions retain the original revision and354 characters. Geotorget completed whoami for the expected Plana customer. Its first verification job expired before result read; the failure was retained and a fresh read-only job completed. Multiple fresh natural Rakazo schedule runs passed; all four reported computers remained stopped.

All four identity/key fingerprints, all3368 repository files and the actual runtime environment matched the snapshot. Sixteen health checks over at least five minutes passed with zero restarts/OOM. The original health watchdog is active again, the transient backup guard is inactive and migration state is `ACCEPTED_GIT`. No recovery or data restore was needed.

The known Better Auth client-IP warning and generic termination/timeouts remain unresolved. They did not accompany a failed required workflow or unhealthy candidate and did not trigger recovery by themselves. No production skill deletion was exercised and no separate MCP initialize/discovery payload was captured. API ambiguity and recovery paths were reviewed but not exercised by this successful production operation.

## Future changes and recovery

Commit and review deployment-file changes on the named branch, then approve and run a manual Portainer pull/redeploy. Application-source changes require a separately built and qualified image followed by a pinned-digest update. Pushing source or documentation alone does not update the running application.

A later migration/configuration recovery needs a fresh operator decision. The window-only recovery command refuses the accepted state. The supported editor recovery is a volume-preserving recreation from the saved stack/env and same images. Data restoration is reserved for an attributable storage/data failure, preserves candidate data first and accounts for later writes. Do not reset volumes to fix Git linkage.

Detailed commands and private receipts are in [.local/portainer-git-live-20261113/report.md](../.local/portainer-git-live-20261113/report.md). Production archive contents and credential values are excluded from Git.
