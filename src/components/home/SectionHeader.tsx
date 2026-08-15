import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../../constants';

interface SectionHeaderProps {
  /** Small-caps section label, e.g. "LIVE NOW". */
  label: string;
  /** Optional right-aligned meta text (count, timer, etc.). */
  meta?: string;
  /** Accent color for the tick + label. Defaults to the cyan section accent. */
  accent?: string;
}

/**
 * SectionHeader — shared label that groups HomeScreen (and other hub screens')
 * cards into named bands. Top grossers never stack 12 anonymous cards; a thin
 * accent tick + small-caps label + hairline rule gives the scroll a scannable
 * table of contents at near-zero render cost.
 */
export default function SectionHeader({ label, meta, accent = COLORS.teal }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.tick, { backgroundColor: accent }]} />
      <Text style={[styles.label, { color: accent }]}>{label}</Text>
      <LinearGradient
        colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.rule}
      />
      {meta != null && <Text style={styles.meta}>{meta}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 10,
    gap: 8,
  },
  tick: {
    width: 3,
    height: 12,
    borderRadius: 2,
  },
  label: {
    fontFamily: FONTS.display,
    fontSize: 12,
    letterSpacing: 3,
  },
  rule: {
    flex: 1,
    height: 1,
  },
  meta: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
});
