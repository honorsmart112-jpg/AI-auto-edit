import React, { useRef, useEffect } from 'react';
import { AnalysisResult } from '../types';
import { Waveform } from './Waveform';

interface TimelineProps {
  duration: number;
  currentTime: number;
  analysis: AnalysisResult | null;
  onSeek: (time: number) => void;
  videoUrl?: string | null; // Added for waveform
}

export const Timeline: React.FC<TimelineProps> = ({
  duration,
  currentTime,
  analysis,
  onSeek,
  videoUrl
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || duration === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    onSeek(percentage * duration);
  };

  const getLeft = (time: number) => `${(time / duration) * 100}%`;
  const getWidth = (start: number, end: number) => `${((end - start) / duration) * 100}%`;

  return (
    <div className="w-full bg-neutral-900 border-t border-neutral-800 flex flex-col select-none relative">
      <div className="flex-1 relative" ref={containerRef}>
        
        {/* Playhead Line (Spans full height) */}
        <div 
            className="absolute top-0 bottom-0 w-0.5 bg-yellow-500 z-50 pointer-events-none shadow-[0_0_10px_rgba(234,179,8,0.5)] transition-all duration-75 ease-linear"
            style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
        >
            <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-yellow-500 rotate-45 transform shadow-md"></div>
        </div>

        {/* Time Markers */}
        <div className="absolute inset-0 top-0 h-full flex pointer-events-none opacity-20 z-0">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex-1 border-l border-white h-full text-[10px] pl-1 pt-1 text-white">
               {formatTime((duration / 10) * i)}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1 p-2 pt-6 relative z-10" onClick={handleClick}>
          
          {/* Track 1: Cuts (Red) */}
          <div className="h-6 w-full relative bg-neutral-800/50 rounded overflow-hidden">
            <span className="absolute left-2 top-[2px] text-[10px] text-neutral-500 uppercase tracking-wider font-bold z-10 pointer-events-none">Cuts</span>
            {analysis?.cuts.map((cut, i) => (
              <div
                key={i}
                className="absolute h-full bg-red-500/40 border-l border-r border-red-500 hover:bg-red-500/60 transition-colors cursor-pointer group"
                style={{ left: getLeft(cut.start), width: getWidth(cut.start, cut.end) }}
                title={cut.reason}
              >
                  <div className="hidden group-hover:block absolute -top-8 left-0 bg-neutral-800 text-xs px-2 py-1 rounded border border-neutral-700 whitespace-nowrap z-50 text-white">
                      Auto-Cut: {cut.reason}
                  </div>
              </div>
            ))}
          </div>

          {/* Track 2: Zooms (Blue) */}
          <div className="h-6 w-full relative bg-neutral-800/50 rounded overflow-hidden">
            <span className="absolute left-2 top-[2px] text-[10px] text-neutral-500 uppercase tracking-wider font-bold z-10 pointer-events-none">Zoom</span>
            {analysis?.zooms.map((zoom, i) => (
              <div
                key={i}
                className="absolute h-full bg-blue-500/40 border-l border-r border-blue-500 hover:bg-blue-500/60 transition-colors cursor-pointer"
                style={{ left: getLeft(zoom.start), width: getWidth(zoom.start, zoom.end) }}
                title={`Zoom: ${zoom.target}`}
              />
            ))}
          </div>

          {/* Track 3: Subtitles (Green) */}
          <div className="h-6 w-full relative bg-neutral-800/50 rounded overflow-hidden">
             <span className="absolute left-2 top-[2px] text-[10px] text-neutral-500 uppercase tracking-wider font-bold z-10 pointer-events-none">Subs (KL)</span>
            {analysis?.subtitles.map((sub, i) => (
              <div
                key={i}
                className="absolute h-full bg-emerald-500/40 border-l border-r border-emerald-500 hover:bg-emerald-500/60 transition-colors cursor-pointer group"
                style={{ left: getLeft(sub.start), width: getWidth(sub.start, sub.end) }}
              >
                  <div className="hidden group-hover:block absolute -top-8 left-0 bg-neutral-800 text-xs px-2 py-1 rounded border border-neutral-700 whitespace-nowrap z-50 max-w-[200px] truncate text-white">
                      {sub.text}
                  </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Waveform Visualization */}
        <div className="w-full px-2 pb-2">
            <div className="relative h-16 bg-neutral-900 rounded border border-neutral-800 overflow-hidden">
                <span className="absolute left-2 top-[2px] text-[10px] text-neutral-500 uppercase tracking-wider font-bold z-20 pointer-events-none">Audio</span>
                <Waveform 
                    videoUrl={videoUrl || null} 
                    analysis={analysis} 
                    duration={duration} 
                    onSeek={onSeek}
                    height={64}
                />
            </div>
        </div>

      </div>
    </div>
  );
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
