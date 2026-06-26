import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SoundEffect, SynthParams } from './types';
import { defaultSoundEffects } from './defaultEffects';
import { SoundPad } from './components/SoundPad';
import { SynthPanel } from './components/SynthPanel';
import { SequencerPanel } from './components/SequencerPanel';
import { SettingsModal } from './components/SettingsModal';
import { Icon } from './components/Icon';
import { playSound, getAudioContext } from './audioSynth';

const LOCAL_STORAGE_KEY = 'offline_sfx_studio_sounds';

export default function App() {
  const [effects, setEffects] = useState<SoundEffect[]>([]);
  const [selectedEffect, setSelectedEffect] = useState<SoundEffect | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<'synth' | 'sequencer'>('synth');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'game' | 'ui' | 'music' | 'custom'>('all');
  const [importError, setImportError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Custom Confirmation Dialog State (for safe iframe execution)
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
  } | null>(null);

  // Helper to show a safe confirmation dialog
  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText = 'យល់ព្រម',
    cancelText = 'បោះបង់'
  ) => {
    setConfirmModal({
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(null);
      }
    });
  };

  // Load effects from LocalStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as SoundEffect[];
        setEffects(parsed);
        if (parsed.length > 0) {
          setSelectedEffect(parsed[0]);
        }
      } catch (err) {
        console.error('Failed to parse stored sound effects, loading defaults:', err);
        setEffects(defaultSoundEffects);
        setSelectedEffect(defaultSoundEffects[0]);
      }
    } else {
      setEffects(defaultSoundEffects);
      setSelectedEffect(defaultSoundEffects[0]);
    }
  }, []);

  // Persist effects to LocalStorage when changed
  const saveToStorage = (updatedEffects: SoundEffect[]) => {
    setEffects(updatedEffects);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedEffects));
  };

  // Reset to original factory defaults
  const handleResetToDefaults = () => {
    showConfirm(
      'កំណត់ឡើងវិញជាសំឡេងគំរូដើម',
      'តើអ្នកពិតជាចង់លុបបង់ការកែសម្រួលទាំងអស់ ហើយត្រឡប់ទៅការកំណត់ដើមវិញមែនទេ? (Are you sure you want to reset all sounds to factory defaults?)',
      () => {
        saveToStorage(defaultSoundEffects);
        setSelectedEffect(defaultSoundEffects[0]);
        setSearchQuery('');
        setSelectedCategory('all');
      }
    );
  };

  // Add/Clone a sound as custom
  const handleCloneAsCustom = (newEffect: SoundEffect) => {
    const updated = [...effects, newEffect];
    saveToStorage(updated);
    setSelectedEffect(newEffect);
    setSelectedCategory('custom'); // jump to custom category view
    
    // Quick success chime
    playSound({
      waveform: 'sine',
      startFreq: 520,
      endFreq: 1040,
      duration: 0.15,
      attack: 0.01,
      decay: 0.8,
      sustain: 0.1,
      release: 0.05,
      volume: 0.5,
      vibratoFreq: 0,
      vibratoDepth: 0,
      filterFreq: 4000,
      filterSweep: false,
      distortion: 0
    });
  };

  // Create a blank synthesizer sound from scratch
  const handleCreateEmptySound = () => {
    const id = `custom-${Date.now()}`;
    const newParams: SynthParams = {
      waveform: 'sine',
      startFreq: 440,
      endFreq: 440,
      duration: 0.25,
      attack: 0.1,
      decay: 0.5,
      sustain: 0.5,
      release: 0.1,
      volume: 0.6,
      vibratoFreq: 0,
      vibratoDepth: 0,
      filterFreq: 5000,
      filterSweep: false,
      distortion: 0
    };

    // Find next available keyboard hotkey among A-Z
    const busyKeys = effects.map(e => e.keyTrigger?.toUpperCase()).filter(Boolean);
    const alphabet = 'QWERTYUIOPASDFGHJKLZXCVBNM';
    const nextKey = alphabet.split('').find(k => !busyKeys.includes(k)) || undefined;

    const newEffect: SoundEffect = {
      id,
      name: `New Sound ${effects.filter(e => e.id.includes('custom')).length + 1}`,
      khmerName: `សំឡេងបង្កើតថ្មីទី ${effects.filter(e => e.id.includes('custom')).length + 1}`,
      category: 'custom',
      icon: 'Music',
      color: 'cyan',
      keyTrigger: nextKey,
      params: newParams
    };

    const updated = [...effects, newEffect];
    saveToStorage(updated);
    setSelectedEffect(newEffect);
    setSelectedCategory('custom');
    setActiveRightTab('synth');
    
    // smooth scroll to synthesizer panel on mobile
    setTimeout(() => {
      const element = document.getElementById('synth-panel');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Import an audio file (e.g. MP3, WAV) as a custom pad sound
  const handleAudioImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 2.5MB to prevent localstorage quota exceed
    if (file.size > 2.5 * 1024 * 1024) {
      alert('ឯកសារធំពេក! ដើម្បីការពារការលើសចំណុះ LocalStorage សូមជ្រើសរើសឯកសារ MP3/WAV ដែលមានទំហំតូចជាង 2.5MB។\n\n(File is too large! Please choose an audio file smaller than 2.5MB.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      if (!base64Data) return;

      try {
        // Decode audio to extract actual duration
        const ctx = getAudioContext();
        const response = await fetch(base64Data);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        const duration = audioBuffer.duration;

        const cleanName = file.name.replace(/\.[^/.]+$/, ""); // strip extension
        
        // Find next available keyboard hotkey among A-Z
        const busyKeys = effects.map(e => e.keyTrigger?.toUpperCase()).filter(Boolean);
        const alphabet = 'QWERTYUIOPASDFGHJKLZXCVBNM';
        const nextKey = alphabet.split('').find(k => !busyKeys.includes(k)) || undefined;

        const newEffect: SoundEffect = {
          id: `custom-audio-${Date.now()}`,
          name: cleanName,
          khmerName: `សំឡេង MP3: ${cleanName}`,
          category: 'custom',
          icon: 'Music',
          color: 'cyan',
          keyTrigger: nextKey,
          audioData: base64Data,
          params: {
            waveform: 'sine',
            startFreq: 440,
            endFreq: 440,
            duration: duration,
            attack: 0,
            decay: 0,
            sustain: 1,
            release: 0,
            volume: 1.0,
            vibratoFreq: 0,
            vibratoDepth: 0,
            filterFreq: 20000,
            filterSweep: false,
            distortion: 0
          }
        };

        const updated = [...effects, newEffect];
        saveToStorage(updated);
        setSelectedEffect(newEffect);
        setSelectedCategory('custom');
        
        // play once to preview
        playSound(newEffect.params, base64Data);
        
        showConfirm(
          'បញ្ចូលជោគជ័យ (Import Success)',
          `បានបញ្ចូលសំឡេង "${cleanName}" ប្រវែង ${duration.toFixed(2)}វិនាទី ជាជោគជ័យ!`,
          () => {}
        );
      } catch (err) {
        console.error('Error decoding audio file:', err);
        alert('មិនអាចបញ្ចូលសំឡេងនេះបានទេ! សូមប្រាកដថាវាជាឯកសារ MP3/WAV ត្រឹមត្រូវ។\n\n(Failed to import! Please make sure it is a valid MP3/WAV file.)');
      }
    };
    reader.readAsDataURL(file);
    
    // reset input
    e.target.value = '';
  };

  // Update sound parameters from the synthesizer panel
  const handleUpdateSound = (updatedEffect: SoundEffect) => {
    const updated = effects.map((fx) => (fx.id === updatedEffect.id ? updatedEffect : fx));
    saveToStorage(updated);
    setSelectedEffect(updatedEffect);
  };

  // Update keyboard hotkey trigger for a sound
  const handleUpdateKeyTrigger = (id: string, key: string) => {
    const updated = effects.map((fx) => {
      if (fx.id === id) {
        return {
          ...fx,
          keyTrigger: key || undefined
        };
      }
      return fx;
    });
    saveToStorage(updated);
    if (selectedEffect?.id === id) {
      setSelectedEffect({
        ...selectedEffect,
        keyTrigger: key || undefined
      });
    }
  };

  // Delete custom or default sound
  const handleDeleteSound = (id: string) => {
    showConfirm(
      'លុបសំឡេង Effect',
      'តើអ្នកពិតជាចង់លុបសំឡេងនេះចេញពីបញ្ជីមែនទេ? (Are you sure you want to delete this sound?)',
      () => {
        const updated = effects.filter((fx) => fx.id !== id);
        saveToStorage(updated);
        if (selectedEffect?.id === id) {
          setSelectedEffect(updated.length > 0 ? updated[0] : null);
        }
      }
    );
  };

  // Local JSON Backup Export
  const handleBackupExport = () => {
    try {
      const dataStr = JSON.stringify(effects, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `sound_effects_backup_${new Date().toISOString().slice(0,10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (err) {
      console.error('Backup export failed:', err);
    }
  };

  // Local JSON Backup Import
  const handleBackupImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        const parsed = JSON.parse(result) as SoundEffect[];
        
        // Basic schema verification
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].params && parsed[0].id) {
          saveToStorage(parsed);
          setSelectedEffect(parsed[0]);
          alert('បានបញ្ចូលបញ្ជីសំឡេងឡើងវិញដោយជោគជ័យ! (Soundboard imported successfully!)');
        } else {
          setImportError('ឯកសារពុំត្រឹមត្រូវតាមទម្រង់កំណត់ទេ (Invalid backup file structure)');
        }
      } catch (err) {
        setImportError('មិនអាចអានឯកសារ JSON បានទេ (Failed to parse JSON file)');
      }
    };
    reader.readAsText(file);
    // reset input
    e.target.value = '';
  };

  // Filter sound board effects
  const filteredEffects = effects.filter((fx) => {
    const matchesSearch =
      fx.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fx.khmerName.includes(searchQuery);
    const matchesCategory = selectedCategory === 'all' || fx.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#0A0B0E] text-slate-300 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Immersive Top Navigation Bar */}
      <header className="border-b border-white/5 bg-[#0F1117] sticky top-0 z-40 px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0 shadow-lg shadow-black/20">
        <div className="flex items-center gap-4 shrink-0">
          <div className="w-9 h-9 bg-cyan-500/10 border border-cyan-500/30 rounded flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.1)]">
            <Icon name="Waves" className="text-cyan-400 animate-pulse" size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-[0.2em] uppercase text-white flex items-center gap-2">
              <span>SoundStation</span>
              <span className="text-cyan-500 font-extrabold text-[11px] bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 tracking-normal">Offline</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-sans tracking-wide">
              ស្ទូឌីយ៉ូបង្កើតសំឡេង Effect • No internet connection required
            </p>
          </div>
        </div>

        {/* Global actions and metrics */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
          {/* Quick Stats Indicator */}
          <div className="hidden lg:flex items-center gap-2 text-[10px] tracking-wider text-slate-500 mr-2">
            <span className="uppercase font-mono">ចំណុះផ្ទុក (Storage):</span>
            <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="w-3/4 h-full bg-cyan-500/50 rounded-full"></div>
            </div>
            <span className="text-cyan-500 font-mono font-bold">74%</span>
          </div>

          <div className="hidden lg:block h-6 w-[1px] bg-white/10 mr-2"></div>

          {/* Create custom empty */}
          <button
            id="btn-create-empty"
            onClick={handleCreateEmptySound}
            className="flex-1 sm:flex-initial px-3 py-1.5 sm:px-3.5 sm:py-1.5 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-black text-[10px] uppercase font-bold tracking-wider rounded transition-all shadow-[0_0_15px_rgba(8,145,178,0.2)] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Icon name="PlusCircle" size={12} />
            <span>បង្កើតថ្មី (New Synth)</span>
          </button>

          {/* Centralized Settings Button */}
          <button
            id="btn-header-settings"
            onClick={() => setIsSettingsOpen(true)}
            className="px-3 py-1.5 sm:px-3.5 sm:py-1.5 bg-[#141720] hover:bg-[#1a1e2a] border border-white/10 text-slate-300 hover:text-white text-[10px] uppercase font-bold tracking-wider rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            title="ការកំណត់ និងគ្រប់គ្រង / Settings & Tools"
          >
            <Icon name="Settings" size={12} className="animate-spin-slow" />
            <span>ការកំណត់ (Settings)</span>
          </button>
        </div>
      </header>

      {/* Main Workspace layout */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl mx-auto w-full flex flex-col space-y-6 overflow-y-auto bg-[#08090C] pb-24">
        {/* Search and Categories row */}
        <div className="bg-[#0F1117] p-4 sm:p-5 rounded-lg border border-white/5 space-y-4 shrink-0 shadow-md">
          {/* Search Input */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                id="soundboard-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ស្វែងរកសំឡេង Effect (ឧ. Laser, កាក់, លោត, Explosion)..."
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-[#0A0B0E] border border-white/10 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
              <div className="absolute left-3.5 top-3 sm:top-3.5 text-slate-600">
                <Icon name="Search" size={14} />
              </div>
              {searchQuery && (
                <button
                  id="btn-clear-search"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-2.5 sm:top-3 p-0.5 text-slate-500 hover:text-white bg-white/5 rounded"
                >
                  <Icon name="XCircle" size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Category selection filters with Immersive design styling */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', khmer: 'ទាំងអស់', english: 'All' },
              { id: 'game', khmer: 'Retro ហ្គេម', english: 'Game' },
              { id: 'ui', khmer: 'UI កម្មវិធី', english: 'UI' },
              { id: 'music', khmer: 'តន្ត្រី Beats', english: 'Beats' },
              { id: 'custom', khmer: 'ច្នៃឯកជន', english: 'Custom' },
            ].map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  id={`filter-cat-${cat.id}`}
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`px-3 py-1.5 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider rounded-lg border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                      : 'border-white/5 bg-[#0A0B0E] hover:border-white/15 text-slate-400'
                  }`}
                >
                  {cat.khmer} <span className="opacity-50 text-[8px] lowercase">({cat.english})</span>
                </button>
              );
            })}
          </div>
          
          {importError && (
            <p className="text-[11px] text-red-400 font-medium bg-red-950/20 border border-red-500/20 p-2.5 rounded font-sans">
              ⚠️ {importError}
            </p>
          )}
        </div>

        {/* Pads list container */}
        <div className="bg-[#0A0B0E]/60 border border-white/5 rounded-lg p-4 sm:p-6 min-h-[350px]">
          {filteredEffects.length === 0 ? (
            <div className="h-full min-h-[250px] flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="bg-white/5 p-4 rounded-full border border-white/10 text-slate-600">
                <Icon name="Music" size={32} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-300">រកមិនឃើញសំឡេងឡើយ!</h3>
                <p className="text-[11px] text-slate-500 max-w-sm mt-1 leading-relaxed">
                  គ្មានសំឡេងណាត្រូវនឹងការស្វែងរក ឬប្រភេទដែលអ្នកបានជ្រើសរើសឡើយ។ សូមសាកល្បងវាយឈ្មោះផ្សេង ឬចុចកំណត់ឡើងវិញ!
                </p>
              </div>
              <button
                id="btn-no-results-reset"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-3.5 py-1.5 bg-white/5 border border-white/10 text-[10px] uppercase font-bold rounded text-slate-300 hover:text-white"
              >
                មើលទាំងអស់ឡើងវិញ
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredEffects.map((fx) => (
                <SoundPad
                  key={fx.id}
                  effect={fx}
                  isSelected={selectedEffect?.id === fx.id}
                  onSelect={() => {
                    setSelectedEffect(fx);
                    playSound(fx.params, fx.audioData);
                  }}
                  onDelete={handleDeleteSound}
                />
              ))}
            </div>
          )}
        </div>

        {/* Static Immersive Offline Guide Footer */}
        <div className="bg-[#0F1117] p-4 rounded-lg border border-white/5 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500 shadow-md">
          <span className="font-sans flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-ping"></span>
            <span>💡 <strong>គន្លឹះ៖</strong> ប្រើក្តារចុច (Keyboard Keys) ខាងលើ ដើម្បីចាក់សំឡេងភ្លាមៗ!</span>
          </span>
          <span className="font-mono text-[9px] text-cyan-500/60 uppercase tracking-widest">100% Native DSP Engine</span>
        </div>
      </main>

      {/* Settings & Tools Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        effects={effects}
        onDeleteSound={handleDeleteSound}
        onUpdateKeyTrigger={handleUpdateKeyTrigger}
        onBackupExport={handleBackupExport}
        onBackupImport={handleBackupImport}
        onResetToDefaults={handleResetToDefaults}
        onAudioImport={handleAudioImport}
        importError={importError}
      />

      {/* Custom Confirmation Modal (Safe for cross-origin iframes) */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-[#12141C] border border-white/10 rounded-lg shadow-2xl p-5 text-slate-200"
            >
              <div className="flex items-center space-x-3 text-amber-500 mb-3">
                <Icon name="AlertTriangle" size={20} />
                <h3 className="text-sm font-bold uppercase tracking-wider font-sans text-white">
                  {confirmModal.title}
                </h3>
              </div>
              
              <p className="text-xs text-slate-400 mb-5 leading-relaxed font-sans">
                {confirmModal.message}
              </p>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] uppercase font-bold tracking-wider rounded text-slate-300 transition-all cursor-pointer"
                >
                  {confirmModal.cancelText}
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-[11px] uppercase font-bold tracking-wider rounded transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] cursor-pointer"
                >
                  {confirmModal.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
