import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: [
      "e2e/tests/docker-release.spec.ts",
      "e2e/tests/self-host-compose-candidate.spec.ts",
      "e2e/tests/docker-release-app-memory.spec.ts",
      "e2e/tests/docker-release-credential-handles.spec.ts",
      "e2e/tests/docker-release-executor-api.spec.ts",
      // Ordinary release runs do not have the two historical images.
      ...(process.env.EXECUTOR_E2E_DOCKER_ORG_INSTRUCTIONS_BASELINE_IMAGE === undefined &&
      process.env.EXECUTOR_E2E_DOCKER_ORG_INSTRUCTIONS_STOCK_IMAGE === undefined
        ? []
        : ["e2e/tests/docker-release-org-instructions-upgrade.spec.ts"]),
      "e2e/tests/docker-release-workflow-memory.spec.ts",
      "e2e/tests/docker-release-workflow-restart.spec.ts",
      "e2e/tests/docker-release-workflow-stopped.spec.ts",
      "e2e/tests/docker-oauth-renewal.spec.ts",
      "e2e/tests/workflow-engine.spec.ts",
    ],
    testTimeout: 180_000,
  },
});
