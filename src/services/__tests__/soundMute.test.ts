/**
 * Mute/un-mute BGM contract.
 *
 * App.tsx derives `muted` from "all three volume sliders are zero", so raising
 * a slider back above zero calls setMuted(false). Every playMusic call site is
 * transition-triggered (level start, tension edge, screen mount), so the sound
 * manager itself has to resume the last requested track — otherwise the Music
 * slider audibly does nothing until the next transition.
 */

(global as any).__DEV__ = false;
(global as any).__audioPlayers = [];

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn((source: any) => {
    const player = {
      source,
      volume: 0,
      loop: false,
      play: jest.fn(),
      pause: jest.fn(),
      remove: jest.fn(),
      seekTo: jest.fn(),
    };
    (global as any).__audioPlayers.push(player);
    return player;
  }),
  setAudioModeAsync: jest.fn(async () => {}),
}));

import { soundManager } from '../sound';

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('soundManager mute/un-mute', () => {
  beforeAll(async () => {
    // Skip the background DSP pre-warm — irrelevant here and slow.
    jest.spyOn(soundManager as any, 'preWarmAll').mockResolvedValue(undefined);
    await soundManager.init();
  });

  beforeEach(() => {
    soundManager.setMuted(false);
  });

  it('resumes the track that was playing when the player un-mutes', async () => {
    await soundManager.playMusic('menu', { crossfadeMs: 0 });
    expect(soundManager.getCurrentTrack()).toBe('menu');

    soundManager.setMuted(true);
    await flush();
    expect(soundManager.getCurrentTrack()).toBeNull();

    soundManager.setMuted(false);
    await flush();
    expect(soundManager.getCurrentTrack()).toBe('menu');
  });

  it('plays a track that was requested while muted once un-muted', async () => {
    soundManager.setMuted(true);
    await flush();
    await soundManager.playMusic('tense', { crossfadeMs: 0 });
    expect(soundManager.getCurrentTrack()).toBeNull();

    soundManager.setMuted(false);
    await flush();
    expect(soundManager.getCurrentTrack()).toBe('tense');
  });

  it('does not restart music when setMuted(false) runs while already unmuted', async () => {
    await soundManager.playMusic('menu', { crossfadeMs: 0 });
    const before = (global as any).__audioPlayers.length;
    soundManager.setMuted(false);
    await flush();
    expect((global as any).__audioPlayers.length).toBe(before);
    expect(soundManager.getCurrentTrack()).toBe('menu');
  });
});
