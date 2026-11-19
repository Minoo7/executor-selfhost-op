import type { AppSkillSource } from "@executor-js/sdk/core";
import { strToU8, zipSync, type Zippable, type ZipOptions } from "fflate";

type Yaml = Pick<typeof import("yaml"), "parseDocument" | "isAlias" | "isMap" | "isScalar">;

interface ArchiveFile {
  readonly path: string;
  readonly content: string;
  readonly executable: boolean;
}

/** Codex ignores `disable-model-invocation`; this policy file is its switch for the same thing. */
const codexHumanOnlyPolicy = "policy:\n  allow_implicit_invocation: false\n";
const codexPolicyPath = "agents/openai.yaml";

const frontmatter = (document: string) =>
  /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---(?:[ \t]*\r?\n|[ \t]*$)/.exec(document)?.[1];
const humanOnly = (parser: Yaml, document: string) => {
  const header = frontmatter(document);
  if (header === undefined) return false;
  const yaml = parser.parseDocument(header);
  if (yaml.errors.length !== 0) return false;
  const flag = yaml.get("disable-model-invocation", true);
  const resolved = parser.isAlias(flag) ? flag.resolve(yaml) : flag;
  return parser.isScalar(resolved) && resolved.value === true;
};

const codexPolicy = (parser: Yaml, original: string | undefined) => {
  if (original === undefined) return codexHumanOnlyPolicy;
  const yaml = parser.parseDocument(original);
  if (yaml.errors.length !== 0) return codexHumanOnlyPolicy;
  if (yaml.getIn(["policy", "allow_implicit_invocation"]) === false) return original;
  if (!parser.isMap(yaml.contents)) return codexHumanOnlyPolicy;
  if (!parser.isMap(yaml.get("policy", true))) yaml.set("policy", {});
  yaml.setIn(["policy", "allow_implicit_invocation"], false);
  return yaml.toString();
};

/**
 * The package as APM reads it: `apm.yml` at the root and each skill under `.apm/skills/<name>/`.
 * SKILL.md keeps its exact text. A file that starts with `#!` is executable.
 */
const apmPackageFiles = (input: {
  readonly yaml: Yaml;
  readonly name: string;
  readonly skills: ReadonlyArray<AppSkillSource>;
}): ArchiveFile[] => {
  const files: ArchiveFile[] = [
    {
      path: "apm.yml",
      content: `name: ${JSON.stringify(input.name)}\nversion: "1.0.0"\n`,
      executable: false,
    },
  ];
  for (const skill of input.skills) {
    const directory = `.apm/skills/${skill.name}`;
    const document = skill.files.find((file) => file.path === "SKILL.md")?.content ?? "";
    const explicitOnly = humanOnly(input.yaml, document);
    for (const file of skill.files) {
      if (explicitOnly && file.path === codexPolicyPath) continue;
      files.push({
        path: `${directory}/${file.path}`,
        content: file.content,
        executable: file.content.startsWith("#!"),
      });
    }
    if (explicitOnly)
      files.push({
        path: `${directory}/${codexPolicyPath}`,
        content: codexPolicy(
          input.yaml,
          skill.files.find((file) => file.path === codexPolicyPath)?.content,
        ),
        executable: false,
      });
  }
  return files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
};

const unixEntry = (mode: number): ZipOptions => ({
  os: 3,
  attrs: mode << 16,
  level: 0,
  mtime: new Date(1980, 0, 1),
});

export const apmPackageArchive = (input: Parameters<typeof apmPackageFiles>[0]) => {
  const entries: Zippable = {
    ".apm/": [new Uint8Array(), unixEntry(0o40755)],
  };
  for (const { path, content, executable } of apmPackageFiles(input))
    entries[path] = [strToU8(content), unixEntry(executable ? 0o100755 : 0o100644)];
  return Uint8Array.from(zipSync(entries));
};
