/** Split and rejoin SKILL.md so edits change only the body and the fields a person edited. */
import { isMap, isScalar, parseDocument, type Document } from "yaml";

/** Same delimiter rule as the skill loader in `apps`. */
const frontmatterPattern = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---(?:[ \t]*\r?\n|[ \t]*$)/;

export interface SkillDocumentParts {
  /** The exact frontmatter block including delimiters, or "" when the file has none. */
  readonly frontmatter: string;
  readonly body: string;
}

export const splitSkillDocument = (content: string): SkillDocumentParts => {
  const match = frontmatterPattern.exec(content);
  return match === null
    ? { frontmatter: "", body: content }
    : { frontmatter: match[0], body: content.slice(match[0].length) };
};

/** Read the description a person can edit; the loader already validated the rest. */
export const skillDescription = (frontmatter: string): string => {
  const yaml = frontmatterYaml(frontmatter);
  const value = yaml === undefined ? undefined : parseDocument(yaml).get("description");
  return typeof value === "string" ? value : "";
};

/** Replace only the description, keeping key order, comments and every other value's formatting. */
export const withSkillDescription = (frontmatter: string, description: string): string => {
  if (skillDescription(frontmatter) === description) return frontmatter;
  const yaml = frontmatterYaml(frontmatter);
  if (yaml === undefined) return frontmatter;
  const document = parseDocument(yaml);
  document.set("description", description);
  const newline = frontmatter.includes("\r\n") ? "\r\n" : "\n";
  const serialized = document
    .toString({ lineWidth: 0 })
    .replace(/\r?\n$/, "")
    .replace(/\r?\n/g, newline);
  return `${frontmatter.startsWith("﻿") ? "﻿" : ""}---${newline}${serialized}${newline}---${newline}`;
};

export const joinSkillDocument = ({ frontmatter, body }: SkillDocumentParts): string =>
  frontmatter + body;

const frontmatterYaml = (frontmatter: string) => frontmatterPattern.exec(frontmatter)?.[1];

const humanOnlyKey = "disable-model-invocation";

/**
 * Whether only a person can start the skill (`disable-model-invocation: true`). `toggled` is the
 * frontmatter with that choice flipped by adding, changing or removing that one line; `locked`
 * explains why no such one-line edit is safe.
 */
export type SkillHumanOnly =
  | { readonly kind: "editable"; readonly enabled: boolean; readonly toggled: string }
  | { readonly kind: "locked"; readonly enabled: boolean; readonly reason: string };

const unusual = "This frontmatter is too unusual to change one line safely. Edit SKILL.md instead.";

export const skillHumanOnly = (frontmatter: string): SkillHumanOnly => {
  const opening = /^\uFEFF?---[ \t]*\r?\n/.exec(frontmatter);
  const yaml = frontmatterYaml(frontmatter);
  if (opening === null || yaml === undefined)
    return { kind: "locked", enabled: false, reason: "SKILL.md has no frontmatter." };
  const document = parseDocument(yaml);
  const root = document.contents;
  if (document.errors.length > 0 || !isMap(root) || root.flow)
    return { kind: "locked", enabled: false, reason: unusual };
  const pair = root.items.find((item) => isScalar(item.key) && item.key.value === humanOnlyKey);
  const key = pair?.key;
  const value = pair?.value;
  const enabled = isScalar(value) && value.value === true;
  if (pair !== undefined && !(isScalar(value) && typeof value.value === "boolean"))
    return {
      kind: "locked",
      enabled,
      reason: `Set ${humanOnlyKey} to true or false in SKILL.md to change it here.`,
    };
  const newline = frontmatter.includes("\r\n") ? "\r\n" : "\n";
  const edit = (): { from: number; to: number; text: string } | undefined => {
    if (pair === undefined)
      return { from: yaml.length, to: yaml.length, text: `${newline}${humanOnlyKey}: true` };
    if (!isScalar(key) || !isScalar(value) || !key.range || !value.range) return undefined;
    if (!enabled) return { from: value.range[0], to: value.range[1], text: "true" };
    const start = key.range[0];
    const end = yaml.indexOf("\n", value.range[1]);
    if (start !== yaml.lastIndexOf("\n", start - 1) + 1 || yaml.slice(start, value.range[1]).includes("\n"))
      return undefined;
    if (end !== -1) return { from: start, to: end + 1, text: "" };
    const previous = yaml.slice(0, start).match(/\r?\n$/)?.[0].length;
    return previous === undefined ? undefined : { from: start - previous, to: yaml.length, text: "" };
  };
  const change = edit();
  if (change === undefined) return { kind: "locked", enabled, reason: unusual };
  const offset = opening[0].length;
  const toggled =
    frontmatter.slice(0, offset + change.from) + change.text + frontmatter.slice(offset + change.to);
  return changesOnlyTheKey(document, toggled, !enabled)
    ? { kind: "editable", enabled, toggled }
    : { kind: "locked", enabled, reason: unusual };
};

/** The edited frontmatter must parse to the original values with only the key added or removed. */
const changesOnlyTheKey = (original: Document, toggled: string, enabled: boolean) => {
  const yaml = frontmatterYaml(toggled);
  if (yaml === undefined) return false;
  const reparsed = parseDocument(yaml);
  if (reparsed.errors.length > 0) return false;
  const values: unknown = original.toJS();
  if (typeof values !== "object" || values === null || Array.isArray(values)) return false;
  const others = Object.entries(values).filter(([key]) => key !== humanOnlyKey);
  const expected = Object.fromEntries(
    enabled
      ? humanOnlyKey in values
        ? Object.entries(values).map(([key, value]) => [key, key === humanOnlyKey ? true : value])
        : [...others, [humanOnlyKey, true]]
      : others,
  );
  // An alias of the flag would change with it, so it fails this comparison.
  return JSON.stringify(reparsed.toJS()) === JSON.stringify(expected);
};
