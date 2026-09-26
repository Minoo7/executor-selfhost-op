#!/usr/bin/env bash
# Checks an upstream checkout that has the 1Password patch applied.
# Usage: scripts/verify.sh <executor-checkout>
set -euo pipefail
cd "$1"

bun install
grep -q 'onepasswordHttpPlugin(' apps/host-selfhost/executor.config.ts
grep -q '"@1password/sdk"' apps/host-selfhost/scripts/package-runtime.ts
cd apps/host-selfhost
bun run typecheck
bunx vitest run src/executor-config.test.ts
