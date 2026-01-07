import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

// CrazyGames SDK type for audio unlock integration
declare global {
  interface Window {
    CrazyGames?: {
      SDK: {
        init: () => Promise<void>;
        [key: string]: any;
      };
    };
    __audioUnlocked?: boolean;
    __audioContext?: AudioContext;
  }
}

interface AudioSettings {
  masterVolume: number;
  sfxEnabled: boolean;
  sfxVolume: number;
  musicEnabled: boolean;
  musicVolume: number;
}

interface AudioContextValue extends AudioSettings {
  // Master volume helpers
  isMuted: boolean;
  toggleMute: () => void;

  setMasterVolume: (volume: number) => void;
  setSfxEnabled: (enabled: boolean) => void;
  setSfxVolume: (volume: number) => void;
  setMusicEnabled: (enabled: boolean) => void;
  setMusicVolume: (volume: number) => void;
  playSound: (soundType: SoundType) => void;
  startMusic: () => Promise<void>;
  stopMusic: () => void;
  isMusicPlaying: boolean;
  isMusicLoading: boolean;
  unlockAudio: () => Promise<boolean>;
  isAudioUnlocked: boolean;
}

export type SoundType = 
  | 'cardSelect' 
  | 'cardFlip' 
  | 'handSubmit' 
  | 'handWin' 
  | 'levelComplete' 
  | 'gameOver' 
  | 'buttonClick'
  | 'timer'
  | 'countdownTick'
  | 'countdownUrgent'
  | 'bonusCountdown';

const DEFAULT_SETTINGS: AudioSettings = {
  masterVolume: 0.7,
  sfxEnabled: true,
  sfxVolume: 0.8,
  musicEnabled: true,
  musicVolume: 0.5,
};

const AudioContext = createContext<AudioContextValue | undefined>(undefined);

// ===== GLOBAL AUDIO UNLOCKER =====
// This runs once at module load to set up the global click listener
let globalAudioContext: AudioContext | null = null;
let globalMasterGain: GainNode | null = null;
let sdkInitialized = false;
let unlockAttempted = false;

// Strict master gain singleton (created once per page / AudioContext)
function readSavedMasterVolume(): number | null {
  try {
    const saved = localStorage.getItem('poker-shootout-audio');
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return typeof parsed?.masterVolume === 'number' ? parsed.masterVolume : null;
  } catch {
    return null;
  }
}

// Must be used by all audio paths (no direct destination connections from sources)
function getStrictMaster(ctx: AudioContext): GainNode {
  if (globalMasterGain) {
    if (globalMasterGain.context === ctx) return globalMasterGain;

    // If a different AudioContext was created somehow, drop the old node to avoid bypass.
    try {
      globalMasterGain.disconnect();
    } catch {
      // ignore
    }
    globalMasterGain = null;
  }

  globalMasterGain = ctx.createGain();

  const initial = readSavedMasterVolume() ?? DEFAULT_SETTINGS.masterVolume;
  globalMasterGain.gain.setValueAtTime(initial, ctx.currentTime);

  // Master -> destination (and ONLY the master connects to destination)
  globalMasterGain.connect(ctx.destination);

  console.log('[Audio] Created global master gain node (strict), initial:', initial);
  return globalMasterGain;
}

// Safety: ensure a single, fresh connection from master -> speakers (no duplicate summing)
function forceReconnectMaster(ctx: AudioContext): GainNode {
  const master = getStrictMaster(ctx);
  try {
    master.disconnect();
  } catch {
    // ignore
  }
  master.connect(ctx.destination);
  return master;
}

// Initialize CrazyGames SDK first (if available)
async function ensureSdkInitialized(): Promise<void> {
  if (sdkInitialized) return;
  
  if (window.CrazyGames?.SDK) {
    try {
      console.log('[Audio] Waiting for CrazyGames SDK init...');
      await window.CrazyGames.SDK.init();
      console.log('[Audio] CrazyGames SDK initialized successfully');
    } catch (err) {
      console.log('[Audio] CrazyGames SDK init error (non-fatal):', err);
    }
  }
  sdkInitialized = true;
}

