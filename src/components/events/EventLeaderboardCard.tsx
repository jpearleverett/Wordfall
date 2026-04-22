/**
 * EventLeaderboardCard — MG2 in launch_blockers.md.
 *
 * Renders the top-N leaderboard for a given event plus a "you are here"
 * marker if the current player is ranked. Degrades gracefully when
 * Firestore is unavailable (returns null).
 *
 * Pairs with firestoreService.getEventLeaderboard() and
 * firestoreService.submitEventScore() (called from useRewardWiring on
 * event-scope puzzle completion).
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONTS, SHADOWS } from '../../constants';
import { firestoreService } from '../../services/firestore';

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  score: number;
}

interface Props {
  eventId: string;
  currentUserId?: string;
  /** How many rows to show by default. */
  previewSize?: number;
  /** Called when the user taps "Refresh". */
  onRefreshed?: () => void;
}

export default function EventLeaderboardCard({
  eventId,
  currentUserId,
  previewSize = 5,
  onRefreshed,
}: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    if (!firestoreService.isAvailable()) return;
    let cancelled = false;
    setLoading(true);
    firestoreService
      .getEventLeaderboard(eventId, 50)
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (!firestoreService.isAvailable()) return null;

  const visible = expanded ? entries : entries.slice(0, previewSize);
  const myIndex = currentUserId
    ? entries.findIndex((e) => e.userId === currentUserId)
    : -1;
  const myRank = myIndex >= 0 ? myIndex + 1 : null;
  const myEntry = myIndex >= 0 ? entries[myIndex] : null;
  const showMyRowSeparately =
    myEntry !== null && myIndex >= previewSize && !expanded;

  const refresh = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const rows = await firestoreService.getEventLeaderboard(eventId, 50);
      setEntries(rows);
      onRefreshed?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Event Leaderboard</Text>
        <TouchableOpacity
          onPress={refresh}
          disabled={loading}
          accessibilityRole="button"
        >
          <Text style={styles.refresh}>{loading ? '...' : 'Refresh'}</Text>
        </TouchableOpacity>
      </View>

      {entries.length === 0 && !loading && (
        <Text style={styles.empty}>No scores yet. Play a round to claim a spot!</Text>
      )}

      {visible.map((entry, idx) => {
        const rank = idx + 1;
        const isMe = entry.userId === currentUserId;
        return (
          <Row
            key={`${entry.userId}-${rank}`}
            rank={rank}
            name={entry.displayName}
            score={entry.score}
            isMe={isMe}
          />
        );
      })}

      {showMyRowSeparately && (
        <>
          <View style={styles.gap} />
          <Row
            rank={myRank ?? 0}
            name={myEntry!.displayName}
            score={myEntry!.score}
            isMe
          />
        </>
      )}

      {entries.length > previewSize && (
        <TouchableOpacity
          onPress={() => setExpanded((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Show fewer entries' : 'Show all entries'}
        >
          <Text style={styles.toggle}>
            {expanded ? 'Show fewer' : `Show all ${entries.length}`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function Row({
  rank,
  name,
  score,
  isMe,
}: {
  rank: number;
  name: string;
  score: number;
  isMe: boolean;
}) {
  const rankStyle = [styles.rank, rank <= 3 && styles.rankTop];
  return (
    <View style={[styles.row, isMe && styles.rowMe]}>
      <Text style={rankStyle}>
        {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
      </Text>
      <Text style={[styles.name, isMe && styles.nameMe]} numberOfLines={1}>
        {isMe ? 'You' : name}
      </Text>
      <Text style={styles.score}>{score.toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(26,31,69,0.7)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginTop: 12,
    marginBottom: 12,
    ...SHADOWS.soft,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontFamily: FONTS.bodySemiBold,
    letterSpacing: 0.3,
  },
  refresh: {
    color: COLORS.accent,
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    letterSpacing: 1,
  },
  empty: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: FONTS.bodyRegular,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  rowMe: {
    backgroundColor: 'rgba(0,212,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.28)',
  },
  rank: {
    width: 36,
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
  },
  rankTop: {
    fontSize: 18,
  },
  name: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
    marginRight: 8,
  },
  nameMe: {
    color: COLORS.accent,
    fontFamily: FONTS.bodyBold,
  },
  score: {
    color: COLORS.gold,
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    fontVariant: ['tabular-nums'],
  },
  gap: {
    height: 8,
  },
  toggle: {
    color: COLORS.accent,
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.5,
  },
});
