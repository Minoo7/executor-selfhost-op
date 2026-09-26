# executor-selfhost-op

[Executor](https://github.com/UsefulSoftwareCo/executor) self-host image with the 1Password secret provider enabled (service-account auth).

Daily, `build.yml` applies `patches/onepassword.patch` to the latest upstream release, verifies it, and publishes `ghcr.io/minoo7/executor-selfhost:<version>-op` and `:latest`.

If the patch fails, a [Sandcastle](https://github.com/mattpocock/sandcastle) Codex agent re-ports it inside a Docker sandbox. Codex talks to CLIProxyAPI at `cpa.planasolutions.ai`; the runner reaches it by joining the tailnet as `tag:executor-ci` (GitHub OIDC federated identity, main branch only; the ACL allows only the shared node on 443). When verify and the image build pass, it opens a `port/<version>` PR; merging it publishes the image. Otherwise it opens a `Port failed: <tag>` issue.

Needs repo secret `CPA_API_KEY` (a CLIProxyAPI client key).