// Global audio unlock function
async function globalUnlockAudio(): Promise<boolean> {
  if (unlockAttempted && window.__audioUnlocked) {
    console.log('[Audio] Already unlocked, skipping');
    return true;
  }
  unlockAttempted = true;

  // Ensure SDK is initialized first
  await ensureSdkInitialized();

  // Create or get AudioContext
  if (!globalAudioContext) {
    globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    window.__audioContext = globalAudioContext;
    console.log('[Audio] Created global AudioContext, state:', globalAudioContext.state);
  }

  // Create + connect strict master gain node immediately after context creation
  forceReconnectMaster(globalAudioContext);


  console.log('[Audio] AudioContext state before resume:', globalAudioContext.state);

  if (globalAudioContext.state === 'suspended') {
    try {
      await globalAudioContext.resume();
      console.log('[Audio] AudioContext resumed, state:', globalAudioContext.state);
    } catch (err) {
      console.error('[Audio] Failed to resume AudioContext:', err);
      return false;
    }
  }

  if (globalAudioContext.state === 'running') {
    window.__audioUnlocked = true;
    console.log('[Audio] ✓ Audio unlocked successfully, state:', globalAudioContext.state);
    return true;
  }

  console.log('[Audio] AudioContext in unexpected state:', globalAudioContext.state);
  return false;
}

// Set up ONE-TIME global listener for first user interaction
if (typeof document !== 'undefined') {
  const handleFirstInteraction = async (e: Event) => {
    console.log('[Audio] First user interaction detected:', e.type);
    
    // Remove both listeners immediately
    document.removeEventListener('pointerdown', handleFirstInteraction, true);
    document.removeEventListener('click', handleFirstInteraction, true);
    document.removeEventListener('touchstart', handleFirstInteraction, true);
    
    await globalUnlockAudio();
  };

  // Use capture phase to ensure we get the event first
  document.addEventListener('pointerdown', handleFirstInteraction, { once: true, capture: true });
  document.addEventListener('click', handleFirstInteraction, { once: true, capture: true });
  document.addEventListener('touchstart', handleFirstInteraction, { once: true, capture: true });
  
  console.log('[Audio] Global audio unlock listeners registered');
}

// Synthesized sound effects using Web Audio API
function createOscillatorSound(
  audioCtx: AudioContext, 
  frequency: number, 
  duration: number, 
  type: OscillatorType = 'sine',
  gain: number = 0.3
): void {
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  const masterGain = getStrictMaster(audioCtx);
  
  oscillator.connect(gainNode);
  // Route through global master gain (no direct destination fallbacks)
  gainNode.connect(masterGain);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
  
  gainNode.gain.setValueAtTime(gain, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  
  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + duration);
}

// Cache for loaded audio buffers
const audioBufferCache = new Map<string, AudioBuffer>();

function publicAssetUrl(path: string): string {
  const clean = path.replace(/^\/+/, '');
  const base = (import.meta as any).env?.BASE_URL ?? '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${clean}`;
}

