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
}

export type SoundType = 
  | 'cardSelect' 
  | 'cardFlip' 
  | 'handSubmit' 
  | 'handWin' 
  | 'levelComplete' 
  | 'gameOver' 
  | 'buttonClick'
  | 'timer';

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

function playCardSelect(audioCtx: AudioContext, volume: number): void {
  // Bullet hitting tin can sound - sharp attack with metallic resonance
  const now = audioCtx.currentTime;
  
  // Impact noise burst
  const bufferSize = audioCtx.sampleRate * 0.05;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
  }
  
  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  
  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 2000;
  
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(volume * 1.5, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
  
  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);
  noiseSource.start(now);
  
  // Metallic ping (tin can resonance)
  const ping = audioCtx.createOscillator();
  const pingGain = audioCtx.createGain();
  ping.type = 'sine';
  ping.frequency.setValueAtTime(1800, now);
  ping.frequency.exponentialRampToValueAtTime(800, now + 0.08);
  pingGain.gain.setValueAtTime(volume * 1.0, now);
  pingGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
  ping.connect(pingGain);
  pingGain.connect(audioCtx.destination);
  ping.start(now);
  ping.stop(now + 0.15);
  
  // Secondary metallic overtone
  const overtone = audioCtx.createOscillator();
  const overtoneGain = audioCtx.createGain();
  overtone.type = 'triangle';
  overtone.frequency.setValueAtTime(3200, now);
  overtone.frequency.exponentialRampToValueAtTime(1200, now + 0.06);
  overtoneGain.gain.setValueAtTime(volume * 0.5, now);
  overtoneGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
  overtone.connect(overtoneGain);
  overtoneGain.connect(audioCtx.destination);
  overtone.start(now);
  overtone.stop(now + 0.1);
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
  createOscillatorSound(audioCtx, 392, 0.3, 'sawtooth', volume * 0.2);
  setTimeout(() => {
    createOscillatorSound(audioCtx, 330, 0.3, 'sawtooth', volume * 0.2);
  }, 200);
  setTimeout(() => {
    createOscillatorSound(audioCtx, 262, 0.5, 'sawtooth', volume * 0.15);
  }, 400);
}

function playButtonClick(audioCtx: AudioContext, volume: number): void {
  createOscillatorSound(audioCtx, 1000, 0.05, 'square', volume * 0.15);
}

function playTimer(audioCtx: AudioContext, volume: number): void {
  createOscillatorSound(audioCtx, 440, 0.1, 'sine', volume * 0.2);
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

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Initialize AudioContext on first user interaction
  useEffect(() => {
    const initAudioContext = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
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

  const playSound = useCallback((soundType: SoundType) => {
    if (!settings.sfxEnabled) return;
    
    // Ensure AudioContext is created
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
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
