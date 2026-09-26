#!/usr/bin/env bash
# Asks opencode (via CLIProxyAPI) to re-port the patch onto a clean upstream checkout.
# Usage: CPA_API_KEY=... scripts/agent-port.sh <executor-checkout> <tag> <failure-log>
set -euo pipefail
checkout="$1" tag="$2" failure_log="$3"
root="$(cd "$(dirname "$0")/.." && pwd)"

prompt="$(TAG="$tag" PATCH="$(cat "$root/patches/onepassword.patch")" FAILURE="$(tail -c 12000 "$failure_log")" \
  python3 -c 'import os,sys; t=open(sys.argv[1]).read(); [t:=t.replace("{{"+k+"}}",os.environ[k]) for k in ("TAG","PATCH","FAILURE")]; print(t)' \
  "$root/agent/prompt.md")"

cd "$checkout"
OPENCODE_CONFIG="$root/agent/opencode.json" bunx --bun opencode-ai@1.18.32 run "$prompt" | tee /tmp/agent.log
grep -q '^RESULT: ported' /tmp/agent.log
