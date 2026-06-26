export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise';

export interface SynthParams {
  waveform: WaveformType;
  startFreq: number;
  endFreq: number;
  duration: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  volume: number;
  vibratoFreq: number;
  vibratoDepth: number;
  filterFreq: number;
  filterSweep: boolean;
  distortion: number;
  noiseType?: 'white' | 'pink' | 'brown';
}

export interface SoundEffect {
  id: string;
  name: string;
  khmerName: string;
  category: 'game' | 'ui' | 'music' | 'custom';
  icon: string; // Lucide icon name
  color: string; // Theme styling colors
  keyTrigger?: string; // mapped keyboard key
  params: SynthParams;
  audioData?: string; // Base64 encoded audio file data
}

export interface SequencerStep {
  id: string;
  soundId: string | null; // which sound plays at this step, null for silent
  volume: number; // 0 to 1
}

export interface PlaylistTrack {
  id: string;
  name: string;
  soundIds: string[];
  delay: number; // Delay in ms between sounds
}
