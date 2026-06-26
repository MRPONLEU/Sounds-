import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SoundEffect } from '../types';
import { Icon } from './Icon';
import { playSound } from '../audioSynth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  effects: SoundEffect[];
  onDeleteSound: (id: string) => void;
  onUpdateKeyTrigger: (id: string, key: string) => void;
  onBackupExport: () => void;
  onBackupImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetToDefaults: () => void;
  onAudioImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  importError: string | null;
}

export function SettingsModal({
  isOpen,
  onClose,
  effects,
  onDeleteSound,
  onUpdateKeyTrigger,
  onBackupExport,
  onBackupImport,
  onResetToDefaults,
  onAudioImport,
  importError
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'sounds' | 'data'>('sounds');
  
  // Sounds tab states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState<'all' | 'game' | 'ui' | 'music' | 'custom'>('all');
  const [listeningKeyId, setListeningKeyId] = useState<string | null>(null);

  // Filter list
  const filtered = effects.filter((fx) => {
    const matchesSearch =
      fx.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fx.khmerName.includes(searchQuery);
    
    const matchesCat =
      selectedCat === 'all' || fx.category === selectedCat;

    return matchesSearch && matchesCat;
  });

  // Handle hotkey mapping capture
  const handleStartListening = (id: string) => {
    setListeningKeyId(id);
  };

  const handleKeyDown = (id: string, e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Ignore modifier keys alone
    if (['Control', 'Shift', 'Alt', 'Meta', 'Escape'].includes(e.key)) {
      if (e.key === 'Escape') {
        setListeningKeyId(null);
      }
      return;
    }

    const key = e.key.toUpperCase();
    if (key.length === 1 && key >= 'A' && key <= 'Z') {
      onUpdateKeyTrigger(id, key);
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      onUpdateKeyTrigger(id, ''); // clear key
    }
    setListeningKeyId(null);
  };

  const handlePlaySound = (fx: SoundEffect, e: React.MouseEvent) => {
    e.stopPropagation();
    playSound(fx.params, fx.audioData);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with elegant blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-3xl h-[85vh] max-h-[700px] bg-[#0F1117] border border-white/10 rounded-lg shadow-2xl flex flex-col overflow-hidden text-slate-200"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#0C0D12]">
              <div className="flex items-center space-x-3">
                <div className="bg-cyan-500/10 p-2.5 border border-cyan-500/20 text-cyan-400 rounded-lg">
                  <Icon name="Settings" size={20} className="animate-spin-slow" />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-wider uppercase font-sans text-white">
                    ការកំណត់ & គ្រប់គ្រងប្រព័ន្ធ (Settings & Tools)
                  </h2>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                    គ្រប់គ្រងបញ្ជីសំឡេង កំណត់គ្រាប់ចុចកាត់ ចម្លងទុក និងកំណត់ឡើងវិញ
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-all cursor-pointer"
                title="បិទ / Close"
              >
                <Icon name="X" size={18} />
              </button>
            </div>

            {/* Modal Tabs Row */}
            <div className="flex border-b border-white/5 bg-[#0C0D12] px-4 shrink-0">
              <button
                onClick={() => setActiveTab('sounds')}
                className={`px-4 py-3 text-xs uppercase font-extrabold tracking-wider transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                  activeTab === 'sounds'
                    ? 'border-cyan-500 text-cyan-400 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon name="Sliders" size={13} />
                <span>គ្រប់គ្រងសំឡេង ({effects.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('data')}
                className={`px-4 py-3 text-xs uppercase font-extrabold tracking-wider transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                  activeTab === 'data'
                    ? 'border-cyan-500 text-cyan-400 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon name="Database" size={13} />
                <span>ទិន្នន័យ & BACKUP</span>
              </button>
            </div>

            {/* Tab Body: Sounds Management */}
            {activeTab === 'sounds' && (
              <>
                {/* Search & Category Filter bar */}
                <div className="p-4 bg-[#0A0B0E] border-b border-white/5 flex flex-col md:flex-row gap-3 items-center justify-between shrink-0">
                  {/* Search input inside modal */}
                  <div className="relative w-full md:w-64">
                    <input
                      type="text"
                      placeholder="ស្វែងរកសំឡេង..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-[#0F1117] border border-white/10 rounded text-xs text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600"
                    />
                    <Icon
                      name="Search"
                      size={12}
                      className="absolute left-3 top-2.5 text-slate-500"
                    />
                  </div>

                  {/* Categories Tabs & Import Action inside modal */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="flex flex-wrap items-center gap-1 w-full sm:w-auto justify-center sm:justify-start">
                      {[
                        { id: 'all', label: 'ទាំងអស់' },
                        { id: 'game', label: 'Retro ហ្គេម' },
                        { id: 'ui', label: 'UI' },
                        { id: 'music', label: ' Beats' },
                        { id: 'custom', label: 'ច្នៃឯកជន' }
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCat(cat.id as any)}
                          className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded transition-all cursor-pointer ${
                            selectedCat === cat.id
                              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                              : 'bg-transparent border border-transparent text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    <div className="h-4 w-px bg-white/10 hidden sm:block" />

                    {/* Import MP3 File */}
                    <label
                      htmlFor="settings-audio-import"
                      className="px-3 py-1.5 bg-[#141720] hover:bg-cyan-500 hover:text-black border border-cyan-500/25 hover:border-cyan-500/50 text-cyan-400 text-[10px] uppercase font-bold tracking-wider rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md select-none shrink-0 w-full sm:w-auto"
                      title="បញ្ចូលសំឡេងជា MP3/WAV / Import MP3 Audio File"
                    >
                      <Icon name="Music" size={11} />
                      <span>បញ្ចូល MP3</span>
                      <input
                        id="settings-audio-import"
                        type="file"
                        accept=".mp3,.wav,.ogg,.m4a"
                        onChange={onAudioImport}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Sounds List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#08090C]">
                  {filtered.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-16 text-center">
                      <Icon name="VolumeX" size={32} className="text-slate-600 mb-2" />
                      <p className="text-xs text-slate-500 font-sans">រកមិនឃើញសំឡេងតាមតម្រូវការស្វែងរកទេ</p>
                    </div>
                  ) : (
                    filtered.map((fx) => (
                      <div
                        key={fx.id}
                        className="flex items-center justify-between p-3 bg-[#0F1117] hover:bg-[#141720] border border-white/5 rounded transition-all duration-150 group"
                      >
                        {/* Left: Sound details & Preview button */}
                        <div className="flex items-center space-x-3 overflow-hidden mr-4">
                          {/* Play Preview button */}
                          <button
                            onClick={(e) => handlePlaySound(fx, e)}
                            className="w-8 h-8 rounded bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-black border border-cyan-500/20 flex items-center justify-center shrink-0 transition-all cursor-pointer"
                            title="ស្ដាប់សាកល្បង / Play Preview"
                          >
                            <Icon name="Play" size={12} className="fill-current" />
                          </button>

                          {/* Info */}
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-white text-xs truncate font-sans">
                                {fx.name}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate hidden sm:inline font-sans">
                                ({fx.khmerName})
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] uppercase px-1.5 py-0.2 bg-white/5 text-slate-400 border border-white/5 rounded font-mono">
                                {fx.category.toUpperCase()}
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono">
                                {fx.params.waveform} • {fx.params.duration.toFixed(2)}s
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Key Mapping controls & Edit/Delete triggers */}
                        <div className="flex items-center space-x-3 shrink-0">
                          {/* Key Map trigger */}
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[9px] text-slate-500 uppercase font-mono hidden md:inline">គ្រាប់ចុចកាត់ (Key):</span>
                            {listeningKeyId === fx.id ? (
                              <div
                                onKeyDown={(e) => handleKeyDown(fx.id, e)}
                                tabIndex={0}
                                autoFocus
                                className="px-2 py-1 bg-cyan-500/25 border border-cyan-400 text-cyan-400 rounded text-[10px] font-bold font-mono text-center min-w-[50px] cursor-pointer outline-none animate-pulse"
                              >
                                ចុច...
                              </div>
                            ) : (
                              <button
                                onClick={() => handleStartListening(fx.id)}
                                className="px-2 py-1 bg-black/40 hover:bg-black/60 border border-white/10 hover:border-white/25 rounded text-[10px] text-slate-300 font-bold font-mono min-w-[50px] text-center transition-all cursor-pointer"
                                title="កំណត់គ្រាប់ចុចកាត់ / Assign Hotkey"
                              >
                                {fx.keyTrigger || '—'}
                              </button>
                            )}
                          </div>

                          <div className="h-4 w-px bg-white/5" />

                          {/* Delete sound (prompt custom modal) */}
                          <button
                            onClick={() => onDeleteSound(fx.id)}
                            className="p-1.5 text-red-500/60 hover:text-red-400 hover:bg-red-950/20 rounded transition-all cursor-pointer"
                            title="លុបសំឡេងនេះចោល / Delete Sound"
                          >
                            <Icon name="Trash2" size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Tab Body: Data, Backup & Reset */}
            {activeTab === 'data' && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#08090C]">
                {/* Backup & Import section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Export Box */}
                  <div className="bg-[#0F1117] border border-white/5 rounded-lg p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <div className="text-cyan-400 flex items-center gap-2">
                        <Icon name="Upload" size={18} />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-white">នាំចេញទិន្នន័យ (Backup Export)</h3>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                        ទាញយកឯកសារសំឡេងទាំងអស់ដែលអ្នកបានបង្កើត និងកែសម្រួលរក្សាទុកជាឯកសារ JSON សម្រាប់ចម្លងទុក ឬចែករំលែកទៅឧបករណ៍ផ្សេងទៀត។
                      </p>
                    </div>
                    <button
                      onClick={onBackupExport}
                      className="w-full py-2 bg-cyan-500/10 hover:bg-cyan-500 hover:text-black border border-cyan-500/20 text-cyan-400 text-xs uppercase font-extrabold tracking-wider rounded transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.02)]"
                    >
                      <Icon name="Upload" size={13} />
                      <span>នាំចេញ Backup JSON</span>
                    </button>
                  </div>

                  {/* Import Box */}
                  <div className="bg-[#0F1117] border border-white/5 rounded-lg p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <div className="text-cyan-400 flex items-center gap-2">
                        <Icon name="Download" size={18} />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-white">នាំចូលទិន្នន័យ (Backup Import)</h3>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                        បញ្ចូលបញ្ជីសំឡេងរបស់អ្នកមកវិញពីឯកសារចម្លងទុក (JSON) ពីមុន។ វានឹងជំនួសបញ្ជីសំឡេងបច្ចុប្បន្នទាំងអស់។
                      </p>
                    </div>
                    
                    <label
                      htmlFor="settings-backup-upload"
                      className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs uppercase font-extrabold tracking-wider rounded transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
                    >
                      <Icon name="Download" size={13} />
                      <span>នាំចូល Backup JSON</span>
                      <input
                        id="settings-backup-upload"
                        type="file"
                        accept=".json"
                        onChange={onBackupImport}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {importError && (
                  <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 rounded text-xs flex items-center gap-2 font-sans animate-shake">
                    <Icon name="AlertCircle" size={14} className="shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}

                {/* Reset Section */}
                <div className="bg-[#120F12] border border-red-500/10 rounded-lg p-5 space-y-4">
                  <div className="space-y-1.5">
                    <div className="text-red-400 flex items-center gap-2">
                      <Icon name="RotateCcw" size={18} />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white">កំណត់ឡើងវិញទាំងស្រុង (Factory Reset)</h3>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      ការធ្វើបែបនេះនឹងលុបរាល់ការកែសម្រួលទាំងអស់ លុបសំឡេងច្នៃបង្កើតថ្មី និងកំណត់ឡើងវិញនូវគ្រាប់ចុចកាត់ទាំងអស់ ត្រឡប់ទៅជាសំឡេងគំរូដើមរបស់រោងចក្រវិញ។ <span className="text-red-400/90 font-semibold">ទិន្នន័យរបស់អ្នកនឹងត្រូវបាត់បង់ទាំងស្រុង!</span>
                    </p>
                  </div>
                  
                  <button
                    onClick={onResetToDefaults}
                    className="py-2 px-5 bg-red-950/30 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white text-xs uppercase font-extrabold tracking-wider rounded transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.02)]"
                  >
                    <Icon name="RotateCcw" size={13} />
                    <span>កំណត់ឡើងវិញជាសំឡេងដើម (Reset to Defaults)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Help bar */}
            <div className="p-3.5 bg-[#0C0D12] border-t border-white/5 text-[11px] text-slate-500 flex items-center justify-between shrink-0 font-sans">
              <span>សរុប៖ {effects.length} សំឡេង</span>
              <span className="text-[10px] text-slate-600 hidden sm:inline">SoundStation Studio v1.1.0 • Offline Ready</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
