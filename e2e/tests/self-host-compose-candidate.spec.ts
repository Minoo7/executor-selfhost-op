import { expect, it } from "@effect/vitest";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { Effect, FileSystem, Path, Schema, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import { createHash, randomUUID } from "node:crypto";

const oldImage = "executor-old:reviewed";
const newImage = `registry.example/executor@sha256:${"a".repeat(64)}`;
const hash = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const Receipt = Schema.Struct({
  schema: Schema.Literal(1),
  tool_sha256: Schema.String,
  source_sha256: Schema.String,
  candidate_sha256: Schema.String,
  service: Schema.Literal("executor"),
  byte_range: Schema.Tuple([Schema.Number, Schema.Number]),
});
const fixture = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* fs.realPath(
    yield* fs.makeTempDirectoryScoped({ prefix: "executor-compose-" }),
  );
  const project = path.join(root, "project");
  const outputDirectory = path.join(root, "candidate");
  yield* fs.makeDirectory(project, { mode: 0o700 });
  yield* fs.makeDirectory(outputDirectory, { mode: 0o700 });
  const canary = `private-${randomUUID()}`;
  yield* fs.writeFileString(path.join(project, ".env"), `SYNTHETIC_SECRET=${canary}\n`, {
    mode: 0o600,
  });
  const processes = yield* ChildProcessSpawner.ChildProcessSpawner;
  const execute = (command: string, args: readonly string[]) =>
    Effect.scoped(
      Effect.gen(function* () {
        const child = yield* processes.spawn(
          ChildProcess.make(command, args, {
            env: { DOCKER_HOST: "unix:///nonexistent-executor-compose-test" },
            extendEnv: true,
            stderr: "pipe",
          }),
        );
        const [stdout, stderr, status] = yield* Effect.all(
          [
            child.stdout.pipe(Stream.decodeText(), Stream.mkString),
            child.stderr.pipe(Stream.decodeText(), Stream.mkString),
            child.exitCode,
          ],
          { concurrency: "unbounded" },
        );
        return { stdout, stderr, status };
      }),
    );
  return {
    fs,
    path,
    execute,
    root,
    project,
    outputDirectory,
    canary,
    script: path.resolve("scripts/self-host/prepare-compose-candidate.py"),
    source: path.join(project, "compose.yml"),
    output: path.join(outputDirectory, "candidate.yml"),
  };
});
const argumentsFor = (f: Effect.Success<typeof fixture>, content: string) => [
  "-I",
  f.script,
  "--source",
  f.source,
  "--source-sha256",
  hash(content),
  "--project-directory",
  f.project,
  "--project-name",
  "executor-synthetic",
  "--old-image",
  oldImage,
  "--new-image",
  newImage,
  "--output",
  f.output,
];
const content = `services:\n  executor:\n    image: ${oldImage} # reviewed\n    environment:\n      SECRET: \${SYNTHETIC_SECRET:?missing}\n    volumes:\n      - ./data:/app/data\n    network_mode: service:tailscale\n  tailscale:\n    image: tailscale/tailscale:stable\n    command: ["version"]\n`;

it.live("Compose candidate preserves reviewed bytes and the original resolution context", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const f = yield* fixture;
      const { fs, execute, path } = f;
      const original = content.replaceAll("\n", "\r\n");
      yield* fs.writeFileString(f.source, original, { mode: 0o600 });
      const before = yield* fs.stat(f.source);
      const prepared = yield* execute("python3", argumentsFor(f, original));
      expect(prepared.status, prepared.stdout + prepared.stderr).toBe(0);
      const candidate = yield* fs.readFile(f.output);
      const receiptText = yield* fs.readFileString(`${f.output}.receipt.json`);
      const receipt = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Receipt))(
        receiptText,
      );
      expect(Buffer.from(candidate).toString()).toBe(original.replace(oldImage, newImage));
      expect(receipt.source_sha256).toBe(hash(original));
      expect(receipt.tool_sha256).toBe(hash(yield* fs.readFile(f.script)));
      expect(receipt.candidate_sha256).toBe(hash(candidate));
      const [start, end] = receipt.byte_range;
      expect(Buffer.from(original).subarray(start, end).toString()).toBe(oldImage);
      expect(prepared.stdout).toBe(`PREPARED ${hash(candidate)}\n`);
      expect(prepared.stderr).toBe("");
      for (const output of [prepared.stdout, prepared.stderr, receiptText])
        expect(output).not.toContain(f.canary);
      for (const path of [f.output, `${f.output}.receipt.json`]) {
        expect((yield* fs.stat(path)).mode & 0o777).toBe(0o600);
      }
      const after = yield* fs.stat(f.source);
      expect([after.ino, after.mtime, after.size]).toEqual([before.ino, before.mtime, before.size]);
      expect(yield* fs.readFileString(f.source)).toBe(original);
      const compose = yield* execute("docker", [
        "compose",
        "--project-directory",
        f.project,
        "-p",
        "executor-synthetic",
        "-f",
        f.output,
        "config",
        "--format",
        "json",
      ]);
      expect(compose.status, compose.stderr).toBe(0);
      expect(compose.stdout).toContain(f.canary);
      expect(compose.stdout).toContain(newImage);
      expect(compose.stdout).toContain(path.join(f.project, "data"));
    }).pipe(Effect.provide(NodeServices.layer)),
  ),
);

