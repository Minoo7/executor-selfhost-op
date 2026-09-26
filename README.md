# executor-selfhost-op

[Executor](https://github.com/UsefulSoftwareCo/executor) self-host image with the 1Password secret provider enabled (service-account auth).

Daily, `build.yml` applies `patches/onepassword.patch` to the latest upstream release, verifies it, and publishes `ghcr.io/minoo7/executor-selfhost:<version>-op` and `:latest`.

If the patch fails, a [Sandcastle](https://github.com/mattpocock/sandcastle) agent re-ports it inside a Docker sandbox. When verify and the image build pass, it opens a `port/<version>` PR; merging it publishes the image. Otherwise it opens a `Port failed: <tag>` issue.

Needs repo secret `CLAUDE_CODE_OAUTH_TOKEN` (`claude setup-token`).
