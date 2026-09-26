import { run, claudeCode } from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";

const [checkout, tag] = process.argv.slice(2);
if (!checkout || !tag) throw new Error("usage: fix.mts <executor-checkout> <tag>");

const result = await run({
  agent: claudeCode("claude-opus-5-5", { effort: "high" }),
  sandbox: docker({
    imageName: "sandcastle-executor:ci",
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
