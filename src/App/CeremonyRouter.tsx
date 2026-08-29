import React from 'react';
import LocalErrorBoundary from '../components/LocalErrorBoundary';
import { FeatureUnlockCeremony } from '../components/FeatureUnlockCeremony';
import { ModeUnlockCeremony } from '../components/ModeUnlockCeremony';
import { AchievementCeremony } from '../components/AchievementCeremony';
import { StreakMilestoneCeremony } from '../components/StreakMilestoneCeremony';
import { CollectionCompleteCeremony } from '../components/CollectionCompleteCeremony';
import { MilestoneCeremony } from '../components/MilestoneCeremony';
import PrestigeResetCeremony from '../components/PrestigeResetCeremony';
import SeasonPassCompleteCeremony from '../components/SeasonPassCompleteCeremony';
import { FirstPurchaseOfferModal } from '../components/FirstPurchaseOfferModal';
import { getRemoteBoolean } from '../services/remoteConfig';
import { getWing } from '../data/library';
import WingCeremonyEmblem from '../components/library/WingCeremonyEmblem';
import { GameIconName } from '../components/icons/GameIcon';
import { CeremonyItem } from '../types';
import { ceremonyEconomyGrant, ceremonyGrantLabel } from '../utils/ceremonyGrants';
import { COLORS } from '../constants';

interface CeremonyRouterProps {
  activeCeremony: CeremonyItem | null;
  onDismiss: () => void;
  /**
   * Open a just-unlocked mode. Without it ModeUnlockCeremony hides its
   * "TRY IT NOW" button (`onTryNow` is optional and gates the CTA), which is
   * how a player could unlock a mode and be given no way into it — while
   * `ceremony.tryItNow` sat translated in all six locales.
   */
  onTryMode?: (modeId: string) => void;
}

