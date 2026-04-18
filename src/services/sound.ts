import { logger } from '../utils/logger';

// Lazy-load audio modules to avoid deprecation warnings and crashes
let createAudioPlayerFn: any = null;
let setAudioModeFn: any = null;
let audioModuleLoaded = false;

function loadAudioModule() {
  if (!audioModuleLoaded) {
    audioModuleLoaded = true;
    try {
      const mod = require('expo-audio');
      createAudioPlayerFn = mod.createAudioPlayer;
      setAudioModeFn = mod.setAudioModeAsync;
    } catch {
      // expo-audio not available — sound will be silently disabled
    }
  }
}

// Crash reporter for audio-load breadcrumbs (plan task 2.5).
let crashReporterRef: any = null;
try {
  crashReporterRef = require('./crashReporting').crashReporter;
} catch {
  // crashReporter may be unavailable in test or minimal builds
}

type SoundName = 'tap' | 'gravity' | 'wordFound' | 'wordInvalid' | 'combo' | 'puzzleComplete' | 'starEarn' | 'buttonPress' | 'hintUsed' | 'undoUsed' | 'chainBonus';
// BGM tracks. `menu`/`gameplay`/`tense` are the historical set; `relax` and
// `victory` were added in plan task 2.3 (BGM-by-screen context). `menu` is the
// home-screen track in practice so no `home` alias is needed.
type MusicTrack = 'menu' | 'gameplay' | 'tense' | 'relax' | 'victory';

// ── Real-file asset registry (Phase 2A) ────────────────────────────
// When the composer deliverable lands in assets/audio/, flip an entry
// from `null` to `require('../../assets/audio/<file>.mp3')`. The runtime
// prefers real files and falls back to synthesis per-name, so partial
// deliveries still ship. Keep as a map rather than inline require so
// Metro only evaluates the require for present files.
//
// Expected filenames (see assets/audio/README.md): tap.mp3, gravity.mp3,
// word_found.mp3, word_invalid.mp3, combo.mp3, puzzle_complete.mp3,
// star_earn.mp3, button_press.mp3, hint_used.mp3, undo_used.mp3,
// chain_bonus.mp3 · bgm_menu.mp3, bgm_gameplay.mp3, bgm_relax.mp3,
// bgm_victory.mp3.
const REAL_SOUND_FILES: Record<SoundName, number | null> = {
  tap: null,
  gravity: null,
  wordFound: null,
  wordInvalid: null,
  combo: null,
  puzzleComplete: null,
  starEarn: null,
  buttonPress: null,
  hintUsed: null,
  undoUsed: null,
  chainBonus: null,
};

const REAL_MUSIC_FILES: Record<MusicTrack, number | null> = {
  menu: null,
  gameplay: null,
  tense: null,
  relax: null,
  victory: null,
};

type ToneSpec = {
  freqs: number[];
  duration: number;
  volume?: number;
  pulse?: number;
  // ADSR envelope parameters
  attack?: number;
  decay?: number;
  sustain?: number;  // sustain level (0-1)
  release?: number;
  // Pitch slide: end frequency multiplier (e.g. 0.5 = slide down to half freq)
  pitchSlide?: number;
  // Harmonic content
  harmonics?: number[];  // relative amplitudes of 2nd, 3rd, ... harmonics
  // Reverb tail
  reverbMix?: number;    // 0-1, how much reverb to blend
  reverbDecay?: number;  // seconds of reverb tail
};

type ProgressionSpec = {
  chords: number[][];
  stepDuration: number;
  volume?: number;
};

const SAMPLE_RATE = 44100;
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Plan task 2.4: route celebratory fanfare SFX through the `ceremony` bus so
// players can trim UI celebration without killing core gameplay feedback.
// Core gameplay cues (tap, gravity, word-found, errors, button clicks) stay
// on the `sfx` bus. Extend this map when adding new SoundNames.
type SoundCategory = 'sfx' | 'ceremony';
const SOUND_CATEGORY: Record<SoundName, SoundCategory> = {
  tap: 'sfx',
  gravity: 'sfx',
  wordFound: 'sfx',
  wordInvalid: 'sfx',
  combo: 'ceremony',
  puzzleComplete: 'ceremony',
  starEarn: 'ceremony',
  buttonPress: 'sfx',
  hintUsed: 'sfx',
  undoUsed: 'sfx',
  chainBonus: 'ceremony',
};

