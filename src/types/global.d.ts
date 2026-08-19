// Hermes provides these at runtime (and livekit-client depends on them), but RN's
// TypeScript config doesn't include the DOM lib, so the compiler doesn't know about them.
declare const TextEncoder: {
  new (): { encode(input: string): Uint8Array };
};
declare const TextDecoder: {
  new (): { decode(input: Uint8Array): string };
};
