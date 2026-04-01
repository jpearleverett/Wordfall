/**
 * Regional Pricing Tiers
 *
 * Adjusts IAP prices by region to match local purchasing power.
 * Uses device locale as a proxy for region detection.
 */

import { Platform, NativeModules } from 'react-native';

export interface RegionalPrice {
  region: string;
  regionName: string;
  currency: string;
  symbol: string;
  multiplier: number; // Relative to USD base price
}

export const REGIONAL_PRICING: RegionalPrice[] = [
  { region: 'US', regionName: 'United States', currency: 'USD', symbol: '$', multiplier: 1.0 },
  { region: 'CA', regionName: 'Canada', currency: 'CAD', symbol: 'CA$', multiplier: 1.0 },
  { region: 'AU', regionName: 'Australia', currency: 'AUD', symbol: 'A$', multiplier: 1.0 },
  { region: 'GB', regionName: 'United Kingdom', currency: 'GBP', symbol: '£', multiplier: 0.95 },
  { region: 'EU', regionName: 'Europe', currency: 'EUR', symbol: '€', multiplier: 0.95 },
  { region: 'IN', regionName: 'India', currency: 'INR', symbol: '₹', multiplier: 0.40 },
  { region: 'BR', regionName: 'Brazil', currency: 'BRL', symbol: 'R$', multiplier: 0.45 },
  { region: 'SEA', regionName: 'Southeast Asia', currency: 'USD', symbol: '$', multiplier: 0.50 },
  { region: 'JP', regionName: 'Japan', currency: 'JPY', symbol: '¥', multiplier: 1.1 },
  { region: 'KR', regionName: 'South Korea', currency: 'KRW', symbol: '₩', multiplier: 1.0 },
  { region: 'DEFAULT', regionName: 'Rest of World', currency: 'USD', symbol: '$', multiplier: 0.75 },
];

// Map locale prefixes to regions
const LOCALE_TO_REGION: Record<string, string> = {
  'en_US': 'US', 'en_CA': 'CA', 'en_AU': 'AU', 'en_GB': 'GB',
  'pt_BR': 'BR', 'hi_IN': 'IN', 'bn_IN': 'IN', 'ta_IN': 'IN',
  'ja_JP': 'JP', 'ko_KR': 'KR',
  'th_TH': 'SEA', 'vi_VN': 'SEA', 'ms_MY': 'SEA', 'id_ID': 'SEA', 'fil_PH': 'SEA',
  'de_DE': 'EU', 'fr_FR': 'EU', 'es_ES': 'EU', 'it_IT': 'EU', 'nl_NL': 'EU', 'pt_PT': 'EU',
  'de_AT': 'EU', 'fr_BE': 'EU', 'fi_FI': 'EU', 'el_GR': 'EU', 'sv_SE': 'EU',
};

/**
 * Detect the player's region from device locale.
 * Returns a region code matching REGIONAL_PRICING entries.
 */
export function detectRegion(): string {
  try {
    let locale = '';
    if (Platform.OS === 'ios') {
      locale =
        NativeModules.SettingsManager?.settings?.AppleLocale ||
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
        '';
    } else {
      locale = NativeModules.I18nManager?.localeIdentifier || '';
    }

    // Normalize locale: "en-US" -> "en_US"
    locale = locale.replace('-', '_');

    // Direct match
    if (LOCALE_TO_REGION[locale]) {
      return LOCALE_TO_REGION[locale];
    }

    // Try just the country part
    const parts = locale.split('_');
    if (parts.length >= 2) {
      const countryCode = parts[1].toUpperCase();
      const match = REGIONAL_PRICING.find((r) => r.region === countryCode);
      if (match) return match.region;
    }
  } catch {
    // Ignore locale detection failures
  }

  return 'DEFAULT';
}

/**
 * Get the regional price for a base USD amount.
 */
export function getRegionalPrice(
  basePriceUSD: number,
  regionCode?: string,
): { price: number; formatted: string; currency: string } {
  const region = regionCode || detectRegion();
  const pricing = REGIONAL_PRICING.find((r) => r.region === region) || REGIONAL_PRICING[REGIONAL_PRICING.length - 1];

  const adjustedPrice = Math.round(basePriceUSD * pricing.multiplier * 100) / 100;

  // Format based on currency
  let formatted: string;
  if (pricing.currency === 'JPY' || pricing.currency === 'KRW') {
    formatted = `${pricing.symbol}${Math.round(adjustedPrice * 100)}`; // No decimal for yen/won
  } else if (pricing.currency === 'INR') {
    formatted = `${pricing.symbol}${Math.round(adjustedPrice * 83)}`; // Approximate INR conversion
  } else if (pricing.currency === 'BRL') {
    formatted = `${pricing.symbol}${(adjustedPrice * 5).toFixed(2)}`; // Approximate BRL conversion
  } else {
    formatted = `${pricing.symbol}${adjustedPrice.toFixed(2)}`;
  }

  return { price: adjustedPrice, formatted, currency: pricing.currency };
}