// ── Sound Definitions ──────────────────────────────────────────────

const SOUND_DEFS: Record<SoundName, ToneSpec> = {
  // Short percussive click with bass body
  tap: {
    freqs: [1200, 600, 300],
    duration: 0.10,
    volume: 0.18,
    attack: 0.002,
    decay: 0.02,
    sustain: 0.3,
    release: 0.06,
    harmonics: [0.4, 0.15],
  },

  // Rich ascending 4-note chime with reverb
  wordFound: {
    freqs: [523.25, 659.25, 783.99, 1046.5],
    duration: 0.40,
    volume: 0.22,
    attack: 0.008,
    decay: 0.06,
    sustain: 0.7,
    release: 0.15,
    harmonics: [0.35, 0.15, 0.06],
    reverbMix: 0.18,
    reverbDecay: 0.12,
  },

  // Dissonant low buzz with error feel
  wordInvalid: {
    freqs: [155, 165, 130],
    duration: 0.20,
    volume: 0.20,
    attack: 0.005,
    decay: 0.04,
    sustain: 0.6,
    release: 0.08,
    harmonics: [0.5, 0.35, 0.2],
    pulse: 18,
  },

  // Escalating 5-note musical phrase with layered chords
  combo: {
    freqs: [523.25, 659.25, 783.99, 987.77, 1174.66],
    duration: 0.50,
    volume: 0.22,
    attack: 0.006,
    decay: 0.05,
    sustain: 0.65,
    release: 0.18,
    harmonics: [0.3, 0.12, 0.05],
    reverbMix: 0.15,
    reverbDecay: 0.14,
  },

  // Grand triumphant fanfare - 6 ascending notes with bass and harmonics
  puzzleComplete: {
    freqs: [392.0, 493.88, 587.33, 659.25, 783.99, 1046.5],
    duration: 1.20,
    volume: 0.24,
    attack: 0.01,
    decay: 0.08,
    sustain: 0.7,
    release: 0.35,
    harmonics: [0.4, 0.2, 0.1, 0.05],
    reverbMix: 0.20,
    reverbDecay: 0.25,
  },

  // Deep rumble with subtle pitch slide down
  gravity: {
    freqs: [180, 120, 80],
    duration: 0.25,
    volume: 0.22,
    attack: 0.005,
    decay: 0.06,
    sustain: 0.5,
    release: 0.10,
    pitchSlide: 0.6,
    harmonics: [0.5, 0.3],
    pulse: 6,
  },

  // Bright sparkle arpeggio
  starEarn: {
    freqs: [1046.5, 1318.5, 1568.0, 2093.0],
    duration: 0.30,
    volume: 0.19,
    attack: 0.004,
    decay: 0.04,
    sustain: 0.6,
    release: 0.12,
    harmonics: [0.25, 0.1],
    reverbMix: 0.15,
    reverbDecay: 0.10,
  },

  // Crisp UI click
  buttonPress: {
    freqs: [900, 1400],
    duration: 0.08,
    volume: 0.16,
    attack: 0.001,
    decay: 0.015,
    sustain: 0.2,
    release: 0.04,
    harmonics: [0.3, 0.1],
  },

  // Soft mystical whoosh with descending tone
  hintUsed: {
    freqs: [880, 660, 440],
    duration: 0.20,
    volume: 0.18,
    attack: 0.01,
    decay: 0.05,
    sustain: 0.5,
    release: 0.10,
    pitchSlide: 0.7,
    harmonics: [0.2, 0.08],
    reverbMix: 0.16,
    reverbDecay: 0.08,
  },

  // Quick reverse swoosh descending
  undoUsed: {
    freqs: [587.33, 440, 329.63],
    duration: 0.20,
    volume: 0.18,
    attack: 0.003,
    decay: 0.04,
    sustain: 0.4,
    release: 0.10,
    pitchSlide: 0.65,
    harmonics: [0.25, 0.1],
  },

  // Rising major chord arpeggio with shimmer
  chainBonus: {
    freqs: [523.25, 659.25, 783.99, 1046.5, 1318.5],
    duration: 0.45,
    volume: 0.22,
    attack: 0.005,
    decay: 0.05,
    sustain: 0.65,
    release: 0.16,
    harmonics: [0.35, 0.15, 0.06],
    reverbMix: 0.18,
    reverbDecay: 0.15,
  },
};

