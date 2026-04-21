import { StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { COLORS, FONTS } from '../constants';

export type BentoAccent = 'cyan' | 'pink' | 'gold' | 'purple';

const ACCENT_COLOR: Record<BentoAccent, string> = {
  cyan: COLORS.cyan,
  pink: COLORS.pink,
  gold: COLORS.gold,
  purple: COLORS.purple,
};

const ACCENT_BORDER: Record<BentoAccent, string> = {
  cyan: 'rgba(0,229,255,0.20)',
  pink: 'rgba(255,45,149,0.22)',
  gold: 'rgba(255,184,0,0.22)',
  purple: 'rgba(200,77,255,0.22)',
};

const ACCENT_DIVIDER: Record<BentoAccent, string> = {
  cyan: 'rgba(0,229,255,0.12)',
  pink: 'rgba(255,45,149,0.14)',
  gold: 'rgba(255,184,0,0.14)',
  purple: 'rgba(200,77,255,0.14)',
};

export function bentoPanel(accent: BentoAccent): ViewStyle {
  return {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: ACCENT_BORDER[accent],
    marginBottom: 14,
    shadowColor: ACCENT_COLOR[accent],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
  };
}

export function bentoDividerColor(accent: BentoAccent): string {
  return ACCENT_DIVIDER[accent];
}

export const bentoHeaderStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontFamily: FONTS.display,
    letterSpacing: 1.5,
    textShadowColor: 'rgba(255,255,255,0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  } as TextStyle,
  meta: {
    color: COLORS.textMuted,
    fontSize: 10,
    letterSpacing: 1,
    fontFamily: FONTS.bodyMedium,
  } as TextStyle,
});
