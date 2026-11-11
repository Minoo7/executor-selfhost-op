import { expect, it } from "@effect/vitest";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { Config, Effect, FileSystem, Schedule, Schema, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { driver } from "../support/platform.ts";

const Instructions = Schema.Struct({ additions: Schema.String, revision: Schema.NonEmptyString });
const Stored = Schema.Struct({
  table: Schema.Boolean,
  journal: Schema.Array(Schema.Struct({ migration_id: Schema.Number, name: Schema.String })),
  rows: Schema.Array(
    Schema.Struct({
      organization_id: Schema.String,
      additions: Schema.String,
      revision: Schema.String,
    }),
  ),
});

const fixture = Effect.gen(function* () {
  const image = yield* Config.NonEmptyString("EXECUTOR_E2E_DOCKER_IMAGE");
  const baseline = yield* Config.NonEmptyString(
    "EXECUTOR_E2E_DOCKER_ORG_INSTRUCTIONS_BASELINE_IMAGE",
  );
  const stock = yield* Config.NonEmptyString("EXECUTOR_E2E_DOCKER_ORG_INSTRUCTIONS_STOCK_IMAGE");
  expect(new Set([image, baseline, stock]).size, "three distinct image references").toBe(3);
  const fs = yield* FileSystem.FileSystem;
  const root = yield* fs.makeTempDirectoryScoped({ prefix: "executor-org-upgrade-" });
  const data = `${root}/data`;
  yield* fs.makeDirectory(data);
  const processes = yield* ChildProcessSpawner.ChildProcessSpawner;
  const output = (command: ChildProcess.Command, includeStderr = false) =>
    Effect.scoped(
      Effect.gen(function* () {
        const child = yield* processes.spawn(command);
        const [stdout, stderr, code] = yield* Effect.all(
          [
            child.stdout.pipe(Stream.decodeText(), Stream.mkString),
            child.stderr.pipe(Stream.decodeText(), Stream.mkString),
            child.exitCode,
          ],
          { concurrency: "unbounded" },
        );
        expect(code, stderr).toBe(0);
        return includeStderr ? stdout + stderr : stdout;
      }),
    );
  const run = (args: readonly string[], env: Record<string, string> = {}) =>
    output(
      ChildProcess.make("docker", args, { env, extendEnv: true, stderr: "pipe" }),
      args[0] === "logs",
    );
  const id = `executor-org-upgrade-${randomBytes(8).toString("hex")}`;
  const port = yield* driver(
    "allocate upgrade port",
    () =>
      new Promise<number>((resolve, reject) => {
        const listener = createServer();
        listener.once("error", reject);
        listener.listen(0, "127.0.0.1", () => {
          const address = listener.address();
          listener.close(() =>
            address === null || typeof address === "string"
              ? reject(new Error("No test port"))
              : resolve(address.port),
          );
        });
      }),
  );
  const origin = `http://localhost:${port}`;
  const environment = {
    DO_NOT_TRACK: "1",
    PORT: "8080",
    EXECUTOR_MOTEL_DATA_DIR: "/tmp/executor-motel-data",
    BETTER_AUTH_URL: origin,
    BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
    EXECUTOR_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
  };
  // Match the nonroot runner so stopped bind data remains readable without chown.
  const user = `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`;
  const containerArgs = (directory: string) => [
    "--user",
    user,
    "--volume",
    `${directory}:/app/data`,
    ...Object.keys(environment).flatMap((name) => ["--env", name]),
  ];
  let container: { image: string; directory: string } | undefined;
  yield* Effect.addFinalizer(() =>
    container === undefined
      ? Effect.void
      : run(["rm", "--force", "--volumes", id]).pipe(Effect.orDie),
  );
  let cookie = "";
  let organization = "";
  const request = (route: string, method = "GET", body?: unknown) =>
    driver(`${method} upgrade fixture ${route}`, (signal) =>
      fetch(`http://127.0.0.1:${port}${route}`, {
        method,
        signal,
        headers: {
          origin,
          "content-type": "application/json",
          ...(cookie === "" ? {} : { cookie }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    );
  const json = <S extends Schema.Top>(schema: S, route: string, method = "GET", body?: unknown) =>
    request(route, method, body).pipe(
      Effect.flatMap((response) => {
        expect(response.status, `${method} ${route}`).toBe(200);
        return driver("read fixture response", () => response.json()).pipe(
          Effect.flatMap(Schema.decodeUnknownEffect(schema)),
        );
      }),
    );
  const credentials = {
    email: "org-upgrade@example.test",
    password: "Synthetic-upgrade-password-123!",
  };
  const authenticate = (setup: boolean) =>
    Effect.gen(function* () {
      if (setup || cookie === "") {
        cookie = "";
        const response = yield* request(
          setup ? "/api/auth/self-host/setup" : "/api/auth/sign-in/email",
          "POST",
          setup
            ? { ...credentials, name: "Upgrade Owner", organizationName: "Upgrade lab" }
            : credentials,
        );
        expect(response.status, "synthetic owner login").toBe(200);
        cookie = response.headers
          .getSetCookie()
          .map((value) => value.split(";")[0])
          .join("; ");
        expect(cookie.length).toBeGreaterThan(0);
      }
      const [ownerOrganization] = yield* json(
        Schema.NonEmptyArray(Schema.Struct({ id: Schema.String })),
        "/api/auth/organization/list",
      );
      if (organization !== "") expect(ownerOrganization.id).toBe(organization);
      organization = ownerOrganization.id;
    });
  const start = (tag: string, directory = data) =>
    Effect.gen(function* () {
      expect(container, "stop the previous writer before starting another engine").toBeUndefined();
      yield* run(
        [
          "run",
          "--pull=never",
          "--detach",
          "--name",
          id,
          "--init",
          "--publish",
          `127.0.0.1:${port}:8080`,
          ...containerArgs(directory),
          tag,
        ],
        environment,
      );
      container = { image: tag, directory };
    });
  const ready = request("/health").pipe(
    Effect.flatMap((response) =>
      response.status === 200 ? Effect.void : Effect.fail("not ready"),
    ),
    Effect.retry({ schedule: Schedule.spaced("250 millis"), times: 240 }),
  );
  const stop = () =>
    Effect.gen(function* () {
      expect(container).toBeDefined();
      yield* run(["stop", "--time", "15", id]);
      yield* run(["rm", "--volumes", id]);
      container = undefined;
    });
  const boot = (tag: string, setup = false, directory = data) =>
    start(tag, directory).pipe(Effect.andThen(ready), Effect.andThen(authenticate(setup)));
  const read = () => json(Instructions, `/api/organizations/${organization}/mcp-instructions`);
  const save = (additions: string, expectedRevision: string | null = null) =>
    json(Instructions, `/api/organizations/${organization}/mcp-instructions`, "PUT", {
      additions,
      expectedRevision,
    });
  const snapshot = (name: string, directory = data) =>
    Effect.gen(function* () {
      expect(container, "snapshots require a stopped writer").toBeUndefined();
      const copy = `${root}/${name}`;
      yield* fs.copy(directory, copy);
      return copy;
    });
  const exported = (tag: string, directory: string) =>
    Effect.gen(function* () {
      expect(container, "exports require a stopped writer").toBeUndefined();
      const command = yield* run([
        "image",
        "inspect",
        "--format",
        "{{json .Config.Cmd}}",
        tag,
      ]).pipe(
        Effect.flatMap(
          Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Array(Schema.String))),
        ),
      );
      if (command[0] !== "executor-host") return undefined;
      const name = `inspection-${randomBytes(8).toString("hex")}.tar`;
      yield* run(
        [
          "run",
          "--pull=never",
          "--rm",
          ...containerArgs(directory),
          tag,
          "executor-host",
          "export",
          `/app/data/${name}`,
        ],
        environment,
      );
      return `${directory}/${name}`;
    });
  // Like docker-release.spec.ts, this uses the public PGlite adapter on a stopped export.
  const pglite = (directory: string, archive: string | undefined, sql: string, restore = false) =>
    output(
      ChildProcess.make(
        "node",
        [
          "--input-type=module",
          "--eval",
          `
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const [directory, archive, sql, restore] = process.argv.slice(1);
const pg = new PGlite(archive === '' ? directory + '/hosted.pglite' : {
  ...(restore === 'true' ? { dataDir: directory + '/hosted.pglite' } : {}),
  loadDataDir: new Blob([readFileSync(archive)])
});
try {
  await pg.waitReady;
  await pg.exec(sql);
  const journal = await pg.query('SELECT migration_id, name FROM private_hosted_migrations WHERE migration_id = 10');
  const table = await pg.query("SELECT to_regclass('hosted_org_mcp_instructions') AS name");
  const rows = table.rows[0].name === null ? [] : (await pg.query('SELECT organization_id, additions, revision FROM hosted_org_mcp_instructions')).rows;
  process.stdout.write(JSON.stringify({ table: table.rows[0].name !== null, journal: journal.rows, rows }));
} finally { await pg.close(); }
`,
          directory,
          archive ?? "",
          sql,
          String(restore),
        ],
        { extendEnv: true },
      ),
    ).pipe(Effect.flatMap(Schema.decodeUnknownEffect(Schema.fromJsonString(Stored))));
  const inspect = (tag: string, directory = data) =>
    Effect.gen(function* () {
      const archive = yield* exported(tag, directory);
      const stored = yield* pglite(directory, archive, "");
      if (archive !== undefined) yield* fs.remove(archive);
      return stored;
    });
  const retained = (stored: typeof Stored.Type, instructions: typeof Instructions.Type) => {
    expect(stored.table).toBe(true);
    expect(stored.journal).toEqual([{ migration_id: 10, name: "org_mcp_instructions" }]);
    expect(stored.rows).toEqual([{ organization_id: organization, ...instructions }]);
  };
  return {
    image,
    baseline,
    stock,
    data,
    start,
    boot,
    stop,
    read,
    save,
    request,
    snapshot,
    inspect,
    retained,
    exported,
    pglite,
    fs,
    run,
    id,
    missingInstructions: () => request(`/api/organizations/${organization}/mcp-instructions`),
  };
});

it.live("org instructions retained 1677 upgrade repeat stock rollback and forward retry", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const f = yield* fixture;
      yield* f.boot(f.baseline, true);
      const saved = yield* f.save(
        "Retain this synthetic organization guidance exactly.\nSecond line.",
      );
      expect(saved.additions).toBe(
        "Retain this synthetic organization guidance exactly.\nSecond line.",
      );
      yield* f.stop();
      f.retained(yield* f.inspect(f.baseline), saved);
      for (const tag of [f.image, f.image, f.stock, f.image]) {
        yield* f.boot(tag);
        if (tag === f.stock) expect((yield* f.missingInstructions()).status).toBe(404);
        else expect(yield* f.read()).toEqual(saved);
        yield* f.stop();
        f.retained(yield* f.inspect(tag), saved);
      }
    }),
  ).pipe(Effect.provide(NodeServices.layer)),
);