// ── Music Definitions ──────────────────────────────────────────────

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
  // Slow, airy pad — meditative relax-mode backdrop.
  relax: {
    chords: [
      [196.00, 246.94, 293.66, 349.23],
      [220.00, 261.63, 329.63, 392.00],
      [174.61, 220.00, 261.63, 329.63],
      [196.00, 246.94, 293.66, 349.23],
    ],
    stepDuration: 1.6,
    volume: 0.09,
  },
  // Triumphant major-key fanfare loop — plays on level/puzzle complete surface.
  victory: {
    chords: [
      [261.63, 329.63, 392.00, 523.25],
      [349.23, 440.00, 523.25, 659.25],
      [293.66, 369.99, 440.00, 587.33],
      [261.63, 329.63, 392.00, 523.25],
    ],
    stepDuration: 1.0,
    volume: 0.12,
  },
};

// ── DSP Helpers ────────────────────────────────────────────────────

/** ADSR envelope generator */
function adsrEnvelope(
  progress: number,
  duration: number,
  attack: number,
  decay: number,
  sustainLevel: number,
  release: number,
): number {
  const t = progress * duration;
  const releaseStart = duration - release;

  if (t < attack) {
    // Attack: ramp up from 0 to 1
    return t / attack;
  } else if (t < attack + decay) {
    // Decay: ramp down from 1 to sustain level
    const decayProgress = (t - attack) / decay;
    return 1.0 - (1.0 - sustainLevel) * decayProgress;
  } else if (t < releaseStart) {
    // Sustain: hold at sustain level
    return sustainLevel;
  } else {
    // Release: ramp down from sustain to 0
    const releaseProgress = (t - releaseStart) / release;
    return sustainLevel * Math.max(0, 1.0 - releaseProgress);
  }
}

/** Legacy simple envelope for backward compat */
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

// ── Synthesis Engine ───────────────────────────────────────────────

/**
 * Synthesize a rich tone with harmonics, ADSR envelope, pitch slide, and reverb.
 * Each frequency in spec.freqs is staggered in time (arpeggio-style) so
 * multi-note sounds sweep upward/downward rather than all hitting at once.
 */
/**
 * Synthesize a rich tone and return raw Int16Array samples.
 * The expensive DSP math (oscillators, ADSR, harmonics, reverb) happens here.
 * WAV encoding is a separate step via createWavDataUri().
 */
