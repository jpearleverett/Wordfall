import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from '../locales/en.json';
import es419 from '../locales/es-419.json';
import ptBR from '../locales/pt-BR.json';
import de from '../locales/de.json';
import fr from '../locales/fr.json';
import ja from '../locales/ja.json';

export type SupportedLocale = 'en' | 'es-419' | 'pt-BR' | 'de' | 'fr' | 'ja';

/** Order here determines the locale-selector list in Settings. */
export const SUPPORTED_LOCALES: readonly SupportedLocale[] = [
  'en',
  'es-419',
  'pt-BR',
  'de',
  'fr',
  'ja',
];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  'es-419': 'Español (LatAm)',
  'pt-BR': 'Português (Brasil)',
  de: 'Deutsch',
  fr: 'Français',
  ja: '日本語',
};

/**
 * Map a raw BCP-47 locale (e.g. "es-MX", "pt-PT") onto our supported set.
 * Falls back to English when the device locale isn't translated yet.
 */
export function resolveLocale(raw: string | null | undefined): SupportedLocale {
  if (!raw) return 'en';
  const lower = raw.toLowerCase();
  if (lower.startsWith('es')) return 'es-419';
  if (lower.startsWith('pt')) return 'pt-BR';
  if (lower.startsWith('de')) return 'de';
  if (lower.startsWith('fr')) return 'fr';
  if (lower.startsWith('ja')) return 'ja';
  return 'en';
}

function getDeviceLocale(): SupportedLocale {
  try {
    const locales = Localization.getLocales();
    const first = locales?.[0]?.languageTag;
    return resolveLocale(first);
  } catch {
    return 'en';
  }
}

let initialized = false;

/**
 * Initialize i18next. Safe to call multiple times — second call is a no-op.
 * Call once from App.tsx during bootstrap; swap locale at runtime with
 * `i18n.changeLanguage(...)`.
 */
export async function initI18n(initialLocale?: SupportedLocale): Promise<void> {
  if (initialized) return;
  const locale = initialLocale ?? getDeviceLocale();
  await i18n.use(initReactI18next).init({
    compatibilityJSON: 'v4',
    resources: {
      en: { translation: en },
      'es-419': { translation: es419 },
      'pt-BR': { translation: ptBR },
      de: { translation: de },
      fr: { translation: fr },
      ja: { translation: ja },
    },
    lng: locale,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
    returnEmptyString: false,
  });
  initialized = true;
}

export default i18n;