async function loadAudioBuffer(audioCtx: AudioContext, url: string): Promise<AudioBuffer> {
  const cached = audioBufferCache.get(url);
  if (cached) return cached;

  console.log('[Audio] Loading audio buffer:', url);

  const response = await fetch(url);
  if (!response.ok) {
    console.error('[Audio] Audio fetch failed:', { url, status: response.status, statusText: response.statusText });
    throw new Error(`Audio fetch failed (${response.status}) for ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    audioBufferCache.set(url, audioBuffer);
    return audioBuffer;
  } catch (err) {
    console.error('[Audio] decodeAudioData failed:', { url, err });
    throw err;
  }
}

function playCardSelect(audioCtx: AudioContext, volume: number): void {
  const url = publicAssetUrl('sounds/card-hit.mp3');
  const masterGain = getStrictMaster(audioCtx);
  loadAudioBuffer(audioCtx, url)
    .then((buffer) => {
      const source = audioCtx.createBufferSource();
      const gainNode = audioCtx.createGain();

      source.buffer = buffer;
      gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);

      source.connect(gainNode);
      gainNode.connect(masterGain);
      source.start();
    })
    .catch((err) => {
      console.error('[Audio] Failed to play card select sound:', err);
    });
}

function playCardFlip(audioCtx: AudioContext, volume: number): void {
  createOscillatorSound(audioCtx, 400, 0.05, 'triangle', volume * 0.2);
  setTimeout(() => {
    createOscillatorSound(audioCtx, 600, 0.05, 'triangle', volume * 0.25);
  }, 30);
}

function playHandSubmit(audioCtx: AudioContext, volume: number): void {
  createOscillatorSound(audioCtx, 523, 0.1, 'sine', volume * 0.3);
  setTimeout(() => {
    createOscillatorSound(audioCtx, 659, 0.1, 'sine', volume * 0.3);
  }, 80);
}

function playHandWin(audioCtx: AudioContext, volume: number): void {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => {
      createOscillatorSound(audioCtx, freq, 0.15, 'sine', volume * 0.25);
    }, i * 100);
  });
}

function playLevelComplete(audioCtx: AudioContext, volume: number): void {
  const melody = [523, 659, 784, 659, 784, 1047];
  melody.forEach((freq, i) => {
    setTimeout(() => {
      createOscillatorSound(audioCtx, freq, 0.2, 'sine', volume * 0.3);
    }, i * 150);
  });
}

function playGameOver(audioCtx: AudioContext, volume: number): void {
  // Play the game-over.mp3 sound file
  const url = publicAssetUrl('sounds/game-over.mp3');
  const masterGain = getStrictMaster(audioCtx);
  loadAudioBuffer(audioCtx, url)
    .then((buffer) => {
      const source = audioCtx.createBufferSource();
      const gainNode = audioCtx.createGain();

      source.buffer = buffer;
      gainNode.gain.setValueAtTime(volume * 0.8, audioCtx.currentTime);

      source.connect(gainNode);
      gainNode.connect(masterGain);
      source.start();
    })
    .catch((err) => {
      console.error('[Audio] Failed to play game over sound:', err);
    });
}

function playButtonClick(audioCtx: AudioContext, volume: number): void {
  createOscillatorSound(audioCtx, 1000, 0.05, 'square', volume * 0.15);
}

function playTimer(audioCtx: AudioContext, volume: number): void {
  createOscillatorSound(audioCtx, 440, 0.1, 'sine', volume * 0.2);
}

function playCountdownTick(audioCtx: AudioContext, volume: number): void {
  // Sharp, urgent tick sound
  const now = audioCtx.currentTime;
  const masterGain = getStrictMaster(audioCtx);
  
  // High-pitched tick
  const tick = audioCtx.createOscillator();
  const tickGain = audioCtx.createGain();
  tick.type = 'square';
  tick.frequency.setValueAtTime(880, now);
  tick.frequency.exponentialRampToValueAtTime(440, now + 0.08);
  tickGain.gain.setValueAtTime(volume * 0.4, now);
  tickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
  tick.connect(tickGain);
  tickGain.connect(masterGain);
  tick.start(now);
  tick.stop(now + 0.12);
}

function playCountdownUrgent(audioCtx: AudioContext, volume: number): void {
  // More urgent double-tick for last 3 seconds
  const now = audioCtx.currentTime;
  const masterGain = getStrictMaster(audioCtx);
  
  // First tick
  const tick1 = audioCtx.createOscillator();
  const tick1Gain = audioCtx.createGain();
  tick1.type = 'square';
  tick1.frequency.setValueAtTime(1200, now);
  tick1.frequency.exponentialRampToValueAtTime(600, now + 0.06);
  tick1Gain.gain.setValueAtTime(volume * 0.5, now);
  tick1Gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
  tick1.connect(tick1Gain);
  tick1Gain.connect(masterGain);
  tick1.start(now);
  tick1.stop(now + 0.1);
  
  // Second tick (echo)
  const tick2 = audioCtx.createOscillator();
  const tick2Gain = audioCtx.createGain();
  tick2.type = 'square';
  tick2.frequency.setValueAtTime(1000, now + 0.1);
  tick2.frequency.exponentialRampToValueAtTime(500, now + 0.16);
  tick2Gain.gain.setValueAtTime(volume * 0.3, now + 0.1);
  tick2Gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
  tick2.connect(tick2Gain);
  tick2Gain.connect(masterGain);
  tick2.start(now + 0.1);
  tick2.stop(now + 0.2);
}

function playBonusCountdown(audioCtx: AudioContext, volume: number): void {
  // Play the countdown pulse sound
  const url = publicAssetUrl('sounds/countdown-tick.mp3');
  const masterGain = getStrictMaster(audioCtx);
  loadAudioBuffer(audioCtx, url)
    .then((buffer) => {
      const source = audioCtx.createBufferSource();
      const gainNode = audioCtx.createGain();

      source.buffer = buffer;
      gainNode.gain.setValueAtTime(volume * 0.8, audioCtx.currentTime);

      source.connect(gainNode);
      gainNode.connect(masterGain);
      source.start();
    })
    .catch((err) => {
      console.error('[Audio] Failed to play bonus countdown sound:', err);
    });
}

// Background music player using audio file
class BackgroundMusic {
  private audioCtx: AudioContext;
  private gainNode: GainNode;
  private source: AudioBufferSourceNode | null = null;
  private isPlaying: boolean = false;
  private audioBuffer: AudioBuffer | null = null;

  constructor(audioCtx: AudioContext) {
    this.audioCtx = audioCtx;
    this.gainNode = audioCtx.createGain();
    // Route through master gain node (strict)
    const masterGain = getStrictMaster(audioCtx);
    this.gainNode.connect(masterGain);
  }

  setVolume(volume: number) {
    this.gainNode.gain.setValueAtTime(volume, this.audioCtx.currentTime);
  }

  async start(volume: number) {
    console.log('BackgroundMusic.start called, isPlaying:', this.isPlaying, 'volume:', volume);
    if (this.isPlaying) return;
    
    try {
      // Load the audio buffer if not already loaded
      if (!this.audioBuffer) {
        console.log('Loading background music audio buffer...');
        this.audioBuffer = await loadAudioBuffer(this.audioCtx, publicAssetUrl('sounds/background-music.mp3'));
        console.log('Audio buffer loaded, duration:', this.audioBuffer.duration);
      }
      
      this.source = this.audioCtx.createBufferSource();
      this.source.buffer = this.audioBuffer;
      this.source.loop = true;
      this.source.connect(this.gainNode);
      
      this.setVolume(volume);
      this.source.start();
      this.isPlaying = true;
      console.log('Background music playback started');
    } catch (err) {
      console.error('Failed to start background music:', err);
      throw err;
    }
  }

  stop() {
    if (this.source) {
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
    this.isPlaying = false;
  }
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AudioSettings>(() => {
    const saved = localStorage.getItem('poker-shootout-audio');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Used by toggleMute (kept in provider, not per-component)
  const lastNonZeroMasterVolumeRef = useRef<number>(settings.masterVolume || DEFAULT_SETTINGS.masterVolume);
  const masterVolumeRef = useRef<number>(settings.masterVolume);

  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isMusicLoading, setIsMusicLoading] = useState(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(() => window.__audioUnlocked ?? false);
  const audioCtxRef = useRef<AudioContext | null>(globalAudioContext);
  const musicRef = useRef<BackgroundMusic | null>(null);
  const pendingSoundsRef = useRef<SoundType[]>([]);

  useEffect(() => {
    const checkUnlockState = () => {
      if (window.__audioUnlocked && !isAudioUnlocked) {
        setIsAudioUnlocked(true);
      }
      // Use global context if available
      if (globalAudioContext && !audioCtxRef.current) {
        audioCtxRef.current = globalAudioContext;
        musicRef.current = new BackgroundMusic(globalAudioContext);
      }
    };
    
    checkUnlockState();
    // Check periodically in case global unlock happens
    const interval = setInterval(checkUnlockState, 100);
    return () => clearInterval(interval);
  }, [isAudioUnlocked]);

  // Helper to ensure AudioContext exists (uses global if available)
  const ensureAudioContext = useCallback(() => {
    // Prefer global context
    if (globalAudioContext) {
      if (!audioCtxRef.current) {
        audioCtxRef.current = globalAudioContext;
        musicRef.current = new BackgroundMusic(globalAudioContext);
      }
      return globalAudioContext;
    }
    
    if (!audioCtxRef.current) {
      console.log('[Audio] Creating new AudioContext (no global available)');
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      globalAudioContext = audioCtxRef.current;
      window.__audioContext = audioCtxRef.current;
      musicRef.current = new BackgroundMusic(audioCtxRef.current);
      console.log('[Audio] AudioContext created, state:', audioCtxRef.current.state);
    }
    return audioCtxRef.current;
  }, []);

  const unlockAudio = useCallback(async (): Promise<boolean> => {
    console.log('[Audio] unlockAudio (fallback) called');

    // Use the global unlock function
    const success = await globalUnlockAudio();

    if (success) {
      setIsAudioUnlocked(true);

      // Ensure we're using the global context
      if (globalAudioContext && !audioCtxRef.current) {
        audioCtxRef.current = globalAudioContext;
        musicRef.current = new BackgroundMusic(globalAudioContext);
      }

      // Force re-connect master -> destination to keep the "pipe" open
      const ctx = ensureAudioContext();
      forceReconnectMaster(ctx);

      // Play any queued sounds
      if (pendingSoundsRef.current.length > 0 && ctx.state === 'running') {
        console.log('[Audio] Playing', pendingSoundsRef.current.length, 'queued sounds');
        pendingSoundsRef.current.forEach((sound) => {
          playSoundInternal(ctx, sound, settings.sfxVolume);
        });
        pendingSoundsRef.current = [];
      }
    }

    return success;
  }, [ensureAudioContext, settings.sfxVolume]);


  // Persist settings
  useEffect(() => {
    localStorage.setItem('poker-shootout-audio', JSON.stringify(settings));
  }, [settings]);

  // Track last non-zero master volume for toggleMute
  useEffect(() => {
    masterVolumeRef.current = settings.masterVolume;
    if (settings.masterVolume > 0) {
      lastNonZeroMasterVolumeRef.current = settings.masterVolume;
    }
  }, [settings.masterVolume]);

  // Update master gain node when master volume changes
  useEffect(() => {
    if (globalMasterGain && globalAudioContext) {
      globalMasterGain.gain.setValueAtTime(settings.masterVolume, globalAudioContext.currentTime);
      console.log('[Audio] Master gain updated to:', settings.masterVolume);
    }
  }, [settings.masterVolume]);

  // Update music volume when settings change
  useEffect(() => {
    if (musicRef.current && isMusicPlaying) {
      musicRef.current.setVolume(settings.musicVolume);
    }
  }, [settings.masterVolume, settings.musicVolume, isMusicPlaying]);

  // Stop music when disabled
  useEffect(() => {
    if (!settings.musicEnabled && isMusicPlaying) {
      musicRef.current?.stop();
      setIsMusicPlaying(false);
    }
  }, [settings.musicEnabled, isMusicPlaying]);

  // Internal sound player (doesn't check state, assumes running)
  const playSoundInternal = (ctx: AudioContext, soundType: SoundType, volume: number) => {
    switch (soundType) {
      case 'cardSelect':
        playCardSelect(ctx, volume);
        break;
      case 'cardFlip':
        playCardFlip(ctx, volume);
        break;
      case 'handSubmit':
        playHandSubmit(ctx, volume);
        break;
      case 'handWin':
        playHandWin(ctx, volume);
        break;
      case 'levelComplete':
        playLevelComplete(ctx, volume);
        break;
      case 'gameOver':
        playGameOver(ctx, volume);
        break;
      case 'buttonClick':
        playButtonClick(ctx, volume);
        break;
      case 'timer':
        playTimer(ctx, volume);
        break;
      case 'countdownTick':
        playCountdownTick(ctx, volume);
        break;
      case 'countdownUrgent':
        playCountdownUrgent(ctx, volume);
        break;
      case 'bonusCountdown':
        playBonusCountdown(ctx, volume);
        break;
    }
  };

  const startMusic = useCallback(async (): Promise<void> => {
    console.log('[Audio] startMusic called, musicEnabled:', settings.musicEnabled);
    if (!settings.musicEnabled) return;

    // Ensure SDK init + AudioContext resume follows CrazyGames requirements
    const unlocked = await globalUnlockAudio();
    if (!unlocked) {
      console.log('[Audio] startMusic aborted - audio unlock failed');
      return;
    }

    const ctx = ensureAudioContext();
    console.log('[Audio] AudioContext state:', ctx.state);
    console.log('AudioContext state:', ctx.state);

    if (ctx.state !== 'running') {
      console.log('[Audio] startMusic aborted - AudioContext not running');
      return;
    }

    setIsAudioUnlocked(true);
    setIsMusicLoading(true);
    try {
      // Only set music volume (master volume is handled by global master gain)
      const volume = settings.musicVolume;
      console.log('[Audio] Starting music with volume:', volume);
      await musicRef.current?.start(volume);
      console.log('[Audio] Music started successfully');
      setIsMusicPlaying(true);
    } catch (err) {
      console.error('[Audio] Failed to start music:', err);
    } finally {
      setIsMusicLoading(false);
    }
  }, [settings.musicEnabled, settings.masterVolume, settings.musicVolume, ensureAudioContext]);

  const stopMusic = useCallback(() => {
    musicRef.current?.stop();
    setIsMusicPlaying(false);
  }, []);

  const playSound = useCallback((soundType: SoundType) => {
    if (!settings.sfxEnabled) return;

    const ctx = ensureAudioContext();

    // Zero-bypass rule: do not play unless we can route via strict master
    let masterGainNode: GainNode | null = null;
    try {
      masterGainNode = getStrictMaster(ctx);
    } catch {
      masterGainNode = null;
    }

    console.log('[Audio Debug] Routing through Master Gain:', masterGainNode !== null);
    if (!masterGainNode) return;

    // Individual sound volume only; master gain is handled globally
    const volume = settings.sfxVolume;

    if (ctx.state === 'running') {
      playSoundInternal(ctx, soundType, volume);
      return;
    }

    if (ctx.state === 'suspended') {
      // Queue and unlock using the SDK-synced global unlocker
      console.log('[Audio] AudioContext suspended, queueing sound:', soundType);
      pendingSoundsRef.current.push(soundType);

      globalUnlockAudio()
        .then((success) => {
          console.log('[Audio] playSound unlock result:', success);
          console.log('AudioContext state:', ctx.state);
          if (!success) return;

          setIsAudioUnlocked(true);

          if (ctx.state !== 'running') {
            console.log('[Audio] AudioContext still not running after unlock:', ctx.state);
            return;
          }

          const pending = [...pendingSoundsRef.current];
          pendingSoundsRef.current = [];
          pending.forEach((sound) => playSoundInternal(ctx, sound, volume));
        })
        .catch((err) => {
          console.error('[Audio] playSound unlock error:', err);
        });
      return;
    }

    console.log('[Audio] AudioContext in unexpected state:', ctx.state, '- skipping sound:', soundType);
  }, [settings.sfxEnabled, settings.sfxVolume, ensureAudioContext]);

  const setMasterVolume = useCallback((volume: number) => {
    // Keep refs in sync immediately (prevents stale closures on rapid clicks)
    masterVolumeRef.current = volume;
    if (volume > 0) {
      lastNonZeroMasterVolumeRef.current = volume;
    }

    // Update state
    setSettings((prev) => ({ ...prev, masterVolume: volume }));

    const ctx = ensureAudioContext();
    const master = forceReconnectMaster(ctx);

    // Immediate volume sync (responsive slider / click)
    master.gain.setTargetAtTime(volume, ctx.currentTime, 0.01);
    console.log('[Audio] Master gain set to:', volume);
  }, [ensureAudioContext]);

  const toggleMute = useCallback(() => {
    const current = masterVolumeRef.current;
    const next = current > 0
      ? 0
      : (lastNonZeroMasterVolumeRef.current || DEFAULT_SETTINGS.masterVolume);
    setMasterVolume(next);
  }, [setMasterVolume]);

  const value: AudioContextValue = {
    ...settings,
    isMuted: settings.masterVolume <= 0,
    toggleMute,
    setMasterVolume,
    setSfxEnabled: (enabled) => setSettings(prev => ({ ...prev, sfxEnabled: enabled })),
    setSfxVolume: (volume) => setSettings(prev => ({ ...prev, sfxVolume: volume })),
    setMusicEnabled: (enabled) => setSettings(prev => ({ ...prev, musicEnabled: enabled })),
    setMusicVolume: (volume) => setSettings(prev => ({ ...prev, musicVolume: volume })),
    playSound,
    startMusic,
    stopMusic,
    isMusicPlaying,
    isMusicLoading,
    unlockAudio,
    isAudioUnlocked,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
