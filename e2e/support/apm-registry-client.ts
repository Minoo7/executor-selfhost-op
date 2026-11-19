import { Effect } from "effect";

export const decompressRegistryArchive = (archive: Uint8Array) =>
  Effect.promise(() => {
    const stream = new Blob([Uint8Array.from(archive)]).stream();
    return new Response(stream.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
  }).pipe(Effect.map((buffer) => new Uint8Array(buffer)));
