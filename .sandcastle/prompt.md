# Context

You are in a checkout of UsefulSoftwareCo/executor at upstream release `{{TAG}}`.
We carry a small patch that enables the 1Password secret provider in the
self-hosted build (`apps/host-selfhost`). It no longer applies or no longer
passes verification on this release.

The patch as it applied to the previous release:

```diff
!`cat /tmp/sandcastle-input/onepassword.patch`
```

What failed:

```
!`tail -c 12000 /tmp/sandcastle-input/failure.log`
```

# Task

Re-implement the patch's intent on this release, adapting to upstream changes:

1. The self-host plugin list registers the 1Password HTTP plugin with
   service-account/SDK-only auth (`preferSdk: true`), after the default writable
   secret provider so that one stays the default.
2. `@executor-js/host-selfhost` depends on `@executor-js/plugin-onepassword`.
3. The self-host runtime packager keeps `@1password/sdk` and `@1password/sdk-core`
   external to the server bundle and copies both packages into the runtime
   image (the SDK loads its WASM from its own package directory).

If upstream renamed or moved things, follow upstream's new structure. If
upstream now ships 1Password in self-host on its own, make no changes.
Keep the diff minimal; don't touch unrelated code or upgrade dependencies.

Verify with the same checks CI runs, all of which must pass:

```
bun install
cd apps/host-selfhost && bun run typecheck && bunx vitest run src/executor-config.test.ts
```

Commit your changes (include `bun.lock` if `bun install` changed it).

# Done

When the checks pass and your work is committed, output <promise>COMPLETE</promise>.
If the task is impossible, explain why and output <promise>ABORT</promise>.
