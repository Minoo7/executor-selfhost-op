# Repository branches

`deploy/executor-production` is the default branch and the source of the
Git-backed Portainer deployment configuration. It contains our upstream-first
beta40 code and the two retained product additions, organization-wide MCP
instructions and safe dashboard skill deletion.

The running application is selected by the immutable image digest in
`deploy/production/compose.yaml`. Application-source changes need a rebuilt,
qualified image and a digest update. A Git push alone does not deploy it.
Portainer environment inputs remain separate from the public Compose file.
See [production operations](../deploy/production/README.md).

## Current and historical branches

The status labels below document deployment intent. They do not rename or
rewrite Git refs. Historical branches and their commits are retained so prior
release evidence, links and open pull requests continue to work.

| Branch                                 | Status   | Purpose                                                                                                                                                                       |
| -------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deploy/executor-production`           | CURRENT  | Production configuration and upstream-first beta40 source.                                                                                                                    |
| `main`                                 | LEGACY   | Previous default at `68f0df4`. Its build-stop and pending-deletion note is historical.                                                                                        |
| `upgrade/executor-beta39-20261110`     | LEGACY   | Beta39 port at `eadfc28`, superseded by the deployed beta40 approach.                                                                                                         |
| `upgrade/executor-beta31-20261028`     | LEGACY   | Earlier upgrade and custom runtime history.                                                                                                                                   |
| `build/org-instructions-f664b14bd`     | LEGACY   | Earlier organization-instructions build.                                                                                                                                      |
| `build/org-instructions-skill-delete`  | LEGACY   | Previous production baseline at `1677c7860`.                                                                                                                                  |
| `fix/app-account-sharing`              | LEGACY   | Older sharing controls; production now uses upstream's account model.                                                                                                         |
| `fix/beta19-preserve-account-controls` | LEGACY   | Historical beta19 account-control work.                                                                                                                                       |
| `feat/credential-file-upload`          | DEFERRED | File-upload work. [PR2](https://github.com/Minoo7/executor-selfhost-op/pull/2) remains open; production uses upstream paste/drop.                                             |
| `fix/beta19-private-https-origins`     | LEGACY   | Earlier origin-policy port. [PR3](https://github.com/Minoo7/executor-selfhost-op/pull/3) remains open; production uses upstream policy with its preserved operator allowlist. |
| `feat/skill-file-delete`               | LEGACY   | Earlier deletion experiment; the current implementation was rebuilt on beta40.                                                                                                |

Use the current branch for new deployment work. Read historical branches as
release evidence, not instructions to deploy their images or merge their old
customizations. Do not close PRs, delete branches or rewrite history as part
of routine updates. Archiving or removing them is a separate decision.