it.live("org instructions restores a full stopped snapshot on the old image", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const f = yield* fixture;
      yield* f.boot(f.baseline, true);
      const saved = yield* f.save("Restore the old image's full stopped snapshot.");
      yield* f.stop();
      const restored = yield* f.snapshot("restored");
      yield* f.boot(f.image);
      expect(yield* f.read()).toEqual(saved);
      const changed = yield* f.save("Written after the snapshot.", saved.revision);
      expect(changed.revision).not.toBe(saved.revision);
      expect(changed.additions).toBe("Written after the snapshot.");
      yield* f.stop();
      yield* f.boot(f.baseline, false, restored);
      expect(yield* f.read()).toEqual(saved);
      yield* f.stop();
      f.retained(yield* f.inspect(f.baseline, restored), saved);
    }),
  ).pipe(Effect.provide(NodeServices.layer)),
);

it.live("org instructions fresh stock applies step 10 once and retains a new save", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const f = yield* fixture;
      yield* f.boot(f.stock, true);
      yield* f.stop();
      const before = yield* f.inspect(f.stock);
      expect(before.table).toBe(false);
      expect(before.journal).toEqual([]);
      expect(before.rows).toEqual([]);
      yield* f.boot(f.image);
      const saved = yield* f.save("Written after the stock upgrade.");
      expect(saved.additions).toBe("Written after the stock upgrade.");
      yield* f.stop();
      f.retained(yield* f.inspect(f.image), saved);
      yield* f.boot(f.image);
      expect(yield* f.read()).toEqual(saved);
      yield* f.stop();
      f.retained(yield* f.inspect(f.image), saved);
    }),
  ).pipe(Effect.provide(NodeServices.layer)),
);

