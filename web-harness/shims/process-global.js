/**
 * Injected by esbuild to polyfill the Node-style `process` global that
 * some src/ modules reference directly (e.g. for feature detection).
 */
export const process = globalThis.process ?? {
  env: { NODE_ENV: 'development' },
  platform: 'web',
  version: '',
  nextTick: (cb) => Promise.resolve().then(cb),
  cwd: () => '/',
};
// Also pin to window so direct `process.*` access works (not just
// module-scoped `import { process }`).
if (typeof globalThis.process === 'undefined') {
  globalThis.process = process;
}