function synthesizeToneSamples(spec: ToneSpec): Int16Array {
  const attack = spec.attack ?? 0.01;
  const decay = spec.decay ?? 0.04;
  const sustainLevel = spec.sustain ?? 0.6;
  const release = spec.release ?? 0.12;
  const volume = spec.volume ?? 0.2;
  const harmonicAmps = spec.harmonics ?? [0.25, 0.1];
  const reverbMix = spec.reverbMix ?? 0;
  const reverbDecaySec = spec.reverbDecay ?? 0.12;
  const pitchSlide = spec.pitchSlide ?? 1.0;

  // Total duration includes reverb tail
  const mainDuration = spec.duration;
  const totalDuration = mainDuration + (reverbMix > 0 ? reverbDecaySec : 0);
  const totalSamples = Math.floor(SAMPLE_RATE * totalDuration);
  const mainSamples = Math.floor(SAMPLE_RATE * mainDuration);

  // Dry buffer (the main sound)
  const dry = new Float32Array(totalSamples);

  const numFreqs = spec.freqs.length;
  // Stagger onset: each freq enters slightly after the previous
  const staggerTime = numFreqs > 1 ? Math.min(0.06, mainDuration * 0.4 / numFreqs) : 0;

  for (let i = 0; i < mainSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = i / mainSamples;

    let sample = 0;

    spec.freqs.forEach((baseFreq, freqIndex) => {
      const onset = freqIndex * staggerTime;
      if (t < onset) return;

      const localT = t - onset;
      const localDuration = mainDuration - onset;
      const localProgress = Math.min(1, localT / localDuration);

      // Pitch slide: interpolate frequency over time
      const slideAmount = 1.0 + (pitchSlide - 1.0) * localProgress;
      const freq = baseFreq * slideAmount;

      // Slight detuning per voice for warmth
      const detune = 1 + freqIndex * 0.003;

      // ADSR envelope per voice
      const env = adsrEnvelope(localProgress, localDuration, attack, decay, sustainLevel, release);

      // Fundamental
      let voiceSample = Math.sin(2 * Math.PI * freq * detune * localT);

      // Harmonic overtones (2nd, 3rd, etc. at decreasing volumes)
      harmonicAmps.forEach((amp, hIdx) => {
        const harmonicNum = hIdx + 2;
        voiceSample += amp * Math.sin(2 * Math.PI * freq * detune * harmonicNum * localT);
      });

      // Normalize by number of components
      const componentCount = 1 + harmonicAmps.length;
      voiceSample /= componentCount;

      sample += voiceSample * env;
    });

    // Average across voices
    sample /= Math.max(1, numFreqs);

    // Pulse modulation
    if (spec.pulse) {
      sample *= 0.65 + 0.35 * Math.sin(2 * Math.PI * spec.pulse * t);
    }

    dry[i] = sample * volume;
  }

  // Apply simple reverb (feedback delay network approximation)
  let output: Float32Array;
  if (reverbMix > 0) {
    output = new Float32Array(totalSamples);

    // Multiple delay taps for diffuse reverb
    const delayTaps = [
      { delaySamples: Math.floor(SAMPLE_RATE * 0.031), feedback: 0.35 },
      { delaySamples: Math.floor(SAMPLE_RATE * 0.047), feedback: 0.28 },
      { delaySamples: Math.floor(SAMPLE_RATE * 0.071), feedback: 0.22 },
    ];

    // Start with dry signal
    for (let i = 0; i < totalSamples; i++) {
      output[i] = dry[i];
    }

    // Add delay taps as reverb
    for (const tap of delayTaps) {
      const buffer = new Float32Array(totalSamples);
      for (let i = 0; i < totalSamples; i++) {
        const delayed = i - tap.delaySamples;
        const input = dry[i] + (delayed >= 0 ? buffer[delayed] * tap.feedback : 0);
        buffer[i] = input;
      }
      // Mix reverb in
      for (let i = 0; i < totalSamples; i++) {
        const reverbSample = buffer[i] - dry[i]; // Only the wet part
        // Fade out reverb tail after main sound ends
        let tailEnv = 1.0;
        if (i >= mainSamples) {
          tailEnv = Math.max(0, 1.0 - (i - mainSamples) / (SAMPLE_RATE * reverbDecaySec));
        }
        output[i] += reverbSample * reverbMix * tailEnv;
      }
    }
  } else {
    output = dry;
  }

  // Convert to Int16
  const samples = new Int16Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    samples[i] = Math.floor(clamp(output[i]) * 32767);
  }

  return samples;
}

/**
 * Synthesize a tone and return a WAV data URI.
 * Delegates DSP to synthesizeToneSamples(), then wraps in WAV header.
 */
function synthesizeTone(spec: ToneSpec): string {
  const samples = synthesizeToneSamples(spec);
  return createWavDataUri(samples, SAMPLE_RATE);
}

/**
 * Synthesize background music progression with sub-bass, chorus detuning,
 * pad-style tones, and smooth crossfade between chords.
 */
/**
 * Synthesize a music progression and return raw Int16Array samples.
 * The expensive DSP math (chord synthesis, chorus detuning, sub-bass) happens here.
 */
