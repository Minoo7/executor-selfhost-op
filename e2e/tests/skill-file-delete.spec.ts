import { expect, layer } from "@effect/vitest";
import { Effect, Schedule, Schema } from "effect";
import { Actors } from "../support/actors.ts";
import { Api, body } from "../support/api.ts";
import { Workspace } from "../support/app-authoring.ts";
import { appsManifest } from "../support/apps-release.ts";
import { Browser } from "../support/browser.ts";
import { HostedLive, withHostedCase } from "../support/case.ts";
import { App } from "../support/contracts.ts";
import { scenarios } from "../test-plan.ts";

const skill = (name: string) => ({
  path: `skills/${name}/SKILL.md`,
  content: `---\nname: ${name}\ndescription: Exercise skill deletion.\n---\n\n# ${name}\n`,
});
const reference = "skills/remove/references/note.md";
const files = [
  {
    path: "index.ts",
    content: 'import { defineApp } from "apps"; export default defineApp({}, async () => ({}));',
  },
  skill("remove"),
  { path: reference, content: "Original reference.\n" },
  { path: "skills/remove/examples/nested/example.txt", content: "Nested example.\n" },
  skill("remove-other"),
  skill("keep"),
  appsManifest,
];
const Running = Schema.Struct({
  sourceCommit: Schema.NullOr(Schema.String),
  files: Workspace.fields.files,
});

layer(HostedLive, { excludeTestServices: true })("Skill file deletion", (it) => {
  it.effect(scenarios.skillFileDelete.title, (context) =>
    withHostedCase(
      context,
      Effect.gen(function* () {
        const api = yield* Api,
          actors = yield* Actors,
          browser = yield* Browser;
        const prefix = `/api/organizations/${actors.organization.id}/apps`;
        const deployed = yield* api.request(actors.owner, "POST", `${prefix}/deploy`, {
          name: "Skill deletion fixture",
          files,
        });
        expect(deployed.status).toBe(200);
        const app = yield* body(App, deployed);
        const path = `${prefix}/${app.id}`;
        yield* Effect.addFinalizer(() =>
          api.request(actors.owner, "DELETE", path).pipe(
            Effect.tap((response) => Effect.sync(() => expect(response.status).toBe(200))),
            Effect.orDie,
          ),
        );
        const workspace = () =>
          Effect.flatMap(api.request(actors.owner, "GET", `${path}/workspace`), (response) =>
            body(Workspace, response),
          );
        const deployedSource = (commit: string) =>
          api.request(actors.owner, "GET", `${path}/source`).pipe(
            Effect.flatMap((response) => body(Running, response)),
            Effect.filterOrFail(
              (source) => source.sourceCommit === commit,
              () => new Error("The deletion commit is not deployed yet"),
            ),
            Effect.retry({ schedule: Schedule.spaced("250 millis"), times: 80 }),
          );
        const remove = (action: "Delete file" | "Delete skill", accept: boolean) =>
          browser.use(`${accept ? "Confirm" : "Cancel"} ${action}`, (page) =>
            page
              .getByRole("button", { name: "Editor settings", exact: true })
              .click()
              .then(() => {
                const messages: string[] = [];
                page.once("dialog", (dialog) => {
                  messages.push(dialog.message());
                  void (accept ? dialog.accept() : dialog.dismiss());
                });
                return page
                  .getByRole("menuitem", { name: action, exact: true })
                  .click()
                  .then(() => {
                    expect(messages).toEqual([
                      action === "Delete file"
                        ? "Delete note.md?"
                        : "Delete the remove skill and all its files?",
                    ]);
                  });
              }),
          );
        const url = `/org/${actors.organization.slug}/apps/${app.id}?view=skills`;
        const openReference = browser.use("Open the skill reference", (page) =>
          page
            .goto(url)
            .then(() =>
              page
                .getByRole("group", { name: "remove", exact: true })
                .getByRole("button", { name: "references/note.md", exact: true })
                .click(),
            )
            .then(() => page.getByRole("textbox", { name: "Edit note.md", exact: true }).waitFor()),
        );

        yield* browser.login(actors.owner);
        yield* openReference;
        const original = yield* workspace();
        yield* remove("Delete file", false);
        expect(yield* workspace()).toEqual(original);

        const concurrent = yield* api.request(actors.owner, "POST", `${path}/commits`, {
          expected: original.revision.commit,
          files: original.files.map((file) =>
            file.path === reference ? { ...file, content: "Changed reference.\n" } : file,
          ),
          message: "Change reference before deletion",
        });
        expect(concurrent.status).toBe(200);
        const changed = yield* workspace();
        yield* remove("Delete file", true);
        yield* browser.use("Reject deletion of a changed file", (page) =>
          page.getByRole("alert").filter({ hasText: "Someone else changed this file" }).waitFor(),
        );
        expect(yield* workspace()).toEqual(changed);

        yield* openReference;
        yield* remove("Delete file", true);
        yield* browser.use("The deleted reference leaves the file list", (page) =>
          page
            .getByRole("group", { name: "remove", exact: true })
            .getByRole("button", { name: "references/note.md", exact: true })
            .waitFor({ state: "hidden" }),
        );
        const deleted = yield* workspace().pipe(
          Effect.filterOrFail(
            (source) => !source.files.some((file) => file.path === reference),
            () => new Error("The confirmed file deletion is not committed yet"),
          ),
          Effect.retry({ schedule: Schedule.spaced("250 millis"), times: 80 }),
        );
        expect(deleted.files).toEqual(changed.files.filter((file) => file.path !== reference));
        expect((yield* deployedSource(deleted.revision.commit)).files).toEqual(deleted.files);

        yield* browser.use("Open the skill instructions", (page) =>
          page
            .getByRole("group", { name: "remove", exact: true })
            .getByRole("button", { name: "Instructions", exact: true })
            .click(),
        );
        yield* remove("Delete skill", false);
        expect(yield* workspace()).toEqual(deleted);
        yield* remove("Delete skill", true);
        yield* browser.use("The deleted skill leaves the file list", (page) =>
          page.getByRole("group", { name: "remove", exact: true }).waitFor({ state: "hidden" }),
        );
        const removed = yield* workspace().pipe(
          Effect.filterOrFail(
            (source) => !source.files.some((file) => file.path.startsWith("skills/remove/")),
            () => new Error("The confirmed skill deletion is not committed yet"),
          ),
          Effect.retry({ schedule: Schedule.spaced("250 millis"), times: 80 }),
        );
        expect(removed.files).toEqual(
          deleted.files.filter((file) => !file.path.startsWith("skills/remove/")),
        );
        expect((yield* deployedSource(removed.revision.commit)).files).toEqual(removed.files);
        expect(removed.files.some((file) => file.path === "skills/remove-other/SKILL.md")).toBe(
          true,
        );
        expect(removed.files.some((file) => file.path === "skills/keep/SKILL.md")).toBe(true);
      }),
    ),
  );
});
