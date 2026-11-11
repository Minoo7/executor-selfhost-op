import { expect, layer } from "@effect/vitest";
import { Effect, Schema } from "effect";
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
        const access = yield* body(
          Schema.Struct({ revision: Schema.String }),
          yield* api.request(actors.owner, "GET", `${path}/access`),
        );
        expect(
          (yield* api.request(actors.owner, "PATCH", `${path}/access`, {
            revision: access.revision,
            audience: { kind: "everyone" },
          })).status,
        ).toBe(200);

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
        const running = () =>
          api
            .request(actors.owner, "GET", `${path}/source`)
            .pipe(Effect.flatMap((response) => body(Running, response)));
        const openRemoval = (action: "Delete file" | "Delete skill") =>
          browser.use(`Review ${action}`, (page) =>
            page.getByRole("button", { name: action, exact: true }).click(),
          );
        const confirm = (action: "Delete file" | "Delete skill") =>
          browser.use(`Confirm ${action}`, (page) =>
            page.getByRole("dialog").getByRole("button", { name: action, exact: true }).click(),
          );
        const cancel = browser.use("Cancel review", (page) =>
          page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click(),
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
        const active = yield* running();
        yield* openRemoval("Delete file");
        yield* cancel;
        expect(yield* workspace()).toEqual(original);
        yield* browser.use("Keep a dirty draft", (page) =>
          page.getByRole("textbox", { name: "Edit note.md", exact: true }).fill("Unsaved draft"),
        );
        expect(
          yield* browser.use("Deletion is disabled while dirty", (page) =>
            page
              .getByRole("button", { name: "Delete file", exact: true })
              .and(page.locator(":disabled"))
              .waitFor()
              .then(() => true),
          ),
        ).toBe(true);
        yield* openReference;
        yield* openRemoval("Delete file");
        const concurrent = yield* api.request(actors.owner, "POST", `${path}/commits`, {
          expected: original.revision.commit,
          files: original.files.map((file) =>
            file.path === reference ? { ...file, content: "Changed reference.\n" } : file,
          ),
          message: "Change reviewed reference",
        });
        expect(concurrent.status).toBe(200);
        const changed = yield* workspace();
        yield* confirm("Delete file");
        yield* browser.use("Refuse changed reviewed bytes", (page) =>
          page.getByRole("alert").filter({ hasText: "Source changed" }).waitFor(),
        );
        expect(yield* workspace()).toEqual(changed);
        yield* browser.use("Explicitly reload the review", (page) =>
          page.getByRole("button", { name: "Reload and review", exact: true }).click(),
        );
        yield* openReference;
        yield* openRemoval("Delete file");
        yield* confirm("Delete file");
        yield* browser.use("Deletion commit is acknowledged", (page) =>
          page.getByRole("status").filter({ hasText: "Saved. Not deployed yet." }).waitFor(),
        );
        yield* browser.use("Reference deletion is acknowledged", (page) =>
          page
            .getByRole("group", { name: "remove", exact: true })
            .getByRole("button", { name: "references/note.md", exact: true })
            .waitFor({ state: "hidden" }),
        );
        const deleted = yield* workspace();
        expect(deleted.files).toEqual(changed.files.filter((file) => file.path !== reference));
        expect(yield* running()).toEqual(active);
        for (const change of ["add", "edit", "remove"]) {
          yield* browser.use("Select working instructions", (page) =>
            page
              .getByRole("group", { name: "remove", exact: true })
              .getByRole("button", { name: "Instructions", exact: true })
              .click(),
          );
          yield* openRemoval("Delete skill");
          const before = yield* workspace();
          const descendant = "skills/remove/concurrent.txt";
          const next =
            change === "add"
              ? [...before.files, { path: descendant, content: "Added" }]
              : change === "edit"
                ? before.files.map((file) =>
                    file.path === descendant ? { path: descendant, content: "Edited" } : file,
                  )
                : before.files.filter((file) => file.path !== descendant);
          expect(
            (yield* api.request(actors.owner, "POST", `${path}/commits`, {
              expected: before.revision.commit,
              files: next,
              message: `Concurrent descendant ${change}`,
            })).status,
          ).toBe(200);
          const fresh = yield* workspace();
          yield* confirm("Delete skill");
          yield* browser.use("Refuse a changed subtree", (page) =>
            page.getByRole("alert").filter({ hasText: "Source changed" }).waitFor(),
          );
          expect(yield* workspace()).toEqual(fresh);
          yield* browser.use("Require a fresh confirmation", (page) =>
            page.getByRole("button", { name: "Reload and review", exact: true }).click(),
          );
        }
        yield* openRemoval("Delete skill");
        yield* cancel;
        const beforeFolder = yield* workspace();
        yield* openRemoval("Delete skill");
        const unrelated = [
          ...beforeFolder.files,
          { path: "unpublished.txt", content: "Preserve this unpublished edit" },
        ];
        expect(
          (yield* api.request(actors.owner, "POST", `${path}/commits`, {
            expected: beforeFolder.revision.commit,
            files: unrelated,
            message: "Unrelated edit after review",
          })).status,
        ).toBe(200);
        yield* confirm("Delete skill");
        yield* browser.use("Working deletion stays undeployed", (page) =>
          page.getByRole("status").filter({ hasText: "Saved. Not deployed yet." }).waitFor(),
        );
        const removed = yield* workspace();
        expect(removed.files).toEqual(
          unrelated.filter((file) => !file.path.startsWith("skills/remove/")),
        );
        expect(yield* running()).toEqual(active);
        expect(removed.files.some((file) => file.path === "skills/remove-other/SKILL.md")).toBe(
          true,
        );
        expect(removed.files.some((file) => file.path === "index.ts")).toBe(true);
        expect(
          (yield* api.request(actors.member, "POST", `${path}/commits`, {
            expected: removed.revision.commit,
            files: removed.files,
            message: "Forbidden delete",
          })).status,
        ).toBe(403);
        yield* browser.login(actors.member);
        yield* browser.use("Open read-only deployed skills", (page) => page.goto(url));
        yield* browser.use("Read the live skills", (page) =>
          page.getByRole("navigation", { name: "Skills", exact: true }).waitFor(),
        );
        expect(
          yield* browser.use("No whole-skill deletion for readers", (page) =>
            page.getByRole("button", { name: "Delete skill", exact: true }).count(),
          ),
        ).toBe(0);
        expect(
          yield* browser.use("No file deletion for readers", (page) =>
            page.getByRole("button", { name: "Delete file", exact: true }).count(),
          ),
        ).toBe(0);
      }),
    ),
  );
});
