// Lazy-load audio modules to avoid deprecation warnings and crashes
let createAudioPlayerFn: any = null;
let setAudioModeFn: any = null;
let legacyAudio: any = null;
let audioModuleLoaded = false;

function loadAudioModule() {
  if (!audioModuleLoaded) {
    audioModuleLoaded = true;
    try {
      const mod = require('expo-audio');
      createAudioPlayerFn = mod.createAudioPlayer;
      setAudioModeFn = mod.setAudioModeAsync;
    } catch {
      // expo-audio not available — fall back to expo-av
      try {
        legacyAudio = require('expo-av').Audio;
      } catch {
        // Neither available
      }
    }
  }
}

type SoundName = 'tap' | 'gravity' | 'wordFound' | 'wordInvalid' | 'combo' | 'puzzleComplete' | 'starEarn' | 'buttonPress' | 'hintUsed' | 'undoUsed' | 'chainBonus';
type MusicTrack = 'menu' | 'gameplay' | 'tense';

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
  private sounds: Map<string, any> = new Map(); // AudioPlayer instances (expo-audio) or Audio.Sound (expo-av fallback)
  private soundUris: Map<string, string> = new Map();
  private synthesisCache: Map<string, Int16Array> = new Map(); // Raw sample buffer cache (avoids re-doing DSP math)
  private currentMusic: any = null;
  private currentTrack: MusicTrack | null = null;
  private sfxVolume: number = 1.0;
  private musicVolume: number = 0.5;
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
        // expo-audio (new API) — just set audio mode, don't synthesize yet
        this.useNewApi = true;
        await setAudioModeFn({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: 'duckOthers',
        });
      } else {
        // expo-av fallback (legacy) — just set audio mode
        this.useNewApi = false;
        await legacyAudio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
      }
      this.initialized = true;

      // Kick off background pre-warming so synthesis happens off the init path.
      // setTimeout(0) defers to the next event loop tick, allowing the app to
      // render its first frame before heavy DSP work begins.
      setTimeout(() => this.preWarmAll(), 0);
    } catch (e) {
      console.warn('Sound init failed:', e);
    }
  }

  async playSound(name: SoundName): Promise<void> {
    if (this.muted || !this.initialized) return;

    let player = this.sounds.get(name);

    // If pre-warm hasn't created a player yet, try to create one on-demand
    // using already-cached URI (skip silently if synthesis hasn't happened)
    if (!player) {
      const uri = this.soundUris.get(name);
      if (!uri) {
        // Synthesis hasn't completed yet — skip silently rather than blocking
        return;
      }
      try {
        if (this.useNewApi && createAudioPlayerFn) {
          player = createAudioPlayerFn(uri);
          player.volume = this.sfxVolume;
          this.sounds.set(name, player);
        } else if (legacyAudio) {
          const { sound } = await legacyAudio.Sound.createAsync(
            { uri },
            { shouldPlay: false, volume: this.sfxVolume },
          );
          player = sound;
          this.sounds.set(name, player);
        }
      } catch (e) {
        if (__DEV__) console.warn(`Failed to create sound player "${name}":`, e);
        return;
      }
    }

    if (!player) return;

    try {
      if (this.useNewApi) {
        player.volume = this.sfxVolume;
        player.seekTo(0);
        player.play();
      } else {
        await player.setVolumeAsync(this.sfxVolume);
        await player.stopAsync();
        await player.setPositionAsync(0);
        await player.playAsync();
      }
    } catch (e) {
      console.warn(`Failed to play sound "${name}":`, e);
    }
  }

  async playMusic(track: MusicTrack): Promise<void> {
    if (this.muted || !this.initialized) return;
    if (this.currentTrack === track) return;
    await this.stopMusic();
    try {
      if (this.useNewApi && createAudioPlayerFn) {
        const uri = this.getMusicUri(track);
        const player = createAudioPlayerFn(uri);
        player.volume = this.musicVolume;
        player.loop = true;
        player.play();
        this.currentMusic = player;
      } else {
        const { sound } = await legacyAudio.Sound.createAsync(
          { uri: this.getMusicUri(track) },
          { shouldPlay: true, isLooping: true, volume: this.musicVolume },
        );
        this.currentMusic = sound;
      }
      this.currentTrack = track;
    } catch (e) {
      console.warn(`Failed to play music "${track}":`, e);
    }
  }

  async stopMusic(): Promise<void> {
    if (this.currentMusic) {
      try {
        if (this.useNewApi) {
          this.currentMusic.pause();
          this.currentMusic.remove();
        } else {
          await this.currentMusic.stopAsync();
          await this.currentMusic.unloadAsync();
        }
      } catch (_e) {
        // Silently handle errors during cleanup
      }
      this.currentMusic = null;
      this.currentTrack = null;
    }
  }

  setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    this.sounds.forEach((player) => {
      if (this.useNewApi) {
        player.volume = this.sfxVolume;
      } else {
        void player.setVolumeAsync(this.sfxVolume);
      }
    });
  }

  setMusicVolume(vol: number): void {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.currentMusic) {
      if (this.useNewApi) {
        this.currentMusic.volume = this.musicVolume;
      } else {
        void this.currentMusic.setVolumeAsync(this.musicVolume);
      }
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
