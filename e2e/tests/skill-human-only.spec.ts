/** The Skills tab's "Only I can start this" control edits one frontmatter line and saves it. */
import { expect, layer } from "@effect/vitest";
import { Effect, Schedule, Schema } from "effect";
import type { Page } from "playwright";
import { randomUUID } from "node:crypto";
import { Actors } from "../support/actors.ts";
import { Api, body } from "../support/api.ts";
import { Workspace } from "../support/app-authoring.ts";
import { appsManifest } from "../support/apps-release.ts";
import { Browser } from "../support/browser.ts";
import { HostedLive, withHostedCase } from "../support/case.ts";
import { App } from "../support/contracts.ts";
import { scenarios } from "../test-plan.ts";

const flag = "disable-model-invocation: true";
/** Each editable skill, the value it loads with, and the exact bytes after one toggle. */
const editable = [
  {
    name: "plain",
    title: "Plain",
    before: "---\nname: plain\ndescription: No keys follow the description.\n---\n\n# Plain\n",
    after: `---\nname: plain\ndescription: No keys follow the description.\n${flag}\n---\n\n# Plain\n`,
    loads: false,
  },
  {
    name: "crlf",
    title: "CRLF",
    before: "---\r\nname: crlf\r\ndescription: Windows line endings.\r\n---\r\n\r\n# CRLF\r\n",
    after: `---\r\nname: crlf\r\ndescription: Windows line endings.\r\n${flag}\r\n---\r\n\r\n# CRLF\r\n`,
    loads: false,
  },
  {
    name: "enabled",
    title: "Enabled",
    before: `---\nname: enabled\n${flag}\ndescription: Already human-only.\n---\n\n# Enabled\n`,
    after: "---\nname: enabled\ndescription: Already human-only.\n---\n\n# Enabled\n",
    loads: true,
  },
  {
    name: "explicit",
    title: "Explicit",
    before:
      "---\nname: explicit\ndisable-model-invocation: false # chosen by the owner\ndescription: Explicitly false.\nlicense: MIT\n---\n\n# Explicit\n",
    after: `---\nname: explicit\n${flag} # chosen by the owner\ndescription: Explicitly false.\nlicense: MIT\n---\n\n# Explicit\n`,
    loads: false,
  },
  {
    name: "unusual",
    title: "Unusual",
    before:
      "---\n# Reviewed by the docs team.\nname: \"unusual\"\ndescription: >-\n  Folded: it spans\n  several lines.\nlicense: 'MIT' # quoted\n---\n\n# Unusual\n",
    after: `---\n# Reviewed by the docs team.\nname: "unusual"\ndescription: >-\n  Folded: it spans\n  several lines.\nlicense: 'MIT' # quoted\n${flag}\n---\n\n# Unusual\n`,
    loads: false,
  },
] as const;
/** Frontmatter the control must not rewrite: it stays disabled and says why. */
const locked = [
  {
    name: "quoted-flag",
    title: "Quoted flag",
    content:
      '---\nname: quoted-flag\ndescription: A string, not a boolean.\ndisable-model-invocation: "true"\n---\n\n# Quoted flag\n',
    reason: "Set disable-model-invocation to true or false in SKILL.md to change it here.",
  },
  {
    name: "aliased",
    title: "Aliased",
    content:
      "---\nname: aliased\ndescription: An alias repeats the flag.\ndisable-model-invocation: &flag false\nx-repeated: *flag\n---\n\n# Aliased\n",
    reason: "This frontmatter is too unusual to change one line safely. Edit SKILL.md instead.",
  },
  {
    name: "flow-map",
    title: "Flow map",
    content:
      "---\n{ name: flow-map, description: One flow mapping, disable-model-invocation: true }\n---\n\n# Flow map\n",
    enabled: true,
    reason: "This frontmatter is too unusual to change one line safely. Edit SKILL.md instead.",
  },
  {
    name: "aliased-true",
    title: "Aliased true",
    content:
      "---\nname: aliased-true\ndescription: An alias repeats the flag.\ndisable-model-invocation: &flag true\nx-repeated: *flag\n---\n\n# Aliased true\n",
    enabled: true,
    reason: "This frontmatter is too unusual to change one line safely. Edit SKILL.md instead.",
  },
] as const;
const dynamic = `---\nname: dynamic-human\ndescription: Loaded by app code.\n${flag}\n---\n\n# Dynamic\n`;
const dynamicApp = {
  path: "index.ts",
  content: `import { defineApp, dynamicSkills } from "apps";
import { fileSkill } from "apps/skills";
export default defineApp({}, async () => ({
  dynamicSkills: dynamicSkills({
    list: async () => [await fileSkill([{ path: "SKILL.md", content: ${JSON.stringify(dynamic)} }])],
  }),
}));`,
};
const skillFile = (name: string, content: string) => ({
  path: `skills/${name}/SKILL.md`,
  content,
});
const Running = Schema.Struct({ sourceCommit: Schema.NullOr(Schema.String) });