export function CeremonyRouter({ activeCeremony, onDismiss, onTryMode }: CeremonyRouterProps) {
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
          onTryNow={
            onTryMode && activeCeremony.data.modeId
              ? () => onTryMode(activeCeremony.data.modeId as string)
              : undefined
          }
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
          rewardLabel={(() => {
            // Same source the pop-time grant used, so what is shown is
            // exactly what was credited.
            const grant = ceremonyEconomyGrant(activeCeremony);
            return grant ? ceremonyGrantLabel(grant) : undefined;
          })()}
          accentColor={COLORS.orange}
          onDismiss={onDismiss}
        />
      )}
      {activeCeremony?.type === 'flawless_streak_milestone' && (
        <MilestoneCeremony
          ribbon="FLAWLESS STREAK!"
          icon={'\u{1F31F}'}
          title={activeCeremony.data.label || `${activeCeremony.data.streak} Flawless!`}
          description={`You solved ${activeCeremony.data.streak} puzzles in a row without hints, undos, or shuffle.`}
          rewardLabel={(() => {
            // Same source the pop-time grant uses, so what is shown is
            // exactly what was credited.
            const grant = ceremonyEconomyGrant(activeCeremony);
            return grant ? ceremonyGrantLabel(grant) : undefined;
          })()}
          accentColor={COLORS.gold}
          buttonText="INCREDIBLE"
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
      {activeCeremony?.type === 'wing_complete' && (() => {
        // Grand Library story beat: each wing restores in its own colors,
        // under its own emblem, with Folio's per-wing line. getWing() never
        // returns undefined (annex fallback), so remote/procedural wingIds
        // are safe here too. Reward capsules are built from the SAME grant
        // source the pop-time credit used, so what is shown is exactly what
        // was paid (missing/empty reward → no capsules).
        const wing = getWing(activeCeremony.data.wingId);
        const grant = ceremonyEconomyGrant(activeCeremony);
        const capsules: Array<{ icon: GameIconName; label: string; color: string }> = [];
        if (grant?.coins) capsules.push({ icon: 'coin', label: `+${grant.coins}`, color: COLORS.gold });
        if (grant?.gems) capsules.push({ icon: 'gem', label: `+${grant.gems}`, color: COLORS.cyan });
        if (grant?.hintTokens) capsules.push({ icon: 'hint', label: `+${grant.hintTokens}`, color: COLORS.purpleLight });
        return (
          <MilestoneCeremony
            ribbon="WING RESTORED"
            emblem={<WingCeremonyEmblem wingId={activeCeremony.data.wingId} accent={wing.accent} iconName={wing.icon} size={170} />}
            title={`${wing.name} Wing Restored!`}
            description={wing.restorationLine}
            rewardCapsules={capsules.length > 0 ? capsules : undefined}
            rewardLabel={
              // Rare-tile-only (or otherwise capsule-less) grants still get
              // the text chip so no credited reward goes unshown.
              capsules.length === 0 && grant ? ceremonyGrantLabel(grant) : undefined
            }
            accentColor={wing.accent}
            buttonText="VISIT THE LIBRARY"
            onDismiss={onDismiss}
          />
        );
      })()}
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
          rewardLabel={(() => {
            // Same source the pop-time grant used, so what is shown is
            // exactly what was credited (dismiss-time grants could be lost
            // to process death or double-paid on re-render).
            const grant = ceremonyEconomyGrant(activeCeremony);
            return grant ? ceremonyGrantLabel(grant) : undefined;
          })()}
          onDismiss={onDismiss}
        />
      )}
      {activeCeremony?.type === 'prestige' && (
        getRemoteBoolean('prestigeCeremonyEnabled') && activeCeremony.data?.level ? (
          <PrestigeResetCeremony
            level={activeCeremony.data.level}
            label={activeCeremony.data.label || 'Prestige'}
            icon={activeCeremony.data.icon || '\u{1F31F}'}
            xpMultiplier={activeCeremony.data.xpMultiplier ?? 1.5}
            permanentBonuses={activeCeremony.data.permanentBonuses ?? []}
            cosmeticReward={activeCeremony.data.cosmeticReward}
            onDismiss={onDismiss}
          />
        ) : (
          <MilestoneCeremony
            ribbon="PRESTIGE!"
            icon={activeCeremony.data?.icon || '\u{1F31F}'}
            title={activeCeremony.data?.title || 'Prestige Level Up!'}
            description={activeCeremony.data?.description || 'You have ascended to a new prestige tier!'}
            accentColor={COLORS.gold}
            onDismiss={onDismiss}
          />
        )
      )}
      {activeCeremony?.type === 'first_win' && (
        <MilestoneCeremony
          ribbon="FIRST VICTORY!"
          icon={'\u{1F389}'}
          title="You Did It!"
          description={`Your first puzzle is complete! +${activeCeremony.data.coins} coins, +${activeCeremony.data.gems} gems, and a free Mystery Wheel spin! Folio the archivist stirs: 'Words! Real words! The Library will hear of this.'`}
          accentColor={COLORS.gold}
          tips={activeCeremony.data.tips}
          rewardLabel={`+${activeCeremony.data.coins} coins, +${activeCeremony.data.gems} gems`}
          buttonText="AMAZING!"
          onDismiss={onDismiss}
        />
      )}
      {activeCeremony?.type === 'daily_quest_claim' && (
        <MilestoneCeremony
          ribbon="DAILY QUEST CLAIMED"
          icon={'\u{1F4DC}'}
          title="Quest Complete!"
          description="Reward added to your stash. Check back tomorrow for new quests."
          accentColor={COLORS.gold}
          buttonText="NICE"
          onDismiss={onDismiss}
        />
      )}
      {activeCeremony?.type === 'first_purchase_offer' && (
        <FirstPurchaseOfferModal onDismiss={onDismiss} />
      )}
      {activeCeremony?.type === 'season_pass_complete' && (
        <SeasonPassCompleteCeremony
          seasonName={activeCeremony.data?.seasonName}
          tier={activeCeremony.data?.tier}
          rewardLabels={activeCeremony.data?.rewardLabels}
          cosmeticSetId={activeCeremony.data?.cosmeticSetId}
          onDismiss={onDismiss}
        />
      )}
      {activeCeremony?.type === 'inbox_reward' && (
        <MilestoneCeremony
          ribbon={
            activeCeremony.data?.rewardType === 'weekly_leaderboard'
              ? 'WEEKLY REWARDS!'
              : activeCeremony.data?.rewardType === 'club_goal_complete'
                ? 'CLUB GOAL COMPLETE!'
                : 'REWARDS DELIVERED!'
          }
          icon={activeCeremony.data?.icon || '\u{1F4E5}'}
          title={activeCeremony.data?.title || 'Rewards Delivered!'}
          description={
            activeCeremony.data?.description ||
            'Rewards you earned while you were away have been added to your stash.'
          }
          // Display-only: the amounts were already credited by
          // useRewardInboxClaim (rules-enforced exactly-once claim), so this
          // type is deliberately absent from ceremonyEconomyGrant.
          rewardLabel={activeCeremony.data?.rewardLabel}
          accentColor={COLORS.gold}
          buttonText="COLLECT"
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
