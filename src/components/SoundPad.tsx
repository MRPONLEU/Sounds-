import React, { useState, useEffect, useRef } from 'react';
import { SoundEffect } from '../types';
import { Icon } from './Icon';
import { playSound, renderToWav } from '../audioSynth';

interface SoundPadProps {
  key?: string;
  effect: SoundEffect;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: (id: string) => void;
  customKeyMap?: string;
  onUpdateKeyTrigger?: (id: string, key: string) => void;
}

export function SoundPad({
  effect,
  isSelected,
  onSelect,
  onDelete,
  customKeyMap,
  onUpdateKeyTrigger
}: SoundPadProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const timeoutRef = useRef<any>(null);

  // Trigger sound playback
  const handlePlay = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setIsPlaying(true);
    playSound(effect.params, effect.audioData);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    const durationMs = (effect.params.duration || 1.0) * 1000;
    timeoutRef.current = setTimeout(() => {
      setIsPlaying(false);
    }, durationMs);
  };


  // Trigger WAV export and browser download
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return;
    try {
      setIsDownloading(true);
      const blob = await renderToWav(effect.params, effect.audioData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extension = effect.audioData ? (effect.audioData.includes('audio/wav') ? 'wav' : 'mp3') : 'wav';
      a.download = `${effect.name.toLowerCase().replace(/\s+/g, '_')}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export sound:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Map Category Colors
  const getCategoryStyles = (cat: string) => {
    switch (cat) {
      case 'game':
        return {
          border: 'border-white/5 hover:border-emerald-500/40',
          bg: 'bg-[#14171D]',
          glow: 'hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]',
          text: 'text-emerald-400',
          badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
          activeBg: 'bg-emerald-500 text-black',
        };
      case 'ui':
        return {
          border: 'border-white/5 hover:border-amber-500/40',
          bg: 'bg-[#14171D]',
          glow: 'hover:shadow-[0_0_15px_rgba(245,158,11,0.1)]',
          text: 'text-amber-400',
          badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
          activeBg: 'bg-amber-500 text-black',
        };
      case 'music':
        return {
          border: 'border-white/5 hover:border-fuchsia-500/40',
          bg: 'bg-[#14171D]',
          glow: 'hover:shadow-[0_0_15px_rgba(217,70,239,0.1)]',
          text: 'text-fuchsia-400',
          badge: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20',
          activeBg: 'bg-fuchsia-500 text-white',
        };
      default:
        return {
          border: 'border-white/5 hover:border-cyan-500/40',
          bg: 'bg-[#14171D]',
          glow: 'hover:shadow-[0_0_15px_rgba(6,182,212,0.1)]',
          text: 'text-cyan-400',
          badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
          activeBg: 'bg-cyan-500 text-black',
        };
    }
  };

  const styles = getCategoryStyles(effect.category);
  const activeTrigger = customKeyMap || effect.keyTrigger;

  // Listen to keyboard key triggers
  useEffect(() => {
    if (!activeTrigger) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger sound if user is typing in an input field or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      
      if (e.key.toUpperCase() === activeTrigger.toUpperCase()) {
        e.preventDefault();
        setIsPlaying(true);
        playSound(effect.params, effect.audioData);
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        const durationMs = (effect.params.duration || 1.0) * 1000;
        timeoutRef.current = setTimeout(() => {
          setIsPlaying(false);
        }, durationMs);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [activeTrigger, effect.params, effect.audioData]);

  return (
    <div
      id={`sound-pad-${effect.id}`}
      onClick={handlePlay}
      className={`relative flex flex-col justify-between p-4 rounded-md border transition-all duration-300 cursor-pointer select-none group ${
        isPlaying
          ? 'scale-[0.98] border-cyan-400 bg-cyan-500/15 shadow-[0_0_20px_rgba(34,211,238,0.3)]'
          : isSelected
          ? 'border-cyan-500/50 bg-[#14171D] shadow-[0_0_15px_rgba(34,211,238,0.15)] scale-[1.01]'
          : `${styles.border} ${styles.bg} ${styles.glow}`
      }`}
    >
      {/* Category Tag & Keyboard Key Trigger */}
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border ${styles.badge} font-bold`}>
          {effect.category === 'game' ? 'GAME / RETRO' : effect.category === 'ui' ? 'APP / UI' : effect.category === 'music' ? 'MUSIC / BEAT' : 'CUSTOM'}
        </span>
        
        {activeTrigger && (
          <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono border border-white/10 bg-black/60 font-bold ${
            isPlaying ? 'bg-cyan-500 text-black border-cyan-400' : 'text-slate-400'
          }`}>
            {activeTrigger}
          </kbd>
        )}
      </div>

      {/* Title, Icon & Beautiful Mini equalizer sound visualizer display */}
      <div className="flex items-center justify-between my-2.5">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className={`p-2 rounded transition-transform duration-300 shrink-0 ${
            isPlaying ? 'bg-cyan-500 text-black scale-105 animate-pulse' : 'bg-black/40 text-white border border-white/5 group-hover:scale-105'
          }`}>
            <Icon name={effect.icon} className={styles.text} size={18} />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-semibold text-slate-200 text-sm tracking-tight leading-tight truncate">
              {effect.name}
            </span>
            <span className="text-[11px] text-slate-500 font-sans truncate">
              {effect.khmerName}
            </span>
          </div>
        </div>

        {/* Elegant mini audio-visualizer soundbars inside card */}
        <div className="flex items-end gap-[2px] h-6 w-8 shrink-0 pb-1 px-1 justify-end">
          <div className={`w-[3px] rounded-t-sm transition-all duration-300 ${
            isPlaying ? 'h-4 bg-cyan-400 animate-bar-1' : 'h-[3px] bg-slate-700/60'
          }`} />
          <div className={`w-[3px] rounded-t-sm transition-all duration-300 ${
            isPlaying ? 'h-5 bg-cyan-400 animate-bar-2' : 'h-[5px] bg-slate-700/60'
          }`} />
          <div className={`w-[3px] rounded-t-sm transition-all duration-300 ${
            isPlaying ? 'h-6 bg-cyan-400 animate-bar-3' : 'h-[2px] bg-slate-700/60'
          }`} />
          <div className={`w-[3px] rounded-t-sm transition-all duration-300 ${
            isPlaying ? 'h-3 bg-cyan-400 animate-bar-4' : 'h-[4px] bg-slate-700/60'
          }`} />
        </div>
      </div>

      {/* Bottom controls / metadata */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/5">
        <span className="text-[9px] uppercase tracking-tighter text-slate-500 font-mono">
          {effect.params.waveform} / {effect.params.duration.toFixed(2)}s
        </span>

        {/* Edit & Action Buttons */}
        <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
          {/* Download button */}
          <button
            id={`btn-dl-${effect.id}`}
            onClick={handleDownload}
            disabled={isDownloading}
            title="ទាញយកជា WAV / Download as WAV"
            className={`p-1 text-slate-500 hover:text-white rounded hover:bg-white/5 transition-colors ${
              isDownloading ? 'animate-pulse' : ''
            }`}
          >
            {isDownloading ? (
              <Icon name="RefreshCw" size={13} className="animate-spin" />
            ) : (
              <Icon name="Download" size={13} />
            )}
          </button>

          {/* Delete button (only if custom/deletable) */}
          {onDelete && (
            <button
              id={`btn-del-${effect.id}`}
              onClick={() => onDelete(effect.id)}
              title="លុបចោល / Delete Sound"
              className="p-1 text-red-500/60 hover:text-red-400 rounded hover:bg-red-950/20 transition-colors"
            >
              <Icon name="Trash2" size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
