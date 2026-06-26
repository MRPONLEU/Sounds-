import { useState, useEffect, useRef } from 'react';
import { SoundEffect } from '../types';
import { playSound } from '../audioSynth';
import { Icon } from './Icon';

interface SequencerPanelProps {
  effects: SoundEffect[];
}

interface Step {
  active: boolean;
  soundId: string; // empty string or valid sound id
}

export function SequencerPanel({ effects }: SequencerPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(130);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [steps, setSteps] = useState<Step[]>(
    Array.from({ length: 8 }, (_, i) => ({
      active: i % 2 === 0, // default rhythm
      soundId: i === 0 ? effects[14]?.id || '' : i === 4 ? effects[15]?.id || '' : '', // snare/kick placeholder
    }))
  );

  const intervalRef = useRef<any>(null);
  const stepRef = useRef<number>(-1);

  // Synchronize playbacks with BPM changes
  useEffect(() => {
    if (isPlaying) {
      pause();
      play();
    }
    return () => pause();
  }, [bpm]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => pause();
  }, []);

  const play = () => {
    const stepDurationMs = (60 / bpm) * 1000 * 0.5; // Eighth notes
    setIsPlaying(true);

    intervalRef.current = setInterval(() => {
      // Advance step
      stepRef.current = (stepRef.current + 1) % 8;
      const activeIdx = stepRef.current;
      setCurrentStep(activeIdx);

      // Trigger assigned sound if active
      const step = steps[activeIdx];
      if (step && step.active && step.soundId) {
        const foundSound = effects.find((fx) => fx.id === step.soundId);
        if (foundSound) {
          playSound(foundSound.params);
        }
      }
    }, stepDurationMs);
  };

  const pause = () => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      pause();
      setCurrentStep(-1);
      stepRef.current = -1;
    } else {
      play();
    }
  };

  const toggleStepActive = (index: number) => {
    setSteps((prev) =>
      prev.map((step, idx) => (idx === index ? { ...step, active: !step.active } : step))
    );
  };

  const updateStepSound = (index: number, soundId: string) => {
    setSteps((prev) =>
      prev.map((step, idx) => (idx === index ? { ...step, soundId } : step))
    );
  };

  const clearAllSteps = () => {
    pause();
    setCurrentStep(-1);
    stepRef.current = -1;
    setSteps(
      Array.from({ length: 8 }, () => ({
        active: false,
        soundId: '',
      }))
    );
  };

  // Pre-populate some cool templates
  const applyTemplate = (type: 'beat' | 'game' | 'alarm') => {
    pause();
    setCurrentStep(-1);
    stepRef.current = -1;

    let newSteps: Step[] = [];
    if (type === 'beat') {
      // Kick snare hihat beat
      const kick = effects.find((e) => e.id.includes('kick'))?.id || '';
      const snare = effects.find((e) => e.id.includes('snare'))?.id || '';
      const hat = effects.find((e) => e.id.includes('hihat'))?.id || '';

      newSteps = [
        { active: true, soundId: kick },
        { active: true, soundId: hat },
        { active: true, soundId: snare },
        { active: true, soundId: hat },
        { active: true, soundId: kick },
        { active: true, soundId: hat },
        { active: true, soundId: snare },
        { active: true, soundId: hat },
      ];
      setBpm(125);
    } else if (type === 'game') {
      // Retro laser / jump coin melody
      const coin = effects.find((e) => e.id.includes('coin'))?.id || '';
      const jump = effects.find((e) => e.id.includes('jump'))?.id || '';
      const laser = effects.find((e) => e.id.includes('laser'))?.id || '';

      newSteps = [
        { active: true, soundId: coin },
        { active: false, soundId: '' },
        { active: true, soundId: jump },
        { active: false, soundId: '' },
        { active: true, soundId: coin },
        { active: true, soundId: laser },
        { active: false, soundId: '' },
        { active: true, soundId: coin },
      ];
      setBpm(150);
    } else {
      // Alarm alerts UI
      const success = effects.find((e) => e.id.includes('success'))?.id || '';
      const pop = effects.find((e) => e.id.includes('pop'))?.id || '';
      const warn = effects.find((e) => e.id.includes('warning'))?.id || '';

      newSteps = [
        { active: true, soundId: warn },
        { active: true, soundId: pop },
        { active: false, soundId: '' },
        { active: true, soundId: pop },
        { active: true, soundId: success },
        { active: true, soundId: pop },
        { active: false, soundId: '' },
        { active: true, soundId: warn },
      ];
      setBpm(140);
    }
    setSteps(newSteps);
  };

  return (
    <div
      id="sequencer-panel"
      className="bg-[#0F1117] border border-white/5 rounded-lg p-4 sm:p-5 shadow-lg flex flex-col lg:h-full lg:overflow-hidden"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="bg-fuchsia-500/10 p-2 border border-fuchsia-500/20 text-fuchsia-400 rounded">
            <Icon name="Drum" size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wider text-white uppercase font-sans">
              កម្មវិធីផ្សំសំឡេងបង្វិល (Step Sequencer)
            </h2>
            <p className="text-[10px] text-slate-500 font-sans tracking-wide">
              បញ្ចូលនិងចាក់តម្រៀបសំឡេង Effect បន្តបន្ទាប់គ្នាជាចង្វាក់ស្វ័យប្រវត្ត
            </p>
          </div>
        </div>
      </div>

      {/* Main Control Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/20 p-4 rounded border border-white/5 mb-5 shrink-0">
        <div className="flex items-center space-x-3">
          {/* Play / Stop Trigger */}
          <button
            id="btn-toggle-sequencer"
            onClick={togglePlay}
            className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded text-[10px] font-extrabold uppercase tracking-wider transition-all ${
              isPlaying
                ? 'bg-rose-600 text-black shadow-[0_0_15px_rgba(244,63,94,0.15)] hover:bg-rose-500'
                : 'bg-fuchsia-600 text-black shadow-[0_0_15px_rgba(217,70,239,0.15)] hover:bg-fuchsia-500'
            }`}
          >
            <Icon name={isPlaying ? 'Square' : 'Play'} size={12} className="fill-current" />
            <span>{isPlaying ? 'ផ្អាក (Pause)' : 'លេងចង្វាក់ (Play)'}</span>
          </button>

          {/* Clear button */}
          <button
            id="btn-clear-sequencer"
            onClick={clearAllSteps}
            className="flex items-center gap-1 py-1.5 px-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded text-[10px] uppercase font-bold text-slate-300 transition-all"
          >
            <Icon name="Trash2" size={11} />
            <span>សម្អាត (Clear)</span>
          </button>
        </div>

        {/* BPM Selector */}
        <div className="flex items-center space-x-3 min-w-[180px]">
          <span className="text-[10px] text-slate-400 font-mono font-bold shrink-0">BPM: {bpm}</span>
          <input
            id="slider-bpm"
            type="range"
            min="60"
            max="260"
            step="5"
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value))}
            className="w-full accent-fuchsia-500 h-1 bg-[#0A0B0E] rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Dynamic templates */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-extrabold">Presets:</span>
          <button
            id="btn-tpl-beat"
            onClick={() => applyTemplate('beat')}
            className="text-[10px] uppercase font-bold px-2 py-1 bg-[#0A0B0E] hover:bg-white/5 text-slate-400 hover:text-white rounded border border-white/5"
          >
            Beats
          </button>
          <button
            id="btn-tpl-game"
            onClick={() => applyTemplate('game')}
            className="text-[10px] uppercase font-bold px-2 py-1 bg-[#0A0B0E] hover:bg-white/5 text-slate-400 hover:text-white rounded border border-white/5"
          >
            Game
          </button>
          <button
            id="btn-tpl-alarm"
            onClick={() => applyTemplate('alarm')}
            className="text-[10px] uppercase font-bold px-2 py-1 bg-[#0A0B0E] hover:bg-white/5 text-slate-400 hover:text-white rounded border border-white/5"
          >
            Alarm
          </button>
        </div>
      </div>

      {/* Grid of Steps */}
      <div className="flex-1 lg:overflow-y-auto space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
          {steps.map((step, index) => {
            const isCurrent = currentStep === index;
            const assignedSound = effects.find((e) => e.id === step.soundId);

            return (
              <div
                key={index}
                className={`relative flex flex-col justify-between p-3 rounded border transition-all duration-200 ${
                  isCurrent
                    ? 'border-white bg-[#1A1D26] shadow-[0_0_15px_rgba(255,255,255,0.15)] scale-[1.02]'
                    : step.active
                    ? 'border-fuchsia-500/30 bg-fuchsia-950/10 shadow-sm hover:border-fuchsia-500/50'
                    : 'border-white/5 bg-[#0A0B0E] hover:border-white/10'
                }`}
              >
                {/* Step number & Mute/Active Trigger */}
                <div className="flex justify-between items-center mb-2.5">
                  <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${
                    isCurrent ? 'bg-white text-black' : 'bg-black/40 text-slate-500'
                  }`}>
                    #{index + 1}
                  </span>

                  <button
                    id={`btn-toggle-step-${index}`}
                    onClick={() => toggleStepActive(index)}
                    className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                      step.active
                        ? 'bg-fuchsia-600 text-black font-bold hover:bg-fuchsia-500'
                        : 'bg-[#0A0B0E] text-slate-600 hover:text-slate-400 border border-white/10'
                    }`}
                  >
                    <Icon name={step.active ? 'CheckCircle2' : 'XCircle'} size={11} />
                  </button>
                </div>

                {/* Sound Select Dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-[8px] text-slate-500 uppercase tracking-widest font-mono font-bold">Sound</label>
                  <select
                    id={`select-sound-step-${index}`}
                    value={step.soundId}
                    onChange={(e) => updateStepSound(index, e.target.value)}
                    className="w-full text-[10px] bg-[#0A0B0E] border border-white/10 text-slate-300 rounded px-1.5 py-1 cursor-pointer focus:outline-none focus:border-fuchsia-500/50 font-sans"
                  >
                    <option value="">-- Mute --</option>
                    {effects.map((fx) => (
                      <option key={fx.id} value={fx.id}>
                        {fx.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Active Icon Indicator */}
                {assignedSound && step.active && (
                  <div className="flex items-center space-x-1 mt-3 text-fuchsia-400">
                    <Icon name={assignedSound.icon} size={10} />
                    <span className="text-[9px] truncate font-sans font-semibold text-fuchsia-400/90">{assignedSound.name}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Usage notes */}
        <div className="p-3 rounded border border-white/5 bg-black/20 text-[11px] text-slate-400 leading-relaxed font-sans flex items-start space-x-2">
          <Icon name="AlertTriangle" size={13} className="text-fuchsia-400 shrink-0 mt-0.5" />
          <p>
            <strong>របៀបប្រើ៖</strong> បើកដំណើរការប្រអប់ជំហាននីមួយៗ (Step #1-#8) រួចជ្រើសរើសសំឡេងលឺសម្រាប់ជំហាននោះ។ រួចចុចប៊ូតុង <strong>លេងចង្វាក់ (Play)</strong> ដើម្បីស្ដាប់លទ្ធផលផ្សំចង្វាក់បង្វិល។ អ្នកអាចប្ដូរកម្រិត BPM ឱ្យលឿន ឬយឺតតាមតម្រូវការបានភ្លាមៗ!
          </p>
        </div>
      </div>
    </div>
  );
}