function synthesizeProgressionSamples(spec: ProgressionSpec): Int16Array {
  const volume = spec.volume ?? 0.12;
  const crossfade = 0.15; // seconds of crossfade overlap between chords

  // Calculate total length including crossfade tails
  const stepSamples = Math.floor(SAMPLE_RATE * spec.stepDuration);
  const totalSamples = spec.chords.length * stepSamples;
  const samples = new Int16Array(totalSamples);
  const floatBuf = new Float32Array(totalSamples);

  spec.chords.forEach((chord, chordIndex) => {
    const chordStart = chordIndex * stepSamples;

    for (let i = 0; i < stepSamples; i++) {
      const t = i / SAMPLE_RATE;
      const progress = i / stepSamples;

      // Smooth envelope with longer crossfade
      const env = envelope(progress, 0.08, crossfade / spec.stepDuration + 0.05);

      let sample = 0;
      const root = chord[0];

      // Sub-bass: half frequency of root for warmth
      sample += 0.30 * Math.sin(2 * Math.PI * (root * 0.5) * t) * env;

      // Main chord voices with chorus detuning
      chord.forEach((freq, voiceIdx) => {
        // Center voice
        const centerSin = Math.sin(2 * Math.PI * freq * t);
        // Detuned voice slightly sharp (chorus)
        const sharpSin = Math.sin(2 * Math.PI * freq * 1.004 * t);
        // Detuned voice slightly flat (chorus)
        const flatSin = Math.sin(2 * Math.PI * freq * 0.996 * t);

        // Blend center + detuned for chorus effect
        const voice = centerSin * 0.5 + sharpSin * 0.25 + flatSin * 0.25;

        // Add 2nd harmonic at low level for richness
        const harmonic = 0.12 * Math.sin(2 * Math.PI * freq * 2 * t);

        // Pad-style: triangle wave blended in softly for texture
        const phase = (freq * t) % 1.0;
        const triangle = 2.0 * Math.abs(2.0 * phase - 1.0) - 1.0;
        const pad = triangle * 0.08;

        // Weight higher voices slightly lower
        const voiceWeight = 1.0 / (1.0 + voiceIdx * 0.15);

        sample += (voice + harmonic + pad) * voiceWeight * env;
      });

      // Normalize
      const voiceCount = chord.length + 1; // +1 for sub-bass
      sample /= voiceCount;
      sample *= volume;

      const idx = chordStart + i;
      if (idx < totalSamples) {
        floatBuf[idx] += sample;
      }
    }
  });

  // Soft limiting to prevent clipping
  for (let i = 0; i < totalSamples; i++) {
    // Tanh soft clip
    const x = floatBuf[i];
    const softClipped = Math.tanh(x * 1.5) / 1.5;
    samples[i] = Math.floor(clamp(softClipped) * 32767);
  }

  return samples;
}

/**
 * Synthesize a music progression and return a WAV data URI.
 * Delegates DSP to synthesizeProgressionSamples(), then wraps in WAV header.
 */
function synthesizeProgression(spec: ProgressionSpec): string {
  const samples = synthesizeProgressionSamples(spec);
  return createWavDataUri(samples, SAMPLE_RATE);
}

// ── Sound Manager ──────────────────────────────────────────────────

class SoundManager {
  private static instance: SoundManager;
  private sounds: Map<string, any> = new Map(); // AudioPlayer instances (expo-audio)
  private soundUris: Map<string, string> = new Map();
  private synthesisCache: Map<string, Int16Array> = new Map(); // Raw sample buffer cache (avoids re-doing DSP math)
  private currentMusic: any = null;
  private currentTrack: MusicTrack | null = null;
  private sfxVolume: number = 1.0;
  private musicVolume: number = 0.5;
  // Plan task 2.4: ceremony SFX (level-up, star-earn, etc.) route through a
  // separate bus so players can lower the UI fanfare without muting core
  // gameplay feedback. Default matches sfx so behaviour is unchanged until the
  // Settings UI wires it in.
  private ceremonyVolume: number = 1.0;
  // Plan task 2.3: duck BGM under ceremony SFX. `duckLevel` is the active
  // multiplier (1.0 = no duck, 0.4 = typical duck). `duckUntil` is an epoch-ms
  // deadline; recomputed each call so overlapping requests extend the duck
  // instead of racing.
  private duckLevel: number = 1.0;
  private duckUntil: number = 0;
  private duckTimer: ReturnType<typeof setTimeout> | null = null;
  private muted: boolean = false;
  private initialized: boolean = false;
  private preWarmed: boolean = false;
  private preWarmPromise: Promise<void> | null = null;
  private useNewApi: boolean = false;

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  /**
   * Return the bundled-asset source for a sound, or null if no real file
   * has been wired. expo-audio's createAudioPlayer accepts a require()'d
   * asset id directly, so we can pass the value through unchanged.
   */
  private getRealSoundSource(name: SoundName): number | null {
    return REAL_SOUND_FILES[name] ?? null;
  }

