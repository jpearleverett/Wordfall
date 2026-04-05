import {
  tapHaptic,
  wordFoundHaptic,
  comboHaptic,
  errorHaptic,
  successHaptic,
  selectionHaptic,
  chainReactionHaptic,
  gravityLandHaptic,
  levelCompleteHaptic,
  prestigeHaptic,
  boosterActivateHaptic,
  streakMilestoneHaptic,
  setHapticsEnabled,
} from '../../services/haptics';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' },
}));

const Haptics = require('expo-haptics');

describe('Haptics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setHapticsEnabled(true);
  });

  it('has 12 distinct haptic functions', () => {
    const fns = [
      tapHaptic, wordFoundHaptic, comboHaptic, errorHaptic, successHaptic,
      selectionHaptic, chainReactionHaptic, gravityLandHaptic,
      levelCompleteHaptic, prestigeHaptic, boosterActivateHaptic, streakMilestoneHaptic,
    ];
    expect(fns.length).toBe(12);
    fns.forEach((fn) => expect(typeof fn).toBe('function'));
  });

  it('tapHaptic uses Light impact', async () => {
    await tapHaptic();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('wordFoundHaptic uses Medium impact', async () => {
    await wordFoundHaptic();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
  });

  it('comboHaptic uses Heavy impact', async () => {
    await comboHaptic();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('heavy');
  });

  it('errorHaptic uses Error notification', async () => {
    await errorHaptic();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('error');
  });

  it('selectionHaptic uses selection feedback', async () => {
    await selectionHaptic();
    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });

  it('gravityLandHaptic uses Light impact', async () => {
    await gravityLandHaptic();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('does nothing when haptics disabled', async () => {
    setHapticsEnabled(false);
    await tapHaptic();
    await wordFoundHaptic();
    await comboHaptic();
    await selectionHaptic();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });
});
