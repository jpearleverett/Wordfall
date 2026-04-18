/**
 * Phase 4.6 — locale parity guard.
 *
 * Every supported locale must mirror en.json's shape so `changeLanguage(...)`
 * can't silently fall back to English for missing keys. Once real translations
 * land, the values diverge but the structure (keys + interpolation tokens)
 * stays locked to en.json.
 *
 * Tests:
 *   1. Every locale has the same flattened key set as en.
 *   2. Every translated string preserves the exact same `{{placeholder}}`
 *      tokens as the English source (order-insensitive).
 *   3. Plural keys always come as `_one` + `_other` pairs.
 */
import en from '../locales/en.json';
import es419 from '../locales/es-419.json';
import ptBR from '../locales/pt-BR.json';
import de from '../locales/de.json';
import fr from '../locales/fr.json';
import ja from '../locales/ja.json';

type LocaleBundle = Record<string, unknown>;

const LOCALES: Record<string, LocaleBundle> = {
  'es-419': es419 as LocaleBundle,
  'pt-BR': ptBR as LocaleBundle,
  de: de as LocaleBundle,
  fr: fr as LocaleBundle,
  ja: ja as LocaleBundle,
};

function flatten(obj: LocaleBundle, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v as LocaleBundle, key));
    } else if (typeof v === 'string') {
      out[key] = v;
    }
  }
  return out;
}

function extractTokens(str: string): string[] {
  const matches = str.match(/\{\{[^}]+\}\}/g) ?? [];
  return [...matches].sort();
}

const enFlat = flatten(en as LocaleBundle);
const enKeys = Object.keys(enFlat).sort();

describe('locale parity', () => {
  for (const [name, bundle] of Object.entries(LOCALES)) {
    describe(name, () => {
      const flat = flatten(bundle);

      it('has the same key set as en.json', () => {
        expect(Object.keys(flat).sort()).toEqual(enKeys);
      });

      it('preserves interpolation tokens for every string', () => {
        for (const key of enKeys) {
          const enTokens = extractTokens(enFlat[key]);
          const locTokens = extractTokens(flat[key] ?? '');
          expect({ key, tokens: locTokens }).toEqual({ key, tokens: enTokens });
        }
      });
    });
  }
});

describe('plural key pairs (en source-of-truth)', () => {
  const pluralBases = new Set<string>();
  for (const k of enKeys) {
    if (k.endsWith('_one')) pluralBases.add(k.replace(/_one$/, ''));
    if (k.endsWith('_other')) pluralBases.add(k.replace(/_other$/, ''));
  }

  it('every plural base has both _one and _other variants', () => {
    for (const base of pluralBases) {
      expect(enFlat[`${base}_one`]).toBeDefined();
      expect(enFlat[`${base}_other`]).toBeDefined();
    }
  });
});
