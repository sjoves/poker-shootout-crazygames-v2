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
  startMusic: () => void;
  stopMusic: () => void;
  isMusicPlaying: boolean;
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

// 8-bit style music generator
class EightBitMusic {
  private audioCtx: AudioContext;
  private gainNode: GainNode;
  private isPlaying: boolean = false;
  private schedulerId: number | null = null;
  private nextNoteTime: number = 0;
  private currentNote: number = 0;
  
  // 8-bit style melody - upbeat poker/casino vibe
  private melody = [
    { note: 392, duration: 0.15 },  // G4
    { note: 440, duration: 0.15 },  // A4
    { note: 494, duration: 0.15 },  // B4
    { note: 523, duration: 0.3 },   // C5
    { note: 494, duration: 0.15 },  // B4
    { note: 440, duration: 0.15 },  // A4
    { note: 392, duration: 0.3 },   // G4
    { note: 0, duration: 0.15 },    // Rest
    { note: 330, duration: 0.15 },  // E4
    { note: 392, duration: 0.15 },  // G4
    { note: 440, duration: 0.3 },   // A4
    { note: 392, duration: 0.15 },  // G4
    { note: 330, duration: 0.15 },  // E4
    { note: 294, duration: 0.3 },   // D4
    { note: 0, duration: 0.15 },    // Rest
    { note: 330, duration: 0.15 },  // E4
    { note: 392, duration: 0.15 },  // G4
    { note: 494, duration: 0.15 },  // B4
    { note: 523, duration: 0.3 },   // C5
    { note: 587, duration: 0.15 },  // D5
    { note: 523, duration: 0.15 },  // C5
    { note: 494, duration: 0.15 },  // B4
    { note: 440, duration: 0.3 },   // A4
    { note: 0, duration: 0.15 },    // Rest
  ];
  
  // Bass line
  private bassLine = [
    { note: 196, duration: 0.3 },   // G3
    { note: 196, duration: 0.3 },   // G3
    { note: 220, duration: 0.3 },   // A3
    { note: 220, duration: 0.3 },   // A3
    { note: 165, duration: 0.3 },   // E3
    { note: 165, duration: 0.3 },   // E3
    { note: 147, duration: 0.3 },   // D3
    { note: 147, duration: 0.3 },   // D3
  ];
  
  private bassIndex: number = 0;

  constructor(audioCtx: AudioContext) {
    this.audioCtx = audioCtx;
    this.gainNode = audioCtx.createGain();
    this.gainNode.connect(audioCtx.destination);
  }

  setVolume(volume: number) {
    this.gainNode.gain.setValueAtTime(volume * 0.15, this.audioCtx.currentTime);
  }

  start(volume: number) {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.setVolume(volume);
    this.nextNoteTime = this.audioCtx.currentTime;
    this.scheduleNotes();
  }

  stop() {
    this.isPlaying = false;
    if (this.schedulerId !== null) {
      cancelAnimationFrame(this.schedulerId);
      this.schedulerId = null;
    }
  }

  private scheduleNotes() {
    if (!this.isPlaying) return;

    while (this.nextNoteTime < this.audioCtx.currentTime + 0.1) {
      this.playNote(this.nextNoteTime);
      this.playBass(this.nextNoteTime);
      
      const currentMelodyNote = this.melody[this.currentNote];
      this.nextNoteTime += currentMelodyNote.duration;
      this.currentNote = (this.currentNote + 1) % this.melody.length;
    }

    this.schedulerId = requestAnimationFrame(() => this.scheduleNotes());
  }

  private playNote(time: number) {
    const noteData = this.melody[this.currentNote];
    if (noteData.note === 0) return; // Rest

    const osc = this.audioCtx.createOscillator();
    const noteGain = this.audioCtx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(noteData.note, time);
    
    noteGain.gain.setValueAtTime(0.3, time);
    noteGain.gain.exponentialRampToValueAtTime(0.01, time + noteData.duration * 0.9);
    
    osc.connect(noteGain);
    noteGain.connect(this.gainNode);
    
    osc.start(time);
    osc.stop(time + noteData.duration);
  }

  private playBass(time: number) {
    // Play bass note every 2 melody notes
    if (this.currentNote % 3 !== 0) return;
    
    const bassData = this.bassLine[this.bassIndex];
    this.bassIndex = (this.bassIndex + 1) % this.bassLine.length;

    const osc = this.audioCtx.createOscillator();
    const bassGain = this.audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(bassData.note, time);
    
    bassGain.gain.setValueAtTime(0.4, time);
    bassGain.gain.exponentialRampToValueAtTime(0.01, time + bassData.duration * 0.8);
    
    osc.connect(bassGain);
    bassGain.connect(this.gainNode);
    
    osc.start(time);
    osc.stop(time + bassData.duration);
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
  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicRef = useRef<EightBitMusic | null>(null);

  // Initialize AudioContext on first user interaction
  useEffect(() => {
    const initAudioContext = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        musicRef.current = new EightBitMusic(audioCtxRef.current);
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

  const startMusic = useCallback(() => {
    if (!settings.musicEnabled) return;
    
    // Ensure AudioContext is created
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      musicRef.current = new EightBitMusic(audioCtxRef.current);
    }
    
    // Resume if suspended
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    const volume = settings.masterVolume * settings.musicVolume;
    musicRef.current?.start(volume);
    setIsMusicPlaying(true);
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
      musicRef.current = new EightBitMusic(audioCtxRef.current);
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
    startMusic,
    stopMusic,
    isMusicPlaying,
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
