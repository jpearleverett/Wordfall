/**
 * Visual harness entries — curated screens + modals to screenshot.
 *
 * Each entry provides the screen under test + a props object. Import
 * directly from src/ so the harness reflects real source changes.
 *
 * When adding a new entry for a screen that needs context providers,
 * wrap it here via `<MockProviders>...</MockProviders>` (defined in
 * `./mocks.tsx`) so the component can subscribe to zustand / context.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MockProviders } from './mocks';

// ── Imports from src/ (pure-RN only — no native modules) ──────────────
// Components that ship in modals/overlays and need minimal context:
import PostStreakBreakOffer from '../src/components/PostStreakBreakOffer';
import SeasonPassCompleteCeremony from '../src/components/SeasonPassCompleteCeremony';
import EventLeaderboardCard from '../src/components/events/EventLeaderboardCard';
import { FlawlessBadge } from '../src/components/victory/FlawlessBadge';

export interface HarnessEntry {
  id: string;           // URL slug, also filename for screenshots
  label: string;        // Shown in sidebar
  render: () => React.ReactNode;
}

export const ENTRIES: HarnessEntry[] = [
  {
    id: 'post-streak-break-offer',
    label: 'PostStreakBreakOffer (R5)',
    render: () => (
      <MockProviders>
        <PostStreakBreakOffer
          visible
          brokenStreakCount={14}
          gemsAvailable={120}
          onRestore={() => {}}
          onDismiss={() => {}}
        />
      </MockProviders>
    ),
  },
  {
    id: 'post-streak-break-offer-insufficient-gems',
    label: 'PostStreakBreakOffer — insufficient gems',
    render: () => (
      <MockProviders>
        <PostStreakBreakOffer
          visible
          brokenStreakCount={30}
          gemsAvailable={5}
          onRestore={() => {}}
          onDismiss={() => {}}
        />
      </MockProviders>
    ),
  },
  {
    id: 'season-pass-complete-ceremony',
    label: 'SeasonPassCompleteCeremony (MG1)',
    render: () => (
      <MockProviders>
        <View style={styles.fullBleedCeremonyHost}>
          <SeasonPassCompleteCeremony
            seasonName="Celestial Voyage"
            tier={50}
            rewardLabels={[
              '1000 Coins',
              '100 Gems',
              'Legendary Frame',
              'Emote Pack',
              'Exclusive Title',
            ]}
            cosmeticSetId="celestial_voyage_legendary"
            onDismiss={() => {}}
          />
        </View>
      </MockProviders>
    ),
  },
  {
    id: 'event-leaderboard-card-populated',
    label: 'EventLeaderboardCard — 5 rows',
    render: () => (
      <MockProviders
        overrides={{
          mockEventLeaderboard: [
            { userId: 'u1', displayName: 'WordWarrior', score: 48200 },
            { userId: 'u2', displayName: 'LetterLord', score: 41100 },
            { userId: 'u3', displayName: 'You', score: 38950 },
            { userId: 'u4', displayName: 'SilentRook', score: 37200 },
            { userId: 'u5', displayName: 'GravityCat', score: 35100 },
            { userId: 'u6', displayName: 'NightOwl', score: 33900 },
            { userId: 'u7', displayName: 'TileTamer', score: 31800 },
          ],
        }}
      >
        <View style={styles.cardHost}>
          <EventLeaderboardCard
            eventId="demo-event"
            currentUserId="u3"
            previewSize={5}
          />
        </View>
      </MockProviders>
    ),
  },
  {
    id: 'event-leaderboard-card-empty',
    label: 'EventLeaderboardCard — empty state',
    render: () => (
      <MockProviders overrides={{ mockEventLeaderboard: [] }}>
        <View style={styles.cardHost}>
          <EventLeaderboardCard eventId="demo-event" />
        </View>
      </MockProviders>
    ),
  },
  {
    id: 'flawless-badge',
    label: 'FlawlessBadge',
    render: () => (
      <MockProviders>
        <View style={styles.cardHost}>
          <FlawlessBadge visible />
        </View>
      </MockProviders>
    ),
  },
];

const styles = StyleSheet.create({
  cardHost: {
    padding: 16,
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  fullBleedCeremonyHost: {
    flex: 1,
    position: 'relative',
  },
});