it.live("Compose candidate refuses ambiguous syntax and preserves private diagnostics", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const f = yield* fixture;
      const { fs, execute } = f;
      const cases = [
        { source: content.replace(oldImage, `"${oldImage}"`), reason: "AMBIGUOUS_MATCH" },
        { source: content + `# ${oldImage}\n`, reason: "AMBIGUOUS_MATCH" },
        { source: content.replace(oldImage, "${IMAGE}"), reason: "AMBIGUOUS_MATCH" },
        { source: `include: missing.yml\n${content}`, reason: "UNSUPPORTED_COMPOSE" },
        {
          source: content.replace("    image:", "    extends: missing.yml\n    image:"),
          reason: "UNSUPPORTED_COMPOSE",
        },
        { source: `"incl\\u0075de": missing.yml\n${content}`, reason: "UNSUPPORTED_COMPOSE" },
        {
          source: content.replace(
            "SECRET: ${SYNTHETIC_SECRET:?missing}",
            `SECRET: \${MISSING:?${f.canary}}`,
          ),
          reason: "COMPOSE_FAILED",
        },
        {
          source: content.replace("    environment:", "    image: another:tag\n    environment:"),
          reason: "COMPOSE_FAILED",
        },
        {
          source: `x-base: &base\n  image: ${oldImage}\nservices:\n  executor:\n    <<: *base\n  neighbour:\n    <<: *base\n`,
          reason: "SEMANTIC_DELTA",
        },
        {
          source: `services:\n  executor: &exec\n    image: ${oldImage}\n  neighbour:\n    <<: *exec\n    profiles: [off]\n`,
          reason: "SEMANTIC_DELTA",
        },
      ];
      for (const item of cases) {
        yield* fs.writeFileString(f.source, item.source, { mode: 0o600 });
        const result = yield* execute("python3", argumentsFor(f, item.source));
        expect(result.status).toBe(10);
        expect(result.stdout).toBe(`REFUSED ${item.reason}\n`);
        expect(result.stderr).toBe("");
        expect(result.stdout).not.toContain(f.canary);
        expect(yield* fs.readFileString(f.source)).toBe(item.source);
        expect(yield* fs.exists(f.output)).toBe(false);
        expect(yield* fs.exists(`${f.output}.receipt.json`)).toBe(false);
      }
    }).pipe(Effect.provide(NodeServices.layer)),
  ),
);

it.live("Compose candidate refuses drift collisions symlinks and mutable image tags", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const f = yield* fixture;
      const { fs, execute, path } = f;
      yield* fs.writeFileString(f.source, content, { mode: 0o600 });
      const args = argumentsFor(f, content);
      for (const { flag, value, reason } of [
        { flag: "--source-sha256", value: "b".repeat(64), reason: "SOURCE_DRIFT" },
        {
          flag: "--new-image",
          value: "registry.example/executor:latest",
          reason: "INVALID_REFERENCE",
        },
        {
          flag: "--new-image",
          value: `registry.example/executor:tag@sha256:${"a".repeat(64)}`,
          reason: "INVALID_REFERENCE",
        },
        { flag: "--output", value: f.source, reason: "OUTPUT_UNSAFE" },
      ]) {
        const changed = [...args];
        const index = changed.indexOf(flag) + 1;
        changed[index] = value;
        const result = yield* execute("python3", changed);
        expect(result.stdout).toBe(`REFUSED ${reason}\n`);
        expect(result.status).toBe(10);
        expect(yield* fs.exists(f.output)).toBe(false);
        expect(yield* fs.exists(`${f.output}.receipt.json`)).toBe(false);
      }
      yield* fs.writeFileString(f.output, "keep", { mode: 0o600 });
      expect((yield* execute("python3", args)).stdout).toBe("REFUSED OUTPUT_UNSAFE\n");
      expect(yield* fs.readFileString(f.output)).toBe("keep");
      yield* fs.remove(f.output);
      yield* fs.symlink(path.join(f.root, "missing"), f.output);
      expect((yield* execute("python3", args)).stdout).toBe("REFUSED OUTPUT_UNSAFE\n");
      yield* fs.remove(f.output);
      yield* fs.writeFileString(`${f.output}.receipt.json`, "keep receipt", { mode: 0o600 });
      expect((yield* execute("python3", args)).stdout).toBe("REFUSED OUTPUT_UNSAFE\n");
      expect(yield* fs.readFileString(`${f.output}.receipt.json`)).toBe("keep receipt");
      yield* fs.remove(`${f.output}.receipt.json`);
      yield* fs.chmod(f.outputDirectory, 0o755);
      expect((yield* execute("python3", args)).stdout).toBe("REFUSED OUTPUT_UNSAFE\n");
      yield* fs.chmod(f.outputDirectory, 0o700);
      yield* fs.rename(f.source, `${f.source}.original`);
      yield* fs.symlink(`${f.source}.original`, f.source);
      expect((yield* execute("python3", args)).stdout).toBe("REFUSED SOURCE_UNSAFE\n");
      expect(yield* fs.readFileString(f.source)).toBe(content);
    }).pipe(Effect.provide(NodeServices.layer)),
  ),
);
