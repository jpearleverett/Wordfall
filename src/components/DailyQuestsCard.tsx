import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, TYPOGRAPHY } from '../constants';
import { bentoPanel, bentoDividerColor, bentoHeaderStyles } from '../styles/bentoPanel';
import {
  DailyQuest,
  DailyQuestReward,
  getQuestTemplate,
} from '../data/dailyQuests';
import GameIcon, { GameIconName } from './icons/GameIcon';

interface Props {
  quests: DailyQuest[];
  onClaim: (templateId: string) => void;
}

function RewardLabel({ reward }: { reward: DailyQuestReward }) {
  const parts: Array<{ amount: string; icon?: GameIconName }> = [];
  if (reward.coins) parts.push({ amount: `${reward.coins}`, icon: 'coin' });
  if (reward.gems) parts.push({ amount: `${reward.gems}`, icon: 'gem' });
  if (reward.hintTokens) parts.push({ amount: `${reward.hintTokens}`, icon: 'hint' });
  if (reward.boosterTokens) parts.push({ amount: `${reward.boosterTokens}`, icon: 'bolt' });
  if (reward.xp) parts.push({ amount: `${reward.xp}XP` });
  return (
    <View style={styles.rewardRow}>
      {parts.map((p, i) => (
        <View key={i} style={styles.rewardPart}>
          <Text style={styles.rewardLabel}>{p.amount}</Text>
          {p.icon ? <GameIcon name={p.icon} size={13} /> : null}
        </View>
      ))}
    </View>
  );
}

export default function DailyQuestsCard({ quests, onClaim }: Props) {
  if (!quests || quests.length === 0) return null;

  const completed = quests.filter((q) => q.claimed).length;

  return (
    <LinearGradient colors={GRADIENTS.surfaceCard} style={styles.card}>
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
              <RewardLabel reward={tpl.reward} />
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
    ...bentoPanel('cyan'),
    padding: 14,
  },
  headerRow: {
    ...bentoHeaderStyles.row,
    borderBottomColor: bentoDividerColor('cyan'),
  },
  title: {
    ...bentoHeaderStyles.title,
  },
  meta: {
    ...bentoHeaderStyles.meta,
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
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  rewardPart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  rewardLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
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
