# Upstream: Executor

This repository follows Executor's public release branch,
[UsefulSoftwareCo/executor](https://github.com/UsefulSoftwareCo/executor)
`v2-releases`, by merge. Each commit on that branch is one published release,
tagged `executor@<version>`. Upstream's development branch `v2` has a separate
export history with no common commit, so it is not merged.

The `track-executor` skill in the executor-selfhost-op Executor app runs each
merge. Its `executor.status` tool reads the State table below from git.

## State

| Item                 | Value                                                                    |
| -------------------- | ------------------------------------------------------------------------ |
| Upstream             | `https://github.com/UsefulSoftwareCo/executor.git`, branch `v2-releases` |
| Last merged release  | `executor@2.0.0-beta.40`                                                 |
| Last merged upstream | `e3d989e4b977da51829ba006952c2c764c1f980f`                               |

The tag `executor@<release>` on upstream must point at the recorded commit, and
the recorded commit must be an ancestor of this branch.

## Delta

Everything this repository does differently from upstream, and why. A file this
table does not list takes upstream's version. When upstream does what an entry
does, a run takes upstream's version and deletes the entry.

| Entry                          | Paths                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Why it exists                                                                                                                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Organization MCP instructions  | `apps/hosted/server/src/contracts/organization*.ts`, `apps/hosted/server/src/implementation/{organization*,mcp-http,migrations}.ts`, `apps/hosted/server/package.json`, `apps/hosted/web/src/**/organization*`, `apps/hosted/web/src/contracts/errors.ts`, `packages/mcp/src/contracts/tools.ts`, the `instructions` hunks in `patches/effect@*.patch`                                                                                                                         | Product addition shipped to production. Admins save one text per organization; MCP initialize and discovery return it. Production data records its schema step as `10_org_mcp_instructions`, which must not change.              |
| Skill file and folder deletion | `packages/ui/src/contracts/app-management.ts`, `packages/ui/src/implementation/dashboard/skill-{editor,workspace}.tsx`                                                                                                                                                                                                                                                                                                                                                         | Product addition shipped to production. Deletes reviewed skill files without deploying the working revision.                                                                                                                     |
| Delta scenarios                | `e2e/tests/{organization-mcp-instructions,skill-file-delete,docker-release-org-instructions-upgrade,self-host-compose-candidate}.spec.ts`, their entries in `e2e/test-plan.ts`, `e2e/ci-selection.ts`, `e2e/docker-release.config.ts`                                                                                                                                                                                                                                          | Prove the two additions, the retained-data image upgrade and the Compose candidate preparer.                                                                                                                                     |
| Native drag source             | `e2e/tests/account-secret-fields.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                      | Upstream's selected-textarea drag emits neither dragstart nor drop in Chromium. Candidate for an upstream pull request.                                                                                                          |
| Multi-host OAuth               | `apps/hosted/self-host/src/{auth,implementation/{auth-options,public-origins,routes,web}}.ts`, `apps/hosted/self-host/README.md`, `apps/hosted/server/src/implementation/{auth,mcp-oauth}.ts`, `packages/mcp-auth/src/implementation/{device-authorization,oauth}.ts`, `e2e/tests/{multi-host-oauth,docker-release-multi-host-oauth}.spec.ts`, `e2e/support/{docker-release-server,managed-server}.ts`, their entries in `e2e/test-plan.ts` and `e2e/docker-release.config.ts` | Production serves two addresses (`EXECUTOR_PUBLIC_ORIGINS`): the public origin and a Tailscale origin. OAuth and MCP sign-in work on either one; unknown hosts use the canonical origin. Candidate for an upstream pull request. |
| Shifted hosted migrations      | `apps/hosted/server/src/implementation/migrations.ts`, upstream scenarios that assert `private_hosted_migrations` ids                                                                                                                                                                                                                                                                                                                                                          | Production recorded `10_org_mcp_instructions`. Effect's migrator runs only numbers above the highest recorded one, so every upstream hosted step numbered 10 or higher is recorded here one higher.                              |
| No-CI note in `AGENTS.md`      | the note at the top of `AGENTS.md`                                                                                                                                                                                                                                                                                                                                                                                                                                             | Upstream's guide assumes CI and `notes/` files this export does not have.                                                                                                                                                        |
| Production operations          | `deploy/production/**`, `docs/repository-branches.md`, our `plans/` files, `scripts/self-host/prepare-compose-candidate.py`, the first paragraph of `README.md`, `UPSTREAM.md`                                                                                                                                                                                                                                                                                                 | This repository's deployment configuration and records. Upstream has no counterpart.                                                                                                                                             |

## Rules for the delta

- A new database step for this repository's own features goes in its own
  migration journal, passed to `migrateHostedSchemas` as `additional` the way
  Executor Cloud keeps `private_cloud_migrations`. Never add one to
  `hostedProductMigrations`: upstream extends that list every release.
- Never change the id or name of a migration step production has recorded.
