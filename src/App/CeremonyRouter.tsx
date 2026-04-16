import React from 'react';
import LocalErrorBoundary from '../components/LocalErrorBoundary';
import { FeatureUnlockCeremony } from '../components/FeatureUnlockCeremony';
import { ModeUnlockCeremony } from '../components/ModeUnlockCeremony';
import { AchievementCeremony } from '../components/AchievementCeremony';
import { StreakMilestoneCeremony } from '../components/StreakMilestoneCeremony';
import { CollectionCompleteCeremony } from '../components/CollectionCompleteCeremony';
import { MilestoneCeremony } from '../components/MilestoneCeremony';
import { CeremonyItem } from '../types';
import { COLORS } from '../constants';

interface CeremonyEconomy {
  addCoins: (n: number) => void;
  addGems: (n: number) => void;
}

interface CeremonyRouterProps {
  activeCeremony: CeremonyItem | null;
  onDismiss: () => void;
  economy: CeremonyEconomy;
}

export function CeremonyRouter({ activeCeremony, onDismiss, economy }: CeremonyRouterProps) {
  return (
    <LocalErrorBoundary
      scope="ceremony"
      title="Couldn't show that reward"
      actionLabel="Skip"
      onReset={onDismiss}
    >
      {activeCeremony?.type === 'feature_unlock' && (
        <FeatureUnlockCeremony
          icon={activeCeremony.data.icon}
          title={activeCeremony.data.title}
          description={activeCeremony.data.description}
          accentColor={activeCeremony.data.accentColor}
          onDismiss={onDismiss}
        />
      )}
      {activeCeremony?.type === 'mode_unlock' && (
        <ModeUnlockCeremony
          modeName={activeCeremony.data.modeName}
          modeIcon={activeCeremony.data.modeIcon}
          modeDescription={activeCeremony.data.modeDescription}
          modeColor={activeCeremony.data.modeColor}
          onDismiss={onDismiss}
        />
      )}
      {activeCeremony?.type === 'achievement' && (
        <AchievementCeremony
          icon={activeCeremony.data.icon}
          name={activeCeremony.data.name}
          description={activeCeremony.data.description}
          tier={activeCeremony.data.tier}
          reward={activeCeremony.data.reward}
          onDismiss={onDismiss}
        />
      )}
      {activeCeremony?.type === 'streak_milestone' && (
        <StreakMilestoneCeremony
          milestone={activeCeremony.data.streakCount}
          onDismiss={onDismiss}
        />
      )}
      {activeCeremony?.type === 'collection_complete' && (
        <CollectionCompleteCeremony
          collectionIcon={activeCeremony.data.icon}
          collectionName={activeCeremony.data.name}
          reward={activeCeremony.data.reward}
          onDismiss={onDismiss}
        />
      )}
      {activeCeremony?.type === 'mystery_wheel_jackpot' && (
        <MilestoneCeremony
          ribbon="JACKPOT!"
          icon={activeCeremony.data.icon || '\u{1F3B0}'}
          title={activeCeremony.data.label || 'Rare Reward!'}
          description="The Mystery Wheel delivered something special!"
          accentColor={COLORS.gold}
          rewardLabel={activeCeremony.data.rewardLabel}
          onDismiss={onDismiss}
        />
      )}
      {activeCeremony?.type === 'win_streak_milestone' && (
        <MilestoneCeremony
          ribbon="WIN STREAK!"
          icon={'\u{1F525}'}
          title={activeCeremony.data.label || `${activeCeremony.data.streak} Wins!`}
          description={`You won ${activeCeremony.data.streak} puzzles in a row!`}
          accentColor={COLORS.orange}
          onDismiss={onDismiss}
        />
      )}
      {activeCeremony?.type === 'first_rare_tile' && (
        <MilestoneCeremony
          ribbon="FIRST RARE TILE!"
          icon={'\u{1FA99}'}
          title="Rare Tile Found!"
          description={`You found the "${activeCeremony.data.letter}" tile! Collect all 26 letters for rewards.`}
          accentColor={COLORS.gold}
          buttonText="COLLECT"
          onDismiss={onDismiss}
        />
      )}
      {activeCeremony?.type === 'first_booster' && (
        <MilestoneCeremony
          ribbon="POWER UP!"
          icon={'\u{26A1}'}
          title="Boosters Unlocked!"
          description="Use boosters to freeze columns, preview moves, or shuffle filler letters!"
          accentColor={COLORS.accent}
          buttonText="TRY IT"
          onDismiss={onDismiss}
        />
      )}
      {activeCeremony?.type === 'wing_complete' && (
        <MilestoneCeremony
          ribbon="WING RESTORED"
          icon={'\u{1F4DA}'}
          title={`${activeCeremony.data.wingName} Complete!`}
          description="Another wing of the library has been fully restored!"
          accentColor={COLORS.teal}
          onDismiss={onDismiss}
        />
      )}
      {activeCeremony?.type === 'word_mastery_gold' && (
        <MilestoneCeremony
          ribbon="GOLD MASTERY"
          icon={'\u{1F451}'}
          title={`"${activeCeremony.data.word}" Mastered!`}
          description="Found this word 5 times! It now has a gold border in your Atlas."
          accentColor={COLORS.gold}
          onDismiss={onDismiss}
        />
      )}
      {activeCeremony?.type === 'first_mode_clear' && (
        <MilestoneCeremony
          ribbon="MODE CONQUERED"
          icon={'\u{1F3C6}'}
          title={`${activeCeremony.data.modeName} Cleared!`}
          description="First victory in this mode! Try it again for higher scores."
          accentColor={COLORS.green}
          onDismiss={onDismiss}
        />
      )}
      {activeCeremony?.type === 'wildcard_earned' && (
        <MilestoneCeremony
          ribbon="WILDCARD!"
          icon={'\u{1F0CF}'}
          title="Wildcard Tile Earned!"
          description="5 duplicate tiles converted into a wildcard. Use it to complete any set!"
          accentColor={COLORS.purple}
          onDismiss={onDismiss}
        />
      )}
      {activeCeremony?.type === 'quest_step_complete' && (
        <MilestoneCeremony
          ribbon="QUEST COMPLETE!"
          icon={activeCeremony.data.icon || '\u2728'}
          title={activeCeremony.data.title || 'Quest Step Complete!'}
          description={activeCeremony.data.description}
          accentColor={COLORS.green}
          rewardLabel={activeCeremony.data.description}
          onDismiss={() => {
            if (activeCeremony.data.rewardCoins) economy.addCoins(activeCeremony.data.rewardCoins);
            if (activeCeremony.data.rewardGems) economy.addGems(activeCeremony.data.rewardGems);
            onDismiss();
          }}
        />
      )}
      {activeCeremony?.type === 'prestige' && (
        <MilestoneCeremony
          ribbon="PRESTIGE!"
          icon={activeCeremony.data?.icon || '\u{1F31F}'}
          title={activeCeremony.data?.title || 'Prestige Level Up!'}
          description={activeCeremony.data?.description || 'You have ascended to a new prestige tier!'}
          accentColor={COLORS.gold}
          onDismiss={onDismiss}
        />
      )}
      {activeCeremony?.type === 'first_win' && (
        <MilestoneCeremony
          ribbon="FIRST VICTORY!"
          icon={'\u{1F389}'}
          title="You Did It!"
          description={`Your first puzzle is complete! +${activeCeremony.data.coins} coins, +${activeCeremony.data.gems} gems, and a free Mystery Wheel spin!`}
          accentColor={COLORS.gold}
          rewardLabel={`+${activeCeremony.data.coins} coins, +${activeCeremony.data.gems} gems`}
          buttonText="AMAZING!"
          onDismiss={onDismiss}
        />
      )}
      {activeCeremony?.type === 'starter_pack_unlocked' && (
        <MilestoneCeremony
          ribbon="SPECIAL OFFER!"
          icon={'\u{1F4E6}'}
          title="Starter Pack Available!"
          description="A limited-time offer has been unlocked just for you. Check the Shop for great value!"
          accentColor={COLORS.gold}
          buttonText="VIEW OFFER"
          onDismiss={onDismiss}
        />
      )}
    </LocalErrorBoundary>
  );
}