  /** Real-file source for a music track, or null. */
  private getRealMusicSource(track: MusicTrack): number | null {
    return REAL_MUSIC_FILES[track] ?? null;
  }

  /**
   * Try to build an AudioPlayer from a real bundled asset. Returns the
   * player on success, or null if the asset is missing or load fails.
   * Records a crash-reporter breadcrumb on failure so silent fallbacks
   * to synthesis surface in Sentry.
   */
  private tryCreateRealPlayer(source: number, label: string): any | null {
    if (!createAudioPlayerFn) return null;
    try {
      return createAudioPlayerFn(source);
    } catch (e) {
      if (crashReporterRef) {
        crashReporterRef.addBreadcrumb?.(
          `audio: real-file load failed for ${label}, falling back to synth`,
          'audio',
        );
        crashReporterRef.captureException?.(e as Error, {
          tags: { feature: 'audio_real_file_load', asset: label },
        });
      } else if (__DEV__) {
        logger.warn(`[sound] real-file load failed for ${label}:`, e);
      }
      return null;
    }
  }

  /**
   * Get or synthesize raw Int16Array samples for a sound effect.
   * Caches the raw buffer so DSP math is never repeated.
   */
  private getSynthesizedSamples(name: SoundName): Int16Array {
    const cached = this.synthesisCache.get(name);
    if (cached) return cached;
    const samples = synthesizeToneSamples(SOUND_DEFS[name]);
    this.synthesisCache.set(name, samples);
    return samples;
  }

  /**
   * Get or synthesize raw Int16Array samples for a music track.
   * Caches the raw buffer so DSP math is never repeated.
   */
  private getMusicSynthesizedSamples(track: MusicTrack): Int16Array {
    const cacheKey = `music:${track}`;
    const cached = this.synthesisCache.get(cacheKey);
    if (cached) return cached;
    const samples = synthesizeProgressionSamples(MUSIC_DEFS[track]);
    this.synthesisCache.set(cacheKey, samples);
    return samples;
  }

  /**
   * Get a WAV data URI for a sound effect, using cached samples if available.
   */
  private getSoundUri(name: SoundName): string {
    const cached = this.soundUris.get(name);
    if (cached) return cached;
    const samples = this.getSynthesizedSamples(name);
    const uri = createWavDataUri(samples, SAMPLE_RATE);
    this.soundUris.set(name, uri);
    return uri;
  }

  /**
   * Get a WAV data URI for a music track, using cached samples if available.
   */
  private getMusicUri(track: MusicTrack): string {
    const cacheKey = `music:${track}`;
    const cached = this.soundUris.get(cacheKey);
    if (cached) return cached;
    const samples = this.getMusicSynthesizedSamples(track);
    const uri = createWavDataUri(samples, SAMPLE_RATE);
    this.soundUris.set(cacheKey, uri);
    return uri;
  }

