import { run, codex } from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";

const [checkout, tag] = process.argv.slice(2);
if (!checkout || !tag) throw new Error("usage: fix.mts <executor-checkout> <tag>");
const cpaApiKey = process.env.CPA_API_KEY;
if (!cpaApiKey) throw new Error("CPA_API_KEY is not set");

const result = await run({
  agent: codex("gpt-6-sol", { effort: "high", captureSessions: false }),
  sandbox: docker({
    imageName: "sandcastle-executor:ci",
    env: { CPA_API_KEY: cpaApiKey },
    mounts: [{ hostPath: "/tmp/sandcastle-input", sandboxPath: "/tmp/sandcastle-input" }],
  }),
  cwd: checkout,
  branchStrategy: { type: "head" },
  promptFile: new URL("./prompt.md", import.meta.url).pathname,
  promptArgs: { TAG: tag },
  maxIterations: 3,
  completionSignal: ["<promise>COMPLETE</promise>", "<promise>ABORT</promise>"],
  logging: { type: "stdout" },
});

console.log(`signal=${result.completionSignal} commits=${result.commits.length}`);
if (result.completionSignal !== "<promise>COMPLETE</promise>") process.exit(1);
