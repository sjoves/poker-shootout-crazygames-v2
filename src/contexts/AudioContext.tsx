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
let sdkInitialized = false;
let unlockAttempted = false;

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
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
  
  gainNode.gain.setValueAtTime(gain, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  
  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + duration);
}

// Cache for loaded audio buffers
const audioBufferCache = new Map<string, AudioBuffer>();

async function loadAudioBuffer(audioCtx: AudioContext, url: string): Promise<AudioBuffer> {
  const cached = audioBufferCache.get(url);
  if (cached) return cached;
  
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  audioBufferCache.set(url, audioBuffer);
  return audioBuffer;
}

function playCardSelect(audioCtx: AudioContext, volume: number): void {
  loadAudioBuffer(audioCtx, '/sounds/card-hit.mp3').then((buffer) => {
    const source = audioCtx.createBufferSource();
    const gainNode = audioCtx.createGain();
    
    source.buffer = buffer;
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    source.start();
  }).catch((err) => {
    console.error('Failed to play card select sound:', err);
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
  loadAudioBuffer(audioCtx, '/sounds/game-over.mp3').then((buffer) => {
    const source = audioCtx.createBufferSource();
    const gainNode = audioCtx.createGain();
    
    source.buffer = buffer;
    gainNode.gain.setValueAtTime(volume * 0.8, audioCtx.currentTime);
    
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    source.start();
  }).catch((err) => {
    console.error('Failed to play game over sound:', err);
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
  
  // High-pitched tick
  const tick = audioCtx.createOscillator();
  const tickGain = audioCtx.createGain();
  tick.type = 'square';
  tick.frequency.setValueAtTime(880, now);
  tick.frequency.exponentialRampToValueAtTime(440, now + 0.08);
  tickGain.gain.setValueAtTime(volume * 0.4, now);
  tickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
  tick.connect(tickGain);
  tickGain.connect(audioCtx.destination);
  tick.start(now);
  tick.stop(now + 0.12);
}

function playCountdownUrgent(audioCtx: AudioContext, volume: number): void {
  // More urgent double-tick for last 3 seconds
  const now = audioCtx.currentTime;
  
  // First tick
  const tick1 = audioCtx.createOscillator();
  const tick1Gain = audioCtx.createGain();
  tick1.type = 'square';
  tick1.frequency.setValueAtTime(1200, now);
  tick1.frequency.exponentialRampToValueAtTime(600, now + 0.06);
  tick1Gain.gain.setValueAtTime(volume * 0.5, now);
  tick1Gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
  tick1.connect(tick1Gain);
  tick1Gain.connect(audioCtx.destination);
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
  tick2Gain.connect(audioCtx.destination);
  tick2.start(now + 0.1);
  tick2.stop(now + 0.2);
}

function playBonusCountdown(audioCtx: AudioContext, volume: number): void {
  // Play the countdown pulse sound
  loadAudioBuffer(audioCtx, '/sounds/countdown-tick.mp3').then((buffer) => {
    const source = audioCtx.createBufferSource();
    const gainNode = audioCtx.createGain();
    
    source.buffer = buffer;
    gainNode.gain.setValueAtTime(volume * 0.8, audioCtx.currentTime);
    
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    source.start();
  }).catch((err) => {
    console.error('Failed to play bonus countdown sound:', err);
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
    this.gainNode.connect(audioCtx.destination);
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
        this.audioBuffer = await loadAudioBuffer(this.audioCtx, '/sounds/background-music.mp3');
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

  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isMusicLoading, setIsMusicLoading] = useState(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(() => window.__audioUnlocked ?? false);
  const audioCtxRef = useRef<AudioContext | null>(globalAudioContext);
  const musicRef = useRef<BackgroundMusic | null>(null);
  const pendingSoundsRef = useRef<SoundType[]>([]);

  // Sync with global unlock state
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

  // Fallback unlock function - can be called explicitly from buttons
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
      
      // Play any queued sounds
      const ctx = ensureAudioContext();
      if (pendingSoundsRef.current.length > 0 && ctx.state === 'running') {
        console.log('[Audio] Playing', pendingSoundsRef.current.length, 'queued sounds');
        pendingSoundsRef.current.forEach(sound => {
          playSoundInternal(ctx, sound, settings.masterVolume * settings.sfxVolume);
        });
        pendingSoundsRef.current = [];
      }
    }
    
    return success;
  }, [ensureAudioContext, settings.masterVolume, settings.sfxVolume]);


  // Persist settings
  useEffect(() => {
    localStorage.setItem('poker-shootout-audio', JSON.stringify(settings));
  }, [settings]);

  // Update music volume when settings change
  useEffect(() => {
    if (musicRef.current && isMusicPlaying) {
      musicRef.current.setVolume(settings.masterVolume * settings.musicVolume);
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
    
    const ctx = ensureAudioContext();
    console.log('[Audio] AudioContext state:', ctx.state);
    
    // Resume if suspended
    if (ctx.state === 'suspended') {
      try {
        console.log('[Audio] Resuming suspended AudioContext for music...');
        await ctx.resume();
        console.log('[Audio] AudioContext resumed, new state:', ctx.state);
        setIsAudioUnlocked(true);
      } catch (err) {
        console.error('[Audio] Failed to resume AudioContext for music:', err);
        return;
      }
    }

    setIsMusicLoading(true);
    try {
      const volume = settings.masterVolume * settings.musicVolume;
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
    const volume = settings.masterVolume * settings.sfxVolume;
    
    // Check if AudioContext is running
    if (ctx.state === 'running') {
      playSoundInternal(ctx, soundType, volume);
    } else if (ctx.state === 'suspended') {
      // Queue the sound and try to resume
      console.log('[Audio] AudioContext suspended, queueing sound:', soundType);
      pendingSoundsRef.current.push(soundType);
      
      // Try to resume (will play queued sounds on success)
      ctx.resume().then(() => {
        console.log('[Audio] AudioContext resumed from playSound, state:', ctx.state);
        setIsAudioUnlocked(true);
        // Play queued sounds
        const pending = [...pendingSoundsRef.current];
        pendingSoundsRef.current = [];
        pending.forEach(sound => playSoundInternal(ctx, sound, volume));
      }).catch(err => {
        console.error('[Audio] Failed to resume AudioContext from playSound:', err);
      });
    } else {
      console.log('[Audio] AudioContext in unexpected state:', ctx.state, '- skipping sound:', soundType);
    }
  }, [settings.sfxEnabled, settings.masterVolume, settings.sfxVolume, ensureAudioContext]);

  const value: AudioContextValue = {
    ...settings,
    setMasterVolume: (volume) => setSettings(prev => ({ ...prev, masterVolume: volume })),
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
