import { STREAK, STAR_MILESTONES, ECONOMY } from '../../constants';
import { EVENT_TEMPLATES } from '../events';
import { GRAND_CHALLENGES } from '../grandChallenges';
import {
  PROFILE_FRAMES,
  PROFILE_TITLES,
  COSMETIC_THEMES,
  hasFrame,
  hasTheme,
  hasTitle,
} from '../cosmetics';
import { PRESTIGE_LEVELS } from '../prestigeSystem';
import { REFERRAL_MILESTONES } from '../referralSystem';
import { SEASON_PASS_TIERS } from '../seasonPass';
import { SEASONAL_QUESTS } from '../seasonalQuests';
import { SEASONAL_WHEELS } from '../seasonalWheels';
import { VIP_STREAK_BONUSES } from '../vipBenefits';

function inferProfileKind(id?: string): 'frame' | 'title' | 'theme' | null {
  if (!id) return null;
  if (
    id.startsWith('theme_') ||
    COSMETIC_THEMES.some((theme) => theme.id === id)
  ) {
    return 'theme';
  }
  if (
    id.startsWith('title_') ||
    id.endsWith('_title') ||
    id === 'vip_champion' ||
    id === 'gauntlet_survivor' ||
    id === 'blitz_warrior' ||
    PROFILE_TITLES.some((title) => title.id === id)
  ) {
    return 'title';
  }
  if (
    id.startsWith('frame_') ||
    id.endsWith('_frame') ||
    id === 'streak_30_frame' ||
    id === 'season_champion_frame' ||
    id === 'cosmic_frame' ||
    id === 'vip_silver' ||
    id === 'vip_gold' ||
    id === 'frame_speed' ||
    PROFILE_FRAMES.some((frame) => frame.id === id)
  ) {
    return 'frame';
  }
  return null;
}

function assertProfileCosmeticExists(id: string) {
  const kind = inferProfileKind(id);
  expect(kind).not.toBeNull();

  if (kind === 'frame') {
    expect(hasFrame(id)).toBe(true);
    return;
  }
  if (kind === 'title') {
    expect(hasTitle(id)).toBe(true);
    return;
  }
  if (kind === 'theme') {
    expect(hasTheme(id)).toBe(true);
  }
}

describe('profile cosmetic catalog integrity', () => {
  it('includes every event exclusive frame/title reward', () => {
    EVENT_TEMPLATES.forEach((event) => {
      const reward = event.exclusiveReward;
      if (!reward || (reward.type !== 'frame' && reward.type !== 'title')) return;
      assertProfileCosmeticExists(reward.id);
    });
  });

  it('includes every referral cosmetic reward', () => {
    REFERRAL_MILESTONES.forEach((milestone) => {
      const cosmeticId = milestone.rewards.cosmeticId;
      if (!cosmeticId) return;
      assertProfileCosmeticExists(cosmeticId);
    });
  });

  it('includes every prestige frame/title reward', () => {
    PRESTIGE_LEVELS.forEach((level) => {
      if (level.cosmeticReward.type === 'frame' || level.cosmeticReward.type === 'title') {
        assertProfileCosmeticExists(level.cosmeticReward.id);
      }
    });
  });

  it('includes every streak and login profile cosmetic reward', () => {
    Object.values(STREAK.milestoneRewards).forEach((reward) => {
      if ('cosmetic' in reward && reward.cosmetic) {
        const kind = inferProfileKind(reward.cosmetic);
        if (kind) assertProfileCosmeticExists(reward.cosmetic);
      }
    });

    ECONOMY.loginRewards.forEach((reward) => {
      if (reward.cosmetic) {
        const kind = inferProfileKind(reward.cosmetic);
        if (kind) assertProfileCosmeticExists(reward.cosmetic);
      }
    });
  });

  it('includes every VIP, quest, grand challenge, season pass, and star milestone profile cosmetic', () => {
    VIP_STREAK_BONUSES.forEach((bonus) => {
      const id = bonus.extraReward?.id;
      if (!id) return;
      const kind = inferProfileKind(id);
      if (kind) assertProfileCosmeticExists(id);
    });

    SEASONAL_QUESTS.forEach((quest) => {
      const id = quest.finalReward.cosmetic?.id;
      if (!id) return;
      const kind = inferProfileKind(id);
      if (kind) assertProfileCosmeticExists(id);
    });

    GRAND_CHALLENGES.forEach((challenge) => {
      if (!challenge.reward.cosmetic) return;
      const kind = inferProfileKind(challenge.reward.cosmetic);
      if (kind) assertProfileCosmeticExists(challenge.reward.cosmetic);
    });

    SEASON_PASS_TIERS.forEach((tier) => {
      const id = tier.premiumReward.cosmeticId;
      if (!id) return;
      const kind = inferProfileKind(id);
      if (kind) assertProfileCosmeticExists(id);
    });

    STAR_MILESTONES.forEach((milestone) => {
      assertProfileCosmeticExists(milestone.reward);
    });
  });

  it('includes every seasonal wheel profile cosmetic reward', () => {
    Object.values(SEASONAL_WHEELS)
      .flat()
      .forEach((segment) => {
        const id = segment.reward.cosmetic;
        if (!id) return;
        const kind = inferProfileKind(id);
        if (kind) assertProfileCosmeticExists(id);
      });
  });
});
