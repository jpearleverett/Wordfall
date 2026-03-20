import { Audio } from 'expo-av';

type SoundName = 'tap' | 'gravity' | 'wordFound' | 'wordInvalid' | 'combo' | 'puzzleComplete' | 'starEarn' | 'buttonPress' | 'hintUsed' | 'undoUsed';
type MusicTrack = 'menu' | 'gameplay' | 'tense';

type ToneSpec = {
  freqs: number[];
  duration: number;
  volume?: number;
  pulse?: number;
};

type ProgressionSpec = {
  chords: number[][];
  stepDuration: number;
  volume?: number;
};

const SAMPLE_RATE = 22050;
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const SOUND_DEFS: Record<SoundName, ToneSpec> = {
  tap: { freqs: [880, 1320], duration: 0.08, volume: 0.18 },
  gravity: { freqs: [220, 330], duration: 0.22, volume: 0.24, pulse: 8 },
  wordFound: { freqs: [523.25, 659.25, 783.99], duration: 0.28, volume: 0.22 },
  wordInvalid: { freqs: [180, 160], duration: 0.18, volume: 0.2 },
  combo: { freqs: [659.25, 783.99, 1046.5], duration: 0.35, volume: 0.22 },
  puzzleComplete: { freqs: [523.25, 659.25, 783.99, 1046.5], duration: 0.75, volume: 0.23 },
  starEarn: { freqs: [988, 1318], duration: 0.22, volume: 0.19 },
  buttonPress: { freqs: [740, 988], duration: 0.12, volume: 0.16 },
  hintUsed: { freqs: [440, 587.33], duration: 0.18, volume: 0.18 },
  undoUsed: { freqs: [261.63, 220], duration: 0.22, volume: 0.18 },
};

const MUSIC_DEFS: Record<MusicTrack, ProgressionSpec> = {
  menu: {
    chords: [
      [261.63, 329.63, 392.0],
      [293.66, 369.99, 440.0],
      [329.63, 392.0, 493.88],
      [293.66, 369.99, 440.0],
    ],
    stepDuration: 1.2,
    volume: 0.12,
  },
  gameplay: {
    chords: [
      [220.0, 277.18, 329.63],
      [246.94, 311.13, 369.99],
      [196.0, 246.94, 293.66],
      [220.0, 277.18, 329.63],
    ],
    stepDuration: 1.0,
    volume: 0.11,
  },
  tense: {
    chords: [
      [261.63, 311.13, 392.0],
      [293.66, 349.23, 440.0],
      [329.63, 392.0, 493.88],
      [349.23, 440.0, 523.25],
    ],
    stepDuration: 0.75,
    volume: 0.1,
  },
};

function envelope(progress: number, attack = 0.02, release = 0.12): number {
  if (progress < attack) return progress / attack;
  if (progress > 1 - release) return Math.max(0, (1 - progress) / release);
  return 1;
}

function clamp(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function encodeBase64(bytes: Uint8Array): string {
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const triple = (a << 16) | (b << 8) | c;

    output += BASE64_CHARS[(triple >> 18) & 0x3f];
    output += BASE64_CHARS[(triple >> 12) & 0x3f];
    output += i + 1 < bytes.length ? BASE64_CHARS[(triple >> 6) & 0x3f] : '=';
    output += i + 2 < bytes.length ? BASE64_CHARS[triple & 0x3f] : '=';
  }
  return output;
}

function createWavDataUri(samples: Int16Array, sampleRate: number): string {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const dataSize = samples.length * 2;
  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const bytes = new Uint8Array(44 + dataSize);
  bytes.set(new Uint8Array(header), 0);
  for (let i = 0; i < samples.length; i++) {
    const value = samples[i];
    bytes[44 + i * 2] = value & 0xff;
    bytes[44 + i * 2 + 1] = (value >> 8) & 0xff;
  }

  return `data:audio/wav;base64,${encodeBase64(bytes)}`;
}

