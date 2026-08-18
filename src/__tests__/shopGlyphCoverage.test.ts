/**
 * Shop glyph coverage — every emoji stored in the shop-facing data catalogs
 * (coin shop, IAP products, rotating cosmetics, booster combos) plus the
 * component-local DIFFICULTY_META and FEATURE_UNLOCK_SCHEDULE tables must
 * resolve to a bespoke icon in GameIcon's EMOJI_TO_NAME map. Anything that
 * falls through renders the generic sparkle fallback, which reads as a
 * missing-art bug on a premium surface.
 *
 * GameIcon.tsx imports react-native-svg (unmocked in the node test env), so
 * the map and registry are parsed from source instead of imported. The
 * resolve logic below mirrors GameIcon.resolveIconName exactly.
 */
import * as fs from 'fs';
import * as path from 'path';

import { COIN_SHOP_ITEMS } from '../data/coinShop';
import { SHOP_PRODUCTS } from '../data/shopProducts';
import { ROTATING_POOL } from '../data/rotatingShop';
import { COMBO_DEFINITIONS } from '../data/boosterCombos';
import { FEATURE_UNLOCK_SCHEDULE } from '../constants';

const SRC = path.join(__dirname, '..');

function readSource(rel: string): string {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

/** Decode TS string escapes (\u{1F331}, ️) left literal by fs.readFileSync. */
function decodeEscapes(s: string): string {
  return s
    .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
}

/** Extract the literal body of a `const NAME ... = { ... }` block. */
function extractBlock(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf(endMarker, start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

const gameIconSource = readSource('components/icons/GameIcon.tsx');

const registryBlock = extractBlock(gameIconSource, 'const REGISTRY = {', '} as const;');
const REGISTRY_NAMES = new Set(
  [...registryBlock.matchAll(/([A-Za-z0-9_]+):\s*[A-Z][A-Za-z0-9_]*Icon/g)].map((m) => m[1]),
);

const mapBlock = extractBlock(gameIconSource, 'const EMOJI_TO_NAME', '\n};');
const EMOJI_TO_NAME: Record<string, string> = {};
for (const m of mapBlock.matchAll(/'([^']+)':\s*'([A-Za-z0-9_]+)'/g)) {
  EMOJI_TO_NAME[m[1]] = m[2];
}

/** Mirrors GameIcon.resolveIconName (variation-selector strip + prefix fallback). */
function resolve(glyph: string): string | null {
  const g = glyph.replace(/[︎️‍]/g, '').trim();
  return EMOJI_TO_NAME[g] ?? EMOJI_TO_NAME[g.slice(0, 2)] ?? EMOJI_TO_NAME[g.slice(0, 1)] ?? null;
}

function expectAllResolve(label: string, icons: { id: string; icon: string }[]) {
  const unmapped = icons.filter(({ icon }) => resolve(icon) === null);
  expect(
    unmapped.map(({ id, icon }) => `${label}/${id}: ${JSON.stringify(icon)}`),
  ).toEqual([]);
}

describe('shop glyph coverage (GameIcon EMOJI_TO_NAME)', () => {
  it('parsed a plausible map and registry out of GameIcon.tsx', () => {
    expect(REGISTRY_NAMES.size).toBeGreaterThan(60);
    expect(Object.keys(EMOJI_TO_NAME).length).toBeGreaterThan(100);
    expect(EMOJI_TO_NAME['🏆']).toBe('trophy');
    expect(resolve('❄️')).toBe('snowflake');
  });

  it('every EMOJI_TO_NAME target is a registered icon name', () => {
    const bad = Object.entries(EMOJI_TO_NAME).filter(([, name]) => !REGISTRY_NAMES.has(name));
    expect(bad).toEqual([]);
  });

  it('COIN_SHOP_ITEMS icons all resolve', () => {
    expectAllResolve('coinShop', COIN_SHOP_ITEMS.map(({ id, icon }) => ({ id, icon })));
  });

  it('SHOP_PRODUCTS icons all resolve', () => {
    expectAllResolve('shopProducts', SHOP_PRODUCTS.map(({ id, icon }) => ({ id, icon })));
  });

  it('ROTATING_POOL icons all resolve', () => {
    expectAllResolve('rotatingShop', ROTATING_POOL.map(({ id, icon }) => ({ id, icon })));
  });

  it('COMBO_DEFINITIONS icons all resolve', () => {
    expectAllResolve(
      'boosterCombos',
      Object.values(COMBO_DEFINITIONS).map(({ id, icon }) => ({ id, icon })),
    );
  });

  it('FEATURE_UNLOCK_SCHEDULE icons all resolve', () => {
    expectAllResolve(
      'featureUnlocks',
      FEATURE_UNLOCK_SCHEDULE.map(({ id, icon }) => ({ id, icon })),
    );
  });

  it('DIFFICULTY_META icons all resolve (parsed from component source)', () => {
    const source = readSource('components/DifficultyTransitionCeremony.tsx');
    const block = extractBlock(source, 'const DIFFICULTY_META', '\n};');
    const icons = [...block.matchAll(/(\w+):\s*\{[^}]*icon:\s*'([^']+)'/g)].map((m) => ({
      id: m[1],
      icon: decodeEscapes(m[2]),
    }));
    expect(icons.length).toBe(4);
    expectAllResolve('difficulty', icons);
  });

  it('ShopScreen bundle-contents glyph literals all resolve', () => {
    const source = readSource('screens/ShopScreen.tsx');
    const icons = [...source.matchAll(/glyph:\s*'([^']+)'/g)].map((m, i) => ({
      id: `glyph${i}`,
      icon: decodeEscapes(m[1]),
    }));
    expect(icons.length).toBeGreaterThanOrEqual(2);
    expectAllResolve('shopScreen', icons);
  });
});
