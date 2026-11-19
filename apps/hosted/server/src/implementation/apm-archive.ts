/**
 * APM package archives built from one skill catalog. The bytes are a pure function of the
 * package name, the version and the skills: a tar with fixed metadata inside a gzip of stored
 * deflate blocks, so no compressor version can change a published digest.
 */
import type { AppSkillSource } from "@executor-js/sdk/core";
type Yaml = Pick<typeof import("yaml"), "parseDocument" | "isAlias" | "isMap" | "isScalar">;

export interface ArchiveFile {
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
export const apmPackageFiles = (input: {
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

const encoder = new TextEncoder();
const blockSize = 512;

const octal = (value: number, width: number) => `${value.toString(8).padStart(width - 1, "0")}\0`;

const header = (name: string, size: number, mode: number, type: "0" | "5" | "x") => {
  const block = new Uint8Array(blockSize);
  const put = (offset: number, text: string) => block.set(encoder.encode(text), offset);
  put(0, name);
  put(100, octal(mode, 8));
  put(108, octal(0, 8));
  put(116, octal(0, 8));
  put(124, octal(size, 12));
  put(136, octal(0, 12));
  put(148, " ".repeat(8));
  put(156, type);
  put(257, "ustar\u000000");
  let sum = 0;
  for (const byte of block) sum += byte;
  put(148, `${sum.toString(8).padStart(6, "0")}\0 `);
  return block;
};

const padded = (bytes: Uint8Array) => {
  const block = new Uint8Array(Math.ceil(bytes.length / blockSize) * blockSize);
  block.set(bytes);
  return block;
};

/** A pax record names a path that a USTAR name field cannot hold: long or not printable ASCII. */
const paxPath = (path: string) => {
  const body = ` path=${path}\n`;
  const bytes = encoder.encode(body).length;
  let length = bytes + 1;
  while (String(length).length + bytes !== length) length = String(length).length + bytes;
  return encoder.encode(`${length}${body}`);
};
const fitsUstar = (path: string) => /^[\x20-\x7e]{1,100}$/.test(path);

/** USTAR entries with zero owner and time, in the order given. */
export const tar = (files: ReadonlyArray<ArchiveFile>) => {
  const blocks = [header(".apm/", 0, 0o755, "5")];
  for (const file of files) {
    const content = encoder.encode(file.content);
    const mode = file.executable ? 0o755 : 0o644;
    if (fitsUstar(file.path)) blocks.push(header(file.path, content.length, mode, "0"));
    else {
      const record = paxPath(file.path);
      blocks.push(header("PaxHeader", record.length, 0o644, "x"), padded(record));
      blocks.push(header("long-path", content.length, mode, "0"));
    }
    blocks.push(padded(content));
  }
  blocks.push(new Uint8Array(blockSize * 2));
  return concat(blocks);
};

const concat = (parts: ReadonlyArray<Uint8Array>) => {
  const bytes = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
};

const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value;
});
const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crcTable[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
const littleEndian32 = (value: number) =>
  Uint8Array.of(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);

/** RFC 1952 gzip around RFC 1951 stored blocks: no mtime, unknown OS, no compression. */
export const gzipStored = (data: Uint8Array) => {
  const parts: Uint8Array[] = [Uint8Array.of(0x1f, 0x8b, 8, 0, 0, 0, 0, 0, 0, 0xff)];
  const limit = 0xffff;
  let offset = 0;
  do {
    const length = Math.min(limit, data.length - offset);
    const final = offset + length === data.length ? 1 : 0;
    parts.push(
      Uint8Array.of(final, length & 0xff, length >>> 8, ~length & 0xff, (~length >>> 8) & 0xff),
      data.subarray(offset, offset + length),
    );
    offset += length;
  } while (offset < data.length);
  parts.push(littleEndian32(crc32(data)), littleEndian32(data.length));
  return concat(parts);
};
