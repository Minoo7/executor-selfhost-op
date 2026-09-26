# executor-selfhost-op

[Executor](https://github.com/UsefulSoftwareCo/executor) self-host image with the 1Password secret provider enabled (service-account auth).

Daily, the Depot CI workflow `.depot/workflows/build.yml` applies `patches/onepassword.patch` to the latest upstream release, verifies it, and builds with Depot, publishing `4z8l73c27s.registry.depot.dev/executor-selfhost:<version>-op` and `:latest` (linux/arm64).

If the patch fails, a [Sandcastle](https://github.com/mattpocock/sandcastle) Codex agent re-ports it inside a Docker sandbox. Codex talks to CLIProxyAPI at `cpa.planasolutions.ai`; Depot CI jobs join the tailnet as `tag:depot-runner`, which the ACL allows to the shared node on 443. When verify and the image build pass, it opens a `port/<version>` PR; merging it publishes the image. Otherwise the run fails and pushes a `port-failed/<version>` marker branch; delete it to retry.

Depot CI secrets: `CPA_API_KEY` (CLIProxyAPI client key) and the org-wide `DEPOT_API_KEY`.
