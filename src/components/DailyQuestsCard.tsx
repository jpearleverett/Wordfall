import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, TYPOGRAPHY } from '../constants';
import {
  DailyQuest,
  DailyQuestReward,
  getQuestTemplate,
} from '../data/dailyQuests';

interface Props {
  quests: DailyQuest[];
  onClaim: (templateId: string) => void;
}

function rewardLabel(reward: DailyQuestReward): string {
  const parts: string[] = [];
  if (reward.coins) parts.push(`${reward.coins}🪙`);
  if (reward.gems) parts.push(`${reward.gems}💎`);
  if (reward.hintTokens) parts.push(`${reward.hintTokens}💡`);
  if (reward.boosterTokens) parts.push(`${reward.boosterTokens}⚡`);
  if (reward.xp) parts.push(`${reward.xp}XP`);
  return parts.join(' ');
}

export default function DailyQuestsCard({ quests, onClaim }: Props) {
  if (!quests || quests.length === 0) return null;

  const completed = quests.filter((q) => q.claimed).length;

  return (
    <LinearGradient colors={GRADIENTS.surfaceCard} style={[styles.card, SHADOWS.medium]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Daily Quests</Text>
        <Text style={styles.meta}>
          {completed}/{quests.length}
        </Text>
      </View>
      {quests.map((q) => {
        const tpl = getQuestTemplate(q.templateId);
        if (!tpl) return null;
        const pct = Math.min(100, (q.progress / tpl.target) * 100);
        const ready = q.progress >= tpl.target && !q.claimed;
        return (
          <View key={q.templateId} style={styles.row}>
            <View style={styles.infoBlock}>
              <Text style={[styles.label, q.claimed && styles.labelDone]}>
                {q.claimed ? '✓ ' : ''}{tpl.title}
              </Text>
              <Text style={styles.rewardLabel}>{rewardLabel(tpl.reward)}</Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.max(pct, 2)}%` },
                  q.claimed && styles.fillDone,
                ]}
              />
              <Text style={styles.progressText}>
                {q.progress}/{tpl.target}
              </Text>
            </View>
            {ready ? (
              <Pressable style={styles.claimBtn} onPress={() => onClaim(q.templateId)}>
                <Text style={styles.claimBtnText}>CLAIM</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    ...TYPOGRAPHY.sectionTitle,
    color: COLORS.textPrimary,
  },
  meta: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  infoBlock: {
    flex: 1,
    marginRight: 8,
  },
  label: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
  },
  labelDone: {
    color: COLORS.green,
  },
  rewardLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  track: {
    width: 90,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.cellDefault,
    overflow: 'hidden',
    justifyContent: 'center',
    marginRight: 8,
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: COLORS.accent,
  },
  fillDone: {
    backgroundColor: COLORS.green,
  },
  progressText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
  },
  claimBtn: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  claimBtnText: {
    ...TYPOGRAPHY.caption,
    color: '#1a001a',
    fontWeight: '800',
    letterSpacing: 1,
  },
});