function synthesizeTone(spec: ToneSpec): string {
  const total = Math.floor(SAMPLE_RATE * spec.duration);
  const samples = new Int16Array(total);
  const volume = spec.volume ?? 0.2;

  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const progress = i / total;
    let sample = 0;
    spec.freqs.forEach((freq, index) => {
      const detune = 1 + index * 0.003;
      sample += Math.sin(2 * Math.PI * freq * detune * t);
    });
    sample /= Math.max(1, spec.freqs.length);
    if (spec.pulse) {
      sample *= 0.65 + 0.35 * Math.sin(2 * Math.PI * spec.pulse * t);
    }
    sample *= envelope(progress) * volume;
    samples[i] = Math.floor(clamp(sample) * 32767);
  }

  return createWavDataUri(samples, SAMPLE_RATE);
}

function synthesizeProgression(spec: ProgressionSpec): string {
  const chordSamples = spec.chords.length * Math.floor(SAMPLE_RATE * spec.stepDuration);
  const samples = new Int16Array(chordSamples);
  const volume = spec.volume ?? 0.12;
  let cursor = 0;

  spec.chords.forEach((chord) => {
    const total = Math.floor(SAMPLE_RATE * spec.stepDuration);
    for (let i = 0; i < total; i++) {
      const t = i / SAMPLE_RATE;
      const progress = i / total;
      let sample = 0;
      chord.forEach((freq) => {
        sample += Math.sin(2 * Math.PI * freq * t);
      });
      sample /= chord.length;
      sample += 0.25 * Math.sin(2 * Math.PI * chord[0] * 0.5 * t);
      sample *= envelope(progress, 0.05, 0.15) * volume;
      samples[cursor++] = Math.floor(clamp(sample) * 32767);
    }
  });

  return createWavDataUri(samples, SAMPLE_RATE);
}

class SoundManager {
  private static instance: SoundManager;
  private sounds: Map<string, Audio.Sound> = new Map();
  private soundUris: Map<string, string> = new Map();
  private currentMusic: Audio.Sound | null = null;
  private currentTrack: MusicTrack | null = null;
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

  private getSoundUri(name: SoundName): string {
    const cached = this.soundUris.get(name);
    if (cached) return cached;
    const uri = synthesizeTone(SOUND_DEFS[name]);
    this.soundUris.set(name, uri);
    return uri;
  }

  private getMusicUri(track: MusicTrack): string {
    const cacheKey = `music:${track}`;
    const cached = this.soundUris.get(cacheKey);
    if (cached) return cached;
    const uri = synthesizeProgression(MUSIC_DEFS[track]);
    this.soundUris.set(cacheKey, uri);
    return uri;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      await Promise.all(
        (Object.keys(SOUND_DEFS) as SoundName[]).map(async (name) => {
          const { sound } = await Audio.Sound.createAsync(
            { uri: this.getSoundUri(name) },
            { shouldPlay: false, volume: this.sfxVolume },
          );
          this.sounds.set(name, sound);
        }),
      );
      this.initialized = true;
    } catch (e) {
      console.warn('Sound init failed:', e);
    }
  }

  async playSound(name: SoundName): Promise<void> {
    if (this.muted || !this.initialized) return;
    const sound = this.sounds.get(name);
    if (!sound) return;
    try {
      await sound.setVolumeAsync(this.sfxVolume);
      await sound.stopAsync();
      await sound.setPositionAsync(0);
      await sound.playAsync();
    } catch (e) {
      console.warn(`Failed to play sound "${name}":`, e);
    }
  }

  async playMusic(track: MusicTrack): Promise<void> {
    if (this.muted || !this.initialized) return;
    if (this.currentTrack === track) return;
    await this.stopMusic();
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: this.getMusicUri(track) },
        {
          shouldPlay: true,
          isLooping: true,
          volume: this.musicVolume,
        },
      );
      this.currentMusic = sound;
      this.currentTrack = track;
    } catch (e) {
      console.warn(`Failed to play music "${track}":`, e);
    }
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
      this.currentTrack = null;
    }
  }

  setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    this.sounds.forEach((sound) => {
      void sound.setVolumeAsync(this.sfxVolume);
    });
  }

  setMusicVolume(vol: number): void {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.currentMusic) {
      void this.currentMusic.setVolumeAsync(this.musicVolume);
    }
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
