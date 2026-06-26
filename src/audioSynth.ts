import { SynthParams } from './types';

let audioCtx: AudioContext | null = null;
let masterAnalyser: AnalyserNode | null = null;

/**
 * Lazily initialize or resume the global AudioContext
 */
export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    // Standard AudioContext initialization
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
    
    // Create master analyser node for real-time visualization
    masterAnalyser = audioCtx.createAnalyser();
    masterAnalyser.fftSize = 64; // Small fftSize for fast, high-performance updates
    masterAnalyser.smoothingTimeConstant = 0.75;
    masterAnalyser.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Access the global AnalyserNode for real-time visualizers
 */
export function getAnalyser(): AnalyserNode | null {
  // If not yet initialized, don't force it, just return null
  return masterAnalyser;
}

/**
 * Generate a custom distortion curve for the WaveShaperNode
 * @param amount 0 to 1 value representing distortion strength
 */
function makeDistortionCurve(amount: number): Float32Array {
  const k = amount * 100;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

/**
 * Generate white noise sound buffer
 */
function createWhiteNoiseBuffer(ctx: BaseAudioContext, duration: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const bufferSize = Math.max(sampleRate * duration, 1);
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/**
 * Core synthesis function that constructs the audio graph on any BaseAudioContext.
 * This is used for both real-time playback and offline rendering (WAV export).
 */
export function setupSynthGraph(
  ctx: BaseAudioContext,
  params: SynthParams,
  destination: AudioNode
): { start: (time: number) => void; stop: (time: number) => void } {
  const now = ctx.currentTime;
  const duration = Math.max(params.duration, 0.01);

  // 1. Create Nodes
  const gainNode = ctx.createGain();
  const filterNode = ctx.createBiquadFilter();
  let sourceNode: OscillatorNode | AudioBufferSourceNode;

  // Connection chain: Source -> [Distortion] -> Filter -> Gain -> Destination
  let lastNode: AudioNode = gainNode;

  // 2. Set up Distortion if requested
  if (params.distortion > 0) {
    const distNode = ctx.createWaveShaper();
    distNode.curve = makeDistortionCurve(params.distortion);
    distNode.oversample = '4x';
    distNode.connect(gainNode);
    lastNode = distNode;
  }

  // 3. Connect Filter
  filterNode.type = 'lowpass';
  filterNode.connect(lastNode);
  lastNode = filterNode;

  // 4. Set up Main Source (Oscillator or Noise)
  let startCallback = (time: number) => {};
  let stopCallback = (time: number) => {};

  if (params.waveform === 'noise') {
    // Noise Generator
    const noiseBuffer = createWhiteNoiseBuffer(ctx, duration);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.connect(lastNode);
    sourceNode = noiseSource;
    startCallback = (time) => noiseSource.start(time);
    stopCallback = (time) => noiseSource.stop(time + duration + 0.1);
  } else {
    // Standard Oscillator
    const osc = ctx.createOscillator();
    osc.type = params.waveform;
    
    // Frequency configuration (Sweep logic)
    const startFreq = Math.max(params.startFreq, 1);
    const endFreq = params.endFreq > 0 ? params.endFreq : startFreq;

    osc.frequency.setValueAtTime(startFreq, now);
    if (endFreq !== startFreq) {
      // Use exponential ramp for pitch sweep as it sounds more natural, fallback to linear if zero
      try {
        osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), now + duration);
      } catch (e) {
        osc.frequency.linearRampToValueAtTime(endFreq, now + duration);
      }
    }

    // Vibrato (LFO)
    if (params.vibratoFreq > 0 && params.vibratoDepth > 0) {
      const vibratoOsc = ctx.createOscillator();
      const vibratoGain = ctx.createGain();
      
      vibratoOsc.frequency.setValueAtTime(params.vibratoFreq, now);
      vibratoGain.gain.setValueAtTime(params.vibratoDepth, now);
      
      vibratoOsc.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      
      vibratoOsc.start(now);
      vibratoOsc.stop(now + duration + params.release);
    }

    osc.connect(lastNode);
    sourceNode = osc;
    startCallback = (time) => osc.start(time);
    stopCallback = (time) => osc.stop(time + duration + params.release);
  }

  // 5. Configure Lowpass Filter (with sweep if enabled)
  const initialFilterFreq = Math.max(params.filterFreq, 20);
  filterNode.frequency.setValueAtTime(initialFilterFreq, now);
  if (params.filterSweep) {
    // Sweep down to 60Hz or 10% of filterFreq over the duration
    const targetFilterFreq = Math.max(60, initialFilterFreq * 0.1);
    try {
      filterNode.frequency.exponentialRampToValueAtTime(targetFilterFreq, now + duration);
    } catch (e) {
      filterNode.frequency.linearRampToValueAtTime(targetFilterFreq, now + duration);
    }
  }

  // 6. Configure ADSR Gain Envelope
  const maxVolume = Math.max(params.volume, 0.001);
  const sustainLevel = maxVolume * Math.max(params.sustain, 0);

  // Safe timing values
  const totalLength = duration;
  const attackTime = totalLength * Math.max(0, Math.min(params.attack, 1));
  const decayTime = totalLength * Math.max(0, Math.min(params.decay, 1));
  
  const t0 = now;
  const tPeak = t0 + attackTime;
  const tSustainEnd = tPeak + decayTime;
  const tEnd = t0 + totalLength;

  // Initialize gain to zero
  gainNode.gain.setValueAtTime(0.0001, t0);
  
  // Attack: Ramp to max volume
  gainNode.gain.linearRampToValueAtTime(maxVolume, tPeak);
  
  // Decay: Ramp down to sustain level
  if (decayTime > 0) {
    gainNode.gain.linearRampToValueAtTime(sustainLevel, tSustainEnd);
  } else {
    gainNode.gain.setValueAtTime(sustainLevel, tPeak);
  }
  
  // Keep constant during sustain phase (handled inherently by scheduling release)
  gainNode.gain.setValueAtTime(sustainLevel, tEnd);
  
  // Release Phase: ramp to zero
  const releaseTime = Math.max(params.release, 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, tEnd + releaseTime);

  // Connect gain to final destination
  gainNode.connect(destination);

  return {
    start: startCallback,
    stop: stopCallback,
  };
}

