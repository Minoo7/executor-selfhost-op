/** TextEncoderStream retains split surrogates across chunks. */
export const invocationBody = (text: string): ReadableStream<Uint8Array> => {
  let offset = 0;
  return new ReadableStream<string>({
    pull(controller) {
      if (offset === text.length) {
        controller.close();
        return;
      }
      const end = Math.min(offset + 65_536, text.length);
      controller.enqueue(text.slice(offset, end));
      offset = end;
    },
  }).pipeThrough(new TextEncoderStream());
};