it.live("org instructions refuses a divergent migration identity on a synthetic copy", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const f = yield* fixture;
      yield* f.boot(f.baseline, true);
      const saved = yield* f.save("Keep the original row when the journal is unsupported.");
      yield* f.stop();
      const copy = yield* f.snapshot("divergent");
      const archive = yield* f.exported(f.baseline, copy);
      if (archive !== undefined) {
        yield* f.fs.remove(`${copy}/hosted.pglite`, { recursive: true, force: true });
        yield* f.fs.remove(`${copy}/product`, { recursive: true, force: true });
      }
      const wrong = yield* f.pglite(
        copy,
        archive,
        "UPDATE private_hosted_migrations SET name = 'e2e_wrong_identity' WHERE migration_id = 10",
        true,
      );
      expect(wrong.journal).toEqual([{ migration_id: 10, name: "e2e_wrong_identity" }]);
      yield* f.start(f.image, copy);
      const refused = yield* f.request("/health").pipe(
        Effect.tap((response) =>
          driver("read refused startup response", () => response.arrayBuffer()),
        ),
        Effect.tap(() =>
          f.run(["logs", f.id]).pipe(
            Effect.filterOrFail(
              (logs) => logs.includes("Executor product storage could not open"),
              () => "Product storage refusal has not been observed",
            ),
          ),
        ),
        Effect.retry({ schedule: Schedule.spaced("250 millis"), times: 240 }),
      );
      expect(refused.status).toBeGreaterThanOrEqual(500);
      expect(yield* f.run(["logs", f.id])).toContain("Executor product storage could not open");
      yield* f.stop();
      expect(yield* f.inspect(f.image, copy)).toEqual(wrong);
      f.retained(yield* f.inspect(f.baseline), saved);
      yield* f.boot(f.image);
      expect(yield* f.read()).toEqual(saved);
      yield* f.stop();
    }),
  ).pipe(Effect.provide(NodeServices.layer)),
);