const audioBufferCache = new Map<string, AudioBuffer>();

/**
 * Decode a base64 string audio file into an AudioBuffer with local caching
 */
export async function getAudioBufferFromBase64(ctx: BaseAudioContext, base64: string): Promise<AudioBuffer> {
  if (audioBufferCache.has(base64)) {
    return audioBufferCache.get(base64)!;
  }
  
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const binaryString = window.atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Use decodeAudioData
  const buffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
  audioBufferCache.set(base64, buffer);
  return buffer;
}

/**
 * Play a synthesized sound effect or pre-recorded MP3/WAV in real time
 */
export function playSound(params: SynthParams, audioData?: string): void {
  try {
    const ctx = getAudioContext();
    const destNode = masterAnalyser || ctx.destination;
    
    if (audioData) {
      getAudioBufferFromBase64(ctx, audioData).then((buffer) => {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        
        // Connect through a gain node to respect volume
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(params.volume !== undefined ? params.volume : 1.0, ctx.currentTime);
        
        source.connect(gainNode);
        gainNode.connect(destNode);
        source.start(0);
      }).catch((err) => {
        console.error('Error playing custom audio:', err);
      });
      return;
    }

    const graph = setupSynthGraph(ctx, params, destNode);
    const now = ctx.currentTime;
    graph.start(now);
    graph.stop(now);
  } catch (err) {
    console.error('Error playing sound:', err);
  }
}

/**
 * Converts AudioBuffer to WAV format binary data offline
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // 1 = raw 16-bit signed PCM
  const bitDepth = 16;
  
  let result;
  if (numOfChan === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }
  
  const bufferArr = new ArrayBuffer(44 + result.length * 2);
  const view = new DataView(bufferArr);
  
  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + result.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numOfChan, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, numOfChan * (bitDepth / 8), true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, result.length * 2, true);
  
  // Write the PCM samples
  floatTo16BitPCM(view, 44, result);
  
  return new Blob([bufferArr], { type: 'audio/wav' });
}

function interleave(inputL: Float32Array, inputR: Float32Array): Float32Array {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);
  let index = 0;
  let inputIndex = 0;
  
  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array): void {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Render a customized sound effect offline to create a downloadable WAV Blob,
 * or return the original file directly if it's an uploaded MP3/WAV.
 */
export async function renderToWav(params: SynthParams, audioData?: string): Promise<Blob> {
  if (audioData) {
    const base64Data = audioData.includes(',') ? audioData.split(',')[1] : audioData;
    const contentType = audioData.includes(',') 
      ? audioData.split(',')[0].split(':')[1].split(';')[0] 
      : 'audio/mp3';
      
    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: contentType });
  }

  const sampleRate = 44100;
  const totalDuration = params.duration + params.release + 0.1;
  
  // Create offline audio context
  const OfflineContextClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  const offlineCtx = new OfflineContextClass(1, Math.ceil(sampleRate * totalDuration), sampleRate);
  
  // Set up the exact same graph in the offline context
  const graph = setupSynthGraph(offlineCtx, params, offlineCtx.destination);
  
  // Trigger playback at time 0
  graph.start(0);
  graph.stop(0);
  
  // Render and encode
  const renderedBuffer = await offlineCtx.startRendering();
  return audioBufferToWav(renderedBuffer);
}