  /**
   * Pre-warm all sound effects and music tracks by synthesizing their samples
   * and creating WAV URIs in the background. This avoids blocking init() and
   * prevents first-play delays for music.
   *
   * Yields control back to the event loop between each synthesis to avoid
   * blocking the main thread for too long.
   */
  async preWarmAll(): Promise<void> {
    if (this.preWarmed) return;
    if (this.preWarmPromise) return this.preWarmPromise;

    this.preWarmPromise = (async () => {
      try {
        // Synthesize all sound effect samples + URIs, yielding between each
        for (const name of Object.keys(SOUND_DEFS) as SoundName[]) {
          if (!this.synthesisCache.has(name)) {
            this.getSoundUri(name); // Populates both synthesisCache and soundUris
            // Yield to event loop so UI stays responsive
            await new Promise<void>(resolve => setTimeout(resolve, 0));
          }
        }

        // Synthesize all music track samples + URIs, yielding between each
        for (const track of Object.keys(MUSIC_DEFS) as MusicTrack[]) {
          const cacheKey = `music:${track}`;
          if (!this.synthesisCache.has(cacheKey)) {
            this.getMusicUri(track); // Populates both synthesisCache and soundUris
            await new Promise<void>(resolve => setTimeout(resolve, 0));
          }
        }

        // If init has completed and we have the new API, create AudioPlayer
        // instances for any sounds that don't have players yet
        if (this.initialized && createAudioPlayerFn && this.useNewApi) {
          for (const name of Object.keys(SOUND_DEFS) as SoundName[]) {
            if (!this.sounds.has(name)) {
              const uri = this.soundUris.get(name);
              if (uri) {
                const player = createAudioPlayerFn(uri);
                player.volume = this.sfxVolume;
                this.sounds.set(name, player);
              }
            }
          }
        }

        this.preWarmed = true;
      } catch (e) {
        if (__DEV__) console.warn('Sound preWarmAll failed:', e);
      } finally {
        this.preWarmPromise = null;
      }
    })();

    return this.preWarmPromise;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    loadAudioModule();
    try {
      if (createAudioPlayerFn && setAudioModeFn) {
        // expo-audio — just set audio mode, don't synthesize yet
        this.useNewApi = true;
        await setAudioModeFn({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: 'duckOthers',
        });
      } else {
        // expo-audio not available — sound stays disabled
        this.useNewApi = false;
      }
      this.initialized = true;

      // Kick off background pre-warming so synthesis happens off the init path.
      // setTimeout(0) defers to the next event loop tick, allowing the app to
      // render its first frame before heavy DSP work begins.
      setTimeout(() => this.preWarmAll(), 0);
    } catch (e) {
      logger.warn('Sound init failed:', e);
    }
  }

  /** Which volume bus a given SoundName plays through. */
  private volumeForCategory(category: SoundCategory): number {
    return category === 'ceremony' ? this.ceremonyVolume : this.sfxVolume;
  }

  async playSound(name: SoundName): Promise<void> {
    if (this.muted || !this.initialized) return;

    const category = SOUND_CATEGORY[name] ?? 'sfx';
    const targetVol = this.volumeForCategory(category);

    let player = this.sounds.get(name);

    // If pre-warm hasn't created a player yet, try to create one on-demand.
    // Prefer a real bundled file when one has been wired in REAL_SOUND_FILES;
    // otherwise fall back to the synthesized WAV URI.
    if (!player) {
      if (this.useNewApi && createAudioPlayerFn) {
        const realSource = this.getRealSoundSource(name);
        if (realSource != null) {
          const realPlayer = this.tryCreateRealPlayer(realSource, `sfx:${name}`);
          if (realPlayer) {
            realPlayer.volume = targetVol;
            this.sounds.set(name, realPlayer);
            player = realPlayer;
          }
        }
      }

      if (!player) {
        const uri = this.soundUris.get(name);
        if (!uri) {
          // Synthesis hasn't completed yet — skip silently rather than blocking
          return;
        }
        try {
          if (this.useNewApi && createAudioPlayerFn) {
            player = createAudioPlayerFn(uri);
            player.volume = targetVol;
            this.sounds.set(name, player);
          }
        } catch (e) {
          if (__DEV__) console.warn(`Failed to create sound player "${name}":`, e);
          return;
        }
      }
    }

    if (!player) return;

    try {
      player.volume = targetVol;
      player.seekTo(0);
      player.play();
    } catch (e) {
      logger.warn(`Failed to play sound "${name}":`, e);
    }
  }

  /**
   * Effective BGM volume including the active duck level.
   * Ceremony SFX call duckMusicFor() to drop this temporarily.
   */
  private effectiveMusicVolume(): number {
    return this.musicVolume * this.duckLevel;
  }

  /**
   * Build a fresh AudioPlayer for a music track (real-file or synth fallback).
   * Returns null on total failure.
   */
  private buildMusicPlayer(track: MusicTrack): any | null {
    if (!(this.useNewApi && createAudioPlayerFn)) return null;
    let player: any = null;
    const realSource = this.getRealMusicSource(track);
    if (realSource != null) {
      player = this.tryCreateRealPlayer(realSource, `bgm:${track}`);
    }
    if (!player) {
      try {
        const uri = this.getMusicUri(track);
        player = createAudioPlayerFn(uri);
      } catch (e) {
        if (__DEV__) logger.warn(`[sound] failed to build synth BGM for ${track}:`, e);
        return null;
      }
    }
    return player;
  }