/** Deploy an app with these skill files and drive its Skills tab as the owner. */
const skillsTab = (label: string, skills: readonly { path: string; content: string }[]) =>
  Effect.gen(function* () {
    const api = yield* Api,
      actors = yield* Actors,
      browser = yield* Browser;
    const prefix = `/api/organizations/${actors.organization.id}/apps`;
    const deployed = yield* api.request(actors.owner, "POST", `${prefix}/deploy`, {
      name: `${label} ${randomUUID().slice(0, 8)}`,
      files: [dynamicApp, ...skills, appsManifest],
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
    const stored = (name: string) =>
      Effect.map(
        workspace(),
        (snapshot) =>
          snapshot.files.find((file) => file.path === `skills/${name}/SKILL.md`)?.content,
      );
    const url = `/org/${actors.organization.slug}/apps/${app.id}?view=skills`;
    const control = (page: Page) =>
      page.getByRole("checkbox", { name: "Only I can start this", exact: true });
    const open = (name: string, title: string) =>
      browser.use(`Open the ${name} skill`, (page) =>
        page
          .goto(url)
          .then(() =>
            page.waitForFunction(() => document.documentElement.hasAttribute("data-hydrated")),
          )
          .then(() =>
            page
              .getByRole("group", { name, exact: true })
              .getByRole("button", { name: "Instructions", exact: true })
              .click(),
          )
          .then(() => page.getByRole("heading", { name: title, exact: true }).waitFor()),
      );
    const state = (label: string) =>
      browser.use(label, (page) =>
        Promise.all([control(page).isChecked(), control(page).isDisabled()]),
      );
    const toggleAndSave = (name: string, expected: string) =>
      Effect.gen(function* () {
        yield* browser.use(`Toggle ${name}`, (page) => control(page).click());
        yield* browser.use(`Save ${name}`, (page) =>
          page.getByRole("button", { name: "Save", exact: true }).click(),
        );
        yield* browser.use(`Saving ${name} clears the draft`, (page) =>
          page.getByRole("button", { name: "Discard", exact: true }).waitFor({ state: "hidden" }),
        );
        const saved = yield* workspace();
        expect(saved.files.find((file) => file.path === `skills/${name}/SKILL.md`)?.content).toBe(
          expected,
        );
        yield* api.request(actors.owner, "GET", `${path}/source`).pipe(
          Effect.flatMap((response) => body(Running, response)),
          Effect.filterOrFail(
            (source) => source.sourceCommit === saved.revision.commit,
            () => new Error(`The ${name} save is not deployed yet`),
          ),
          Effect.retry({ schedule: Schedule.spaced("500 millis"), times: 80 }),
        );
        yield* browser.use(`The ${name} deploy status clears`, (page) =>
          page.getByRole("status").filter({ hasText: "Saved" }).waitFor({ state: "hidden" }),
        );
      });
    yield* browser.login(actors.owner);
    return { browser, stored, open, state, toggleAndSave };
  });

const [plain, crlf, ...variants] = editable;

layer(HostedLive, { excludeTestServices: true })("Skill human-only control", (it) => {
  it.effect(scenarios.skillHumanOnly.title, (context) =>
    withHostedCase(
      context,
      Effect.gen(function* () {
        const tab = yield* skillsTab("Skill human-only", [
          skillFile(plain.name, plain.before),
          skillFile(crlf.name, crlf.before),
        ]);
        for (const skill of [plain, crlf]) {
          yield* tab.open(skill.name, skill.title);
          expect(yield* tab.state(`${skill.name} loads unchecked`)).toEqual([false, false]);
          if (skill === plain) yield* tab.browser.checkpoint("Human-only control");
          yield* tab.toggleAndSave(skill.name, skill.after);
          yield* tab.open(skill.name, skill.title);
          expect(yield* tab.state(`${skill.name} loads the saved toggle`)).toEqual([true, false]);
          if (skill === plain) yield* tab.browser.checkpoint("Saved human-only skill");
          yield* tab.toggleAndSave(skill.name, skill.before);
        }
        yield* tab.browser.use("Open the dynamic skill", (page) =>
          page
            .getByRole("group", { name: "dynamic-human", exact: true })
            .getByRole("button", { name: "Instructions", exact: true })
            .click()
            .then(() =>
              page.getByText("This deployed skill is read-only here.", { exact: true }).waitFor(),
            ),
        );
        expect(yield* tab.state("The dynamic skill shows its value read-only")).toEqual([
          true,
          true,
        ]);
        yield* tab.browser.checkpoint("Read-only human-only skill");
      }),
    ),
  );

  it.effect(scenarios.skillHumanOnlyFrontmatter.title, (context) =>
    withHostedCase(
      context,
      Effect.gen(function* () {
        const tab = yield* skillsTab("Skill frontmatter", [
          ...variants.map((skill) => skillFile(skill.name, skill.before)),
          ...locked.map((skill) => skillFile(skill.name, skill.content)),
        ]);
        for (const skill of variants) {
          yield* tab.open(skill.name, skill.title);
          expect(yield* tab.state(`${skill.name} loads its saved value`)).toEqual([
            skill.loads,
            false,
          ]);
          yield* tab.toggleAndSave(skill.name, skill.after);
        }
        for (const skill of locked) {
          yield* tab.open(skill.name, skill.title);
          expect(yield* tab.state(`${skill.name} cannot change`)).toEqual([
            "enabled" in skill && skill.enabled,
            true,
          ]);
          yield* tab.browser.use(`${skill.name} explains why`, (page) =>
            page.getByText(skill.reason, { exact: true }).waitFor(),
          );
          expect(yield* tab.stored(skill.name)).toBe(skill.content);
        }
        yield* tab.browser.checkpoint("Locked human-only control");
      }),
    ),
  );
});
