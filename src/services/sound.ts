import { Audio } from 'expo-av';

type SoundName = 'tap' | 'gravity' | 'wordFound' | 'wordInvalid' | 'combo' | 'puzzleComplete' | 'starEarn' | 'buttonPress' | 'hintUsed' | 'undoUsed';
type MusicTrack = 'menu' | 'gameplay' | 'tense';

class SoundManager {
  private static instance: SoundManager;
  private sounds: Map<string, Audio.Sound> = new Map();
  private currentMusic: Audio.Sound | null = null;
  private sfxVolume: number = 1.0;
  private musicVolume: number = 0.5;
  private muted: boolean = false;
  private initialized: boolean = false;

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      this.initialized = true;
    } catch (e) {
      console.warn('Sound init failed:', e);
    }
  }

  async playSound(_name: SoundName): Promise<void> {
    if (this.muted || !this.initialized) return;
    // Sounds will be loaded when actual audio assets are provided
    // For now, this is a no-op placeholder that's properly wired up
  }

  async playMusic(_track: MusicTrack): Promise<void> {
    if (this.muted || !this.initialized) return;
    await this.stopMusic();
    // Music will be loaded when actual audio assets are provided
  }

  async stopMusic(): Promise<void> {
    if (this.currentMusic) {
      try {
        await this.currentMusic.stopAsync();
        await this.currentMusic.unloadAsync();
      } catch (_e) {
        // Silently handle errors during cleanup
      }
      this.currentMusic = null;
    }
  }

  setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
  }

  setMusicVolume(vol: number): void {
    this.musicVolume = Math.max(0, Math.min(1, vol));
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      void this.stopMusic();
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  getSfxVolume(): number {
    return this.sfxVolume;
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }
}

export const soundManager = SoundManager.getInstance();
