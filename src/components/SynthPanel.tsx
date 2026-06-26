import { useState, useEffect, useRef } from 'react';
import { SoundEffect, SynthParams, WaveformType } from '../types';
import { playSound, renderToWav } from '../audioSynth';
import { Icon } from './Icon';

interface SynthPanelProps {
  selectedEffect: SoundEffect;
  onSave: (updatedEffect: SoundEffect) => void;
  onCloneAsCustom: (effect: SoundEffect) => void;
}

const AVAILABLE_ICONS = [
  'Zap', 'Coins', 'ArrowUp', 'Sparkles', 'Bomb', 'ShieldAlert', 'Trophy', 'Skull',
  'MousePointer', 'CheckCircle2', 'XCircle', 'AlertTriangle', 'Wind', 'Flame',
  'Drum', 'Tv', 'Music', 'Waves', 'Cloud'
];

export function SynthPanel({ selectedEffect, onSave, onCloneAsCustom }: SynthPanelProps) {
  const [name, setName] = useState(selectedEffect.name);
  const [khmerName, setKhmerName] = useState(selectedEffect.khmerName);
  const [icon, setIcon] = useState(selectedEffect.icon);
  const [params, setParams] = useState<SynthParams>({ ...selectedEffect.params });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync state when selected effect changes
  useEffect(() => {
    setName(selectedEffect.name);
    setKhmerName(selectedEffect.khmerName);
    setIcon(selectedEffect.icon);
    setParams({ ...selectedEffect.params });
  }, [selectedEffect]);

  // Play current sound settings
  const handlePlayTest = () => {
    setIsPlaying(true);
    playSound(params);
    setTimeout(() => setIsPlaying(false), params.duration * 1000 + 100);
  };

  // Trigger WAV export
  const handleExportWav = async () => {
    if (isExporting) return;
    try {
      setIsExporting(true);
      const blob = await renderToWav(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.toLowerCase().replace(/\s+/g, '_')}_synth.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export sound:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Update a single parameter value
  const updateParam = (key: keyof SynthParams, value: any) => {
    setParams((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Save changes back to catalog
  const handleSave = () => {
    const updated: SoundEffect = {
      ...selectedEffect,
      name,
      khmerName,
      icon,
      params,
    };
    onSave(updated);
  };

  // Clone current sound settings as a brand new custom sound
  const handleCreateNew = () => {
    const cloned: SoundEffect = {
      ...selectedEffect,
      id: `custom-${Date.now()}`,
      name: `${name} Custom`,
      khmerName: `${khmerName} ថ្មី`,
      category: 'custom',
      icon,
      color: 'cyan',
      params: { ...params },
    };
    onCloneAsCustom(cloned);
  };

  // Draw ADSR Envelope & Pitch visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear and draw grid
    ctx.fillStyle = '#07080b'; // extremely deep black
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255,255,255,0.03)'; // subtle grid lines
    ctx.lineWidth = 1;
    // vertical grid lines
    for (let x = 30; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    // horizontal grid lines
    for (let y = 20; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Parameters to build points
    const padLeft = 25;
    const padRight = 25;
    const usableWidth = width - padLeft - padRight;
    const usableHeight = height - 40;
    const baseline = height - 20;

    // Calculate time allocations
    const aVal = params.attack; // 0 to 1
    const dVal = params.decay; // 0 to 1
    const sVal = params.sustain; // 0 to 1
    const rVal = Math.min(params.release, 1); // Clamp to 1s for visual convenience

    // Normalize visually
    const attackX = padLeft + aVal * (usableWidth * 0.25);
    const decayX = attackX + dVal * (usableWidth * 0.25);
    const sustainX = decayX + usableWidth * 0.25; // fixed sustain sustain width visually
    const releaseX = Math.min(sustainX + rVal * (usableWidth * 0.25), width - 5);

    const peakY = baseline - usableHeight * params.volume;
    const sustainY = baseline - usableHeight * params.volume * sVal;

    // Draw the Envelope line
    ctx.beginPath();
    ctx.moveTo(padLeft, baseline); // Start at baseline
    ctx.lineTo(attackX, peakY); // Attack phase
    ctx.lineTo(decayX, sustainY); // Decay phase
    ctx.lineTo(sustainX, sustainY); // Sustain hold
    ctx.lineTo(releaseX, baseline); // Release phase
    
    // Create glowing neon gradient
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#f43f5e'); // rose
    gradient.addColorStop(0.3, '#10b981'); // emerald
    gradient.addColorStop(0.7, '#06b6d4'); // cyan
    gradient.addColorStop(1, '#a855f7'); // purple

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Fill underneath envelope area
    ctx.lineTo(padLeft, baseline);
    ctx.fillStyle = 'rgba(6, 182, 212, 0.06)';
    ctx.fill();

    // Draw nodes as neat pulsing dots
    const nodes = [
      { x: attackX, y: peakY, label: 'A', color: '#10b981' },
      { x: decayX, y: sustainY, label: 'D', color: '#f59e0b' },
      { x: releaseX, y: baseline, label: 'R', color: '#a855f7' }
    ];

    nodes.forEach(node => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#94a3b8'; // slate-400
      ctx.font = '10px font-mono';
      ctx.fillText(node.label, node.x - 3, node.y - 8);
    });

    // Draw frequency sweep arrow in corner
    ctx.fillStyle = '#64748b';
    ctx.font = '9px font-mono';
    ctx.fillText(`Pitch: ${params.startFreq.toFixed(0)}Hz ➔ ${params.endFreq > 0 ? params.endFreq.toFixed(0) : params.startFreq.toFixed(0)}Hz`, 15, 15);
    ctx.fillText(`Waveform: ${params.waveform.toUpperCase()}`, width - 110, 15);

  }, [params]);

  return (
    <div
      id="synth-panel"
      className="bg-[#0F1117] border border-white/5 rounded-lg p-4 sm:p-5 shadow-lg flex flex-col lg:h-full lg:overflow-hidden"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="bg-cyan-500/10 p-2 border border-cyan-500/20 text-cyan-400 rounded">
            <Icon name="Sliders" size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wider text-white uppercase font-sans">
              ឧបករណ៍កែច្នៃសំឡេង (Synth Engine)
            </h2>
            <p className="text-[10px] text-slate-500 font-sans tracking-wide">
              កែសម្រួលប្រេកង់និងប៉ារ៉ាម៉ែត្ររលកសញ្ញា
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 lg:overflow-y-auto space-y-5 pr-1 text-slate-300">
        {/* Real-time Envelope visualizer */}
        <div className="bg-[#07080b] rounded overflow-hidden border border-white/5 p-1 relative">
          <canvas
            ref={canvasRef}
            width={450}
            height={120}
            className="w-full h-[110px] bg-[#07080b]"
          />
        </div>

        {/* Basic info: Name, Khmer Name, Icon, Category */}
        <div className="bg-black/20 rounded p-4 border border-white/5 space-y-4">
          <h3 className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-widest">
            ព័ត៌មានសំឡេង (Metadata Settings)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-slate-500 mb-1.5 uppercase font-semibold font-sans">ឈ្មោះអង់គ្លេស (Name)</label>
              <input
                id="synth-name-en"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-[#0A0B0E] border border-white/10 rounded text-white focus:outline-none focus:border-cyan-500/50 font-medium"
                placeholder="e.g. Vintage Laser"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1.5 uppercase font-semibold font-sans">ឈ្មោះខ្មែរ (Khmer Label)</label>
              <input
                id="synth-name-kh"
                type="text"
                value={khmerName}
                onChange={(e) => setKhmerName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-[#0A0B0E] border border-white/10 rounded text-white focus:outline-none focus:border-cyan-500/50"
                placeholder="ឧទាហរណ៍៖ សំឡេងឡាស៊ែរ"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 mb-2 uppercase font-semibold font-sans">ជ្រើសរើសរូបសញ្ញា (Icon Grid)</label>
            <div className="flex flex-wrap gap-1.5 max-h-[75px] overflow-y-auto p-2 bg-[#0A0B0E] rounded border border-white/5">
              {AVAILABLE_ICONS.map((icName) => (
                <button
                  id={`icon-choice-${icName}`}
                  key={icName}
                  onClick={() => setIcon(icName)}
                  className={`p-1.5 rounded transition-all ${
                    icon === icName
                      ? 'bg-cyan-600 text-black font-bold scale-105 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                  }`}
                  title={icName}
                >
                  <Icon name={icName} size={13} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Waveform Selector & Basic Oscillator pitch */}
        <div className="bg-black/20 rounded p-4 border border-white/5 space-y-4">
          <h3 className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest">
            Oscillator & Waveform Parameters
          </h3>
          
          <div>
            <label className="block text-[10px] text-slate-500 mb-2 uppercase font-semibold font-sans">រលកសញ្ញា (Oscillator Type)</label>
            <div className="grid grid-cols-5 gap-1.5">
              {(['sine', 'square', 'sawtooth', 'triangle', 'noise'] as WaveformType[]).map((wave) => (
                <button
                  id={`wave-choice-${wave}`}
                  key={wave}
                  onClick={() => updateParam('waveform', wave)}
                  className={`py-1.5 px-1 rounded border text-[10px] font-bold font-mono uppercase transition-all ${
                    params.waveform === wave
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                      : 'border-white/5 bg-[#0A0B0E] hover:border-white/15 text-slate-500'
                  }`}
                >
                  {wave}
                </button>
              ))}
            </div>
          </div>

          {params.waveform !== 'noise' && (
            <div className="space-y-4">
              {/* Start Freq */}
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-slate-400 font-sans uppercase">ប្រេកង់ចាប់ផ្តើម (Start Frequency)</span>
                  <span className="font-mono text-emerald-400 font-bold">{params.startFreq.toFixed(0)} Hz</span>
                </div>
                <input
                  id="slider-startFreq"
                  type="range"
                  min="40"
                  max="2500"
                  step="5"
                  value={params.startFreq}
                  onChange={(e) => updateParam('startFreq', parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1 bg-[#0A0B0E] rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* End Freq */}
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-slate-400 font-sans uppercase">ប្រេកង់បញ្ចប់ (End Frequency / Sweep)</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {params.endFreq > 0 ? `${params.endFreq.toFixed(0)} Hz` : 'គ្មាន (No Sweep)'}
                  </span>
                </div>
                <input
                  id="slider-endFreq"
                  type="range"
                  min="0"
                  max="2500"
                  step="5"
                  value={params.endFreq}
                  onChange={(e) => updateParam('endFreq', parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1 bg-[#0A0B0E] rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Duration */}
          <div>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-slate-400 font-sans uppercase">រយៈពេលលឺ (Total Duration)</span>
              <span className="font-mono text-emerald-400 font-bold">{params.duration.toFixed(2)}s</span>
            </div>
            <input
              id="slider-duration"
              type="range"
              min="0.05"
              max="2.5"
              step="0.01"
              value={params.duration}
              onChange={(e) => updateParam('duration', parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1 bg-[#0A0B0E] rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Volume Envelope ADSR */}
        <div className="bg-black/20 rounded p-4 border border-white/5 space-y-4">
          <h3 className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest">
            Amplitude Envelope (ADSR)
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Attack */}
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-slate-400 font-sans uppercase">ល្បឿនលឺ (Attack)</span>
                <span className="font-mono text-rose-400 font-bold">{(params.attack * 100).toFixed(0)}%</span>
              </div>
              <input
                id="slider-attack"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={params.attack}
                onChange={(e) => updateParam('attack', parseFloat(e.target.value))}
                className="w-full accent-cyan-500 h-1 bg-[#0A0B0E] rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Decay */}
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-slate-400 font-sans uppercase">ល្បឿនស្រុត (Decay)</span>
                <span className="font-mono text-rose-400 font-bold">{(params.decay * 100).toFixed(0)}%</span>
              </div>
              <input
                id="slider-decay"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={params.decay}
                onChange={(e) => updateParam('decay', parseFloat(e.target.value))}
                className="w-full accent-cyan-500 h-1 bg-[#0A0B0E] rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Sustain */}
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-slate-400 font-sans uppercase">កម្រិតរក្សា (Sustain)</span>
                <span className="font-mono text-rose-400 font-bold">{(params.sustain * 100).toFixed(0)}%</span>
              </div>
              <input
                id="slider-sustain"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={params.sustain}
                onChange={(e) => updateParam('sustain', parseFloat(e.target.value))}
                className="w-full accent-cyan-500 h-1 bg-[#0A0B0E] rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Release */}
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-slate-400 font-sans uppercase">កន្ទុយ (Release)</span>
                <span className="font-mono text-rose-400 font-bold">{params.release.toFixed(2)}s</span>
              </div>
              <input
                id="slider-release"
                type="range"
                min="0.01"
                max="1"
                step="0.01"
                value={params.release}
                onChange={(e) => updateParam('release', parseFloat(e.target.value))}
                className="w-full accent-cyan-500 h-1 bg-[#0A0B0E] rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Master Volume */}
          <div>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-slate-400 font-sans uppercase">កម្រិតមេ (Volume)</span>
              <span className="font-mono text-rose-400 font-bold">{(params.volume * 100).toFixed(0)}%</span>
            </div>
            <input
              id="slider-volume"
              type="range"
              min="0.05"
              max="1.0"
              step="0.05"
              value={params.volume}
              onChange={(e) => updateParam('volume', parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1 bg-[#0A0B0E] rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Modulations & Filters */}
        <div className="bg-black/20 rounded p-4 border border-white/5 space-y-4">
          <h3 className="text-[10px] font-extrabold text-purple-400 uppercase tracking-widest">
            Filters & LFO Modulations
          </h3>

          {/* Low-pass Filter Cut-off */}
          <div>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-slate-400 font-sans uppercase">ប្រេកង់កាត់តម្រង (Filter Frequency Limit)</span>
              <span className="font-mono text-purple-400 font-bold">{params.filterFreq.toFixed(0)} Hz</span>
            </div>
            <input
              id="slider-filterFreq"
              type="range"
              min="100"
              max="12000"
              step="50"
              value={params.filterFreq}
              onChange={(e) => updateParam('filterFreq', parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1 bg-[#0A0B0E] rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Filter sweep checkbox */}
          <div className="flex items-center space-x-3 bg-black/40 p-2.5 rounded border border-white/5">
            <input
              id="chk-filterSweep"
              type="checkbox"
              checked={params.filterSweep}
              onChange={(e) => updateParam('filterSweep', e.target.checked)}
              className="w-3.5 h-3.5 text-purple-600 bg-[#0A0B0E] border-white/10 rounded focus:ring-purple-500 accent-purple-500"
            />
            <label htmlFor="chk-filterSweep" className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-sans cursor-pointer">
              Enable Filter Frequency Sweep
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Distortion */}
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-slate-400 font-sans uppercase">បំបែកសំឡេង (Distortion)</span>
                <span className="font-mono text-purple-400 font-bold">{(params.distortion * 100).toFixed(0)}%</span>
              </div>
              <input
                id="slider-distortion"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={params.distortion}
                onChange={(e) => updateParam('distortion', parseFloat(e.target.value))}
                className="w-full accent-cyan-500 h-1 bg-[#0A0B0E] rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Vibrato parameters (only for oscillators) */}
            {params.waveform !== 'noise' && (
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-slate-400 font-sans uppercase">ញ័រ Vibrato (LFO Depth)</span>
                  <span className="font-mono text-purple-400 font-bold">{params.vibratoDepth}</span>
                </div>
                <input
                  id="slider-vibratoDepth"
                  type="range"
                  min="0"
                  max="150"
                  step="5"
                  value={params.vibratoDepth}
                  onChange={(e) => updateParam('vibratoDepth', parseInt(e.target.value))}
                  className="w-full accent-cyan-500 h-1 bg-[#0A0B0E] rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Vibrato Speed */}
          {params.waveform !== 'noise' && params.vibratoDepth > 0 && (
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-slate-400 font-sans uppercase">ល្បឿនញ័រ (Vibrato LFO Speed)</span>
                <span className="font-mono text-purple-400 font-bold">{params.vibratoFreq} Hz</span>
              </div>
              <input
                id="slider-vibratoFreq"
                type="range"
                min="1"
                max="40"
                step="0.5"
                value={params.vibratoFreq}
                onChange={(e) => updateParam('vibratoFreq', parseFloat(e.target.value))}
                className="w-full accent-cyan-500 h-1 bg-[#0A0B0E] rounded-lg appearance-none cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {/* Control Actions footer */}
      <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-4 mt-4 bg-[#0F1117] shrink-0">
        {/* Play test */}
        <button
          id="btn-play-test"
          onClick={handlePlayTest}
          disabled={isPlaying}
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-black rounded text-[10px] uppercase font-extrabold transition-all shadow-[0_0_15px_rgba(34,211,238,0.1)]"
        >
          <Icon name="Play" size={12} className="fill-current" />
          <span>ស្តាប់តេស្ត (Test)</span>
        </button>

        {/* Save to active soundpad */}
        <button
          id="btn-save-sound"
          onClick={handleSave}
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-black rounded text-[10px] uppercase font-extrabold transition-all"
        >
          <Icon name="Save" size={12} />
          <span>រក្សាទុក (Save)</span>
        </button>

        {/* Save as cloned custom sound */}
        <button
          id="btn-clone-custom"
          onClick={handleCreateNew}
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 rounded text-[10px] uppercase font-bold transition-all"
        >
          <Icon name="Plus" size={12} />
          <span>ចម្លងថ្មី (Clone)</span>
        </button>

        {/* Export to WAV */}
        <button
          id="btn-export-wav"
          onClick={handleExportWav}
          disabled={isExporting}
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 rounded text-[10px] uppercase font-bold transition-all"
        >
          {isExporting ? (
            <Icon name="RefreshCw" size={12} className="animate-spin" />
          ) : (
            <Icon name="Download" size={12} />
          )}
          <span>នាំចេញ WAV (Export)</span>
        </button>
      </div>
    </div>
  );
}