  /**
   * Plan task 2.3: crossfade between BGM tracks over ~400ms. If a track is
   * already playing, we ramp its volume to zero while ramping the new track
   * from zero to the effective music volume, then dispose the old player.
   */
  async playMusic(track: MusicTrack, options?: { crossfadeMs?: number }): Promise<void> {
    if (this.muted || !this.initialized) return;
    if (this.currentTrack === track) return;

    const crossfadeMs = options?.crossfadeMs ?? 400;
    const steps = 8;
    const stepMs = crossfadeMs / steps;
    const targetVol = this.effectiveMusicVolume();

    const newPlayer = this.buildMusicPlayer(track);
    const oldPlayer = this.currentMusic;

    if (!newPlayer) {
      // Total failure — leave existing music alone; breadcrumb already dropped.
      return;
    }

    try {
      newPlayer.volume = 0;
      newPlayer.loop = true;
      newPlayer.play();
    } catch (e) {
      logger.warn(`Failed to start music "${track}":`, e);
      return;
    }

    this.currentMusic = newPlayer;
    this.currentTrack = track;

    // Ramp both players over `steps` tick; skip hardware work if crossfade is disabled.
    for (let i = 1; i <= steps; i++) {
      await new Promise<void>(resolve => setTimeout(resolve, stepMs));
      const t = i / steps;
      try {
        newPlayer.volume = targetVol * t;
        if (oldPlayer) oldPlayer.volume = Math.max(0, targetVol * (1 - t));
      } catch (_e) {
        // Volume setter can throw once an old player is disposed — tolerated.
      }
    }

    if (oldPlayer) {
      try {
        oldPlayer.pause();
        oldPlayer.remove();
      } catch (_e) {
        // Silent cleanup
      }
    }
  }

  async stopMusic(options?: { fadeMs?: number }): Promise<void> {
    if (!this.currentMusic) return;
    const player = this.currentMusic;
    const fadeMs = options?.fadeMs ?? 0;
    if (fadeMs > 0) {
      const steps = 6;
      const stepMs = fadeMs / steps;
      const startVol = this.effectiveMusicVolume();
      for (let i = 1; i <= steps; i++) {
        await new Promise<void>(resolve => setTimeout(resolve, stepMs));
        try { player.volume = Math.max(0, startVol * (1 - i / steps)); } catch (_e) { /* ignore */ }
      }
    }
    try {
      player.pause();
      player.remove();
    } catch (_e) {
      // Silently handle errors during cleanup
    }
    this.currentMusic = null;
    this.currentTrack = null;
  }

  /**
   * Plan task 2.3: duck background music while a ceremony SFX plays. Subsequent
   * calls within the duck window extend it rather than race. Call before
   * playing a ceremony sound with the expected ceremony duration.
   */
  duckMusicFor(durationMs: number, duckLevel: number = 0.4): void {
    const now = Date.now();
    const newDeadline = now + Math.max(0, durationMs);
    if (newDeadline <= this.duckUntil) {
      // Existing duck extends past this request — nothing to do.
      return;
    }
    this.duckUntil = newDeadline;
    this.duckLevel = Math.max(0, Math.min(1, duckLevel));
    if (this.currentMusic) {
      try { this.currentMusic.volume = this.effectiveMusicVolume(); } catch (_e) { /* ignore */ }
    }
    if (this.duckTimer) clearTimeout(this.duckTimer);
    this.duckTimer = setTimeout(() => {
      this.duckLevel = 1.0;
      this.duckUntil = 0;
      this.duckTimer = null;
      if (this.currentMusic) {
        try { this.currentMusic.volume = this.effectiveMusicVolume(); } catch (_e) { /* ignore */ }
      }
    }, this.duckUntil - Date.now());
  }

  setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    // Volume is re-applied per-play from the category bus, so pre-cached
    // players don't need updating here. Keeping the old re-apply for players
    // already mid-loop would collapse ceremony volumes onto sfx.
  }

  setMusicVolume(vol: number): void {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.currentMusic) {
      this.currentMusic.volume = this.effectiveMusicVolume();
    }
  }

  setCeremonyVolume(vol: number): void {
    this.ceremonyVolume = Math.max(0, Math.min(1, vol));
  }

  getCeremonyVolume(): number {
    return this.ceremonyVolume;
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
