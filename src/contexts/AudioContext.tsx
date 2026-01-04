import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

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
  // Play the card-hit.mp3 sound file
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
  // Play the game-over.wav sound file
  loadAudioBuffer(audioCtx, '/sounds/game-over.wav').then((buffer) => {
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
  // Play the uploaded pulsed 808 bass drum sound
  loadAudioBuffer(audioCtx, '/sounds/countdown-tick.wav').then((buffer) => {
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
  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicRef = useRef<BackgroundMusic | null>(null);

  // Initialize AudioContext on first user interaction
  useEffect(() => {
    const initAudioContext = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        musicRef.current = new BackgroundMusic(audioCtxRef.current);
      }
    };

    document.addEventListener('click', initAudioContext, { once: true });
    document.addEventListener('touchstart', initAudioContext, { once: true });

    return () => {
      document.removeEventListener('click', initAudioContext);
      document.removeEventListener('touchstart', initAudioContext);
    };
  }, []);

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

  const startMusic = useCallback(async (): Promise<void> => {
    console.log('startMusic called, musicEnabled:', settings.musicEnabled);
    if (!settings.musicEnabled) return;
    
    // Ensure AudioContext is created
    if (!audioCtxRef.current) {
      console.log('Creating new AudioContext');
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      musicRef.current = new BackgroundMusic(audioCtxRef.current);
    }
    
    console.log('AudioContext state:', audioCtxRef.current.state);
    
    // Resume if suspended
    if (audioCtxRef.current.state === 'suspended') {
      console.log('Resuming suspended AudioContext');
      await audioCtxRef.current.resume();
      console.log('AudioContext resumed, new state:', audioCtxRef.current.state);
    }

    setIsMusicLoading(true);
    try {
      const volume = settings.masterVolume * settings.musicVolume;
      console.log('Starting music with volume:', volume);
      await musicRef.current?.start(volume);
      console.log('Music started successfully');
      setIsMusicPlaying(true);
    } catch (err) {
      console.error('Failed to start music:', err);
    } finally {
      setIsMusicLoading(false);
    }
  }, [settings.musicEnabled, settings.masterVolume, settings.musicVolume]);

  const stopMusic = useCallback(() => {
    musicRef.current?.stop();
    setIsMusicPlaying(false);
  }, []);

  const playSound = useCallback((soundType: SoundType) => {
    if (!settings.sfxEnabled) return;
    
    // Ensure AudioContext is created
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      musicRef.current = new BackgroundMusic(audioCtxRef.current);
    }
    
    // Resume if suspended
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    const volume = settings.masterVolume * settings.sfxVolume;
    const ctx = audioCtxRef.current;

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
  }, [settings.sfxEnabled, settings.masterVolume, settings.sfxVolume]);

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
