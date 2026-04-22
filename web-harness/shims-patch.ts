/**
 * Shims-patch — loaded by esbuild before entries.tsx.
 *
 * Patches the modules that real harness components import but that
 * either don't exist on web or would crash / hit the network. Each
 * shim is the minimum surface area needed by the specific components
 * in entries.tsx — grow this as more entries are added.
 *
 * Pattern: the shim lives at `web-harness/shims/<module>.ts` and is
 * wired into esbuild via its `alias` field (see esbuild.config.mjs).
 * This file is a no-op at runtime; it exists so tsc can typecheck
 * the shim files standalone.
 */
export {};
