/**
 * esbuild config for the visual harness.
 *
 * Bundles web-harness/harness.tsx → web-harness/harness.bundle.js with:
 *   - react-native → react-native-web alias
 *   - shims for firestore / haptics / sound / useReduceMotion
 *   - loader for image + SVG + font imports used transitively by src/
 *
 * Usage:
 *   node web-harness/esbuild.config.mjs          # one-shot build
 *   node web-harness/esbuild.config.mjs --watch  # watch mode
 */
import { build, context } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Absolute-path aliases aren't supported by esbuild's `alias` option,
// so we use a tiny plugin that intercepts resolution for a fixed list
// of src/ modules and points them at the shim files instead.
const SRC_SHIMS = {
  [resolve(root, 'src/services/firestore')]: resolve(__dirname, 'shims/firestore.ts'),
  [resolve(root, 'src/services/firestore.ts')]: resolve(__dirname, 'shims/firestore.ts'),
  [resolve(root, 'src/services/haptics')]: resolve(__dirname, 'shims/haptics.ts'),
  [resolve(root, 'src/services/haptics.ts')]: resolve(__dirname, 'shims/haptics.ts'),
  [resolve(root, 'src/services/sound')]: resolve(__dirname, 'shims/sound.ts'),
  [resolve(root, 'src/services/sound.ts')]: resolve(__dirname, 'shims/sound.ts'),
  [resolve(root, 'src/hooks/useReduceMotion')]: resolve(__dirname, 'shims/useReduceMotion.ts'),
  [resolve(root, 'src/hooks/useReduceMotion.ts')]: resolve(__dirname, 'shims/useReduceMotion.ts'),
};

const srcShimPlugin = {
  name: 'src-shim',
  setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      // Resolve the candidate source path, then check against our map.
      // We only care about relative imports originating in src/ pointing
      // at the shimmed modules. esbuild hands us `args.path` (the raw
      // specifier) + `args.resolveDir`; build the absolute path.
      if (args.path.startsWith('.')) {
        const abs = resolve(args.resolveDir, args.path);
        if (SRC_SHIMS[abs]) {
          return { path: SRC_SHIMS[abs] };
        }
        if (SRC_SHIMS[abs + '.ts']) {
          return { path: SRC_SHIMS[abs + '.ts'] };
        }
      }
      return undefined;
    });
  },
};

const shared = {
  entryPoints: [resolve(__dirname, 'harness.tsx')],
  outfile: resolve(__dirname, 'harness.bundle.js'),
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: ['chrome100'],
  sourcemap: 'inline',
  jsx: 'automatic',
  define: {
    'process.env.NODE_ENV': JSON.stringify('development'),
    __DEV__: 'true',
    global: 'window',
  },
  inject: [resolve(__dirname, 'shims/process-global.js')],
  loader: {
    '.png': 'dataurl',
    '.jpg': 'dataurl',
    '.jpeg': 'dataurl',
    '.gif': 'dataurl',
    '.svg': 'dataurl',
    '.webp': 'dataurl',
    '.ttf': 'dataurl',
    '.otf': 'dataurl',
    '.woff': 'dataurl',
    '.woff2': 'dataurl',
    '.mp3': 'empty',
    '.wav': 'empty',
    '.mp4': 'empty',
  },
  alias: {
    // Native primitives → web
    'react-native': 'react-native-web',
    'react-native/Libraries/Animated/NativeAnimatedHelper': resolve(
      __dirname,
      'shims',
      'empty-module.ts',
    ),
    // Native-only deps that the harness components drag in transitively.
    'expo-haptics': resolve(__dirname, 'shims', 'empty-module.ts'),
    'expo-notifications': resolve(__dirname, 'shims', 'empty-module.ts'),
    'expo-audio': resolve(__dirname, 'shims', 'empty-module.ts'),
    'expo-linear-gradient': resolve(
      __dirname,
      'shims',
      'expo-linear-gradient.tsx',
    ),
    '@react-native-async-storage/async-storage': resolve(
      __dirname,
      'shims',
      'async-storage.ts',
    ),
    'react-native-reanimated': resolve(__dirname, 'shims', 'reanimated.tsx'),
  },
  plugins: [srcShimPlugin],
  resolveExtensions: [
    '.web.tsx',
    '.web.ts',
    '.web.jsx',
    '.web.js',
    '.tsx',
    '.ts',
    '.jsx',
    '.js',
  ],
  logLevel: 'info',
};

const watchMode = process.argv.includes('--watch');

if (watchMode) {
  const ctx = await context(shared);
  await ctx.watch();
  console.log('[harness] watching for changes…');
} else {
  await build(shared);
  console.log('[harness] bundle built');
}
