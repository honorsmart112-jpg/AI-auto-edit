import React, { useRef, useEffect, useState } from 'react';
import { AnalysisResult, SmartZoom, Subtitle } from '../types';
import { Play, Pause, RotateCcw, SkipForward, Maximize, Minimize, Crosshair } from 'lucide-react';

interface VideoPlayerProps {
  videoUrl: string | null;
  analysis: AnalysisResult | null;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  isPickingZoom?: boolean;
  onVideoClick?: (x: number, y: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  analysis,
  currentTime,
  onTimeUpdate,
  onDurationChange,
  isPickingZoom = false,
  onVideoClick
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState<Subtitle | null>(null);
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({});
  const [zoomPoint, setZoomPoint] = useState<{x: number, y: number} | null>(null);
  const [skipNotification, setSkipNotification] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Sync external currentTime prop with video element
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  // Sync playback rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, videoUrl]);

  // React to analysis updates (e.g. editing subtitles while paused)
  useEffect(() => {
    if (analysis && videoRef.current) {
        const time = videoRef.current.currentTime;
        const activeSub = analysis.subtitles.find(s => time >= s.start && time <= s.end);
        setCurrentSubtitle(activeSub || null);
        
        // Update Zoom Point visual
        const activeZoom = analysis.zooms.find(z => time >= z.start && time <= z.end);
        if (activeZoom && activeZoom.x !== undefined && activeZoom.y !== undefined) {
             setZoomPoint({ x: activeZoom.x, y: activeZoom.y });
        } else {
            setZoomPoint(null);
        }
    }
  }, [analysis]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    onTimeUpdate(time);

    if (!analysis) return;

    // 1. Handle Cuts (Auto-Skip)
    const activeCut = analysis.cuts.find(c => time >= c.start && time < c.end);
    if (activeCut) {
      setSkipNotification(`Skipping: ${activeCut.reason}`);
      videoRef.current.currentTime = activeCut.end;
      setTimeout(() => setSkipNotification(null), 1000);
      return; // Skip rest of logic to avoid jitter
    }

    // 2. Handle Subtitles
    const activeSub = analysis.subtitles.find(s => time >= s.start && time <= s.end);
    setCurrentSubtitle(activeSub || null);

    // 3. Handle Smart Zooms (XY Coordinates)
    const activeZoom = analysis.zooms.find(z => time >= z.start && time <= z.end);
    if (activeZoom) {
      // Use explicit X/Y if available, otherwise fallback to target (though service now provides defaults)
      const x = activeZoom.x ?? 50;
      const y = activeZoom.y ?? 50;
      
      setZoomPoint({ x, y });

      setZoomStyle({
        transform: 'scale(2.5)', // Increased scale for "mouse" focus
        transformOrigin: `${x}% ${y}%`,
        transition: 'transform 0.8s ease-in-out'
      });
    } else {
      setZoomPoint(null);
      setZoomStyle({
        transform: 'scale(1)',
        transformOrigin: 'center center',
        transition: 'transform 0.8s ease-in-out'
      });
    }
  };

  const handleVideoClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (isPickingZoom && onVideoClick && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          
          // Clamp to 0-100
          const clampedX = Math.max(0, Math.min(100, x));
          const clampedY = Math.max(0, Math.min(100, y));

          onVideoClick(clampedX, clampedY);
      } else {
          togglePlay();
      }
  };

  if (!videoUrl) {
    return (
      <div className="w-full aspect-video bg-neutral-900 rounded-lg flex items-center justify-center border border-neutral-800">
        <p className="text-neutral-500">No video selected</p>
      </div>
    );
  }

  return (
    <div className="relative group w-full aspect-video bg-black rounded-lg overflow-hidden shadow-2xl border border-neutral-800 select-none">
      {/* Zoom Container */}
      <div 
        ref={containerRef}
        className={`w-full h-full overflow-hidden relative ${isPickingZoom ? 'cursor-crosshair' : 'cursor-pointer'}`}
        onClick={handleVideoClick}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => onDurationChange(videoRef.current?.duration || 0)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          style={zoomStyle}
        />
        
        {/* Visual Target Indicator (When Zooming or Picking) */}
        {(isPickingZoom || zoomPoint) && zoomPoint && (
             <div 
                className="absolute pointer-events-none z-10"
                style={{ 
                    left: `${zoomPoint.x}%`, 
                    top: `${zoomPoint.y}%`,
                    transform: 'translate(-50%, -50%)'
                }}
             >
                 {isPickingZoom ? (
                     <div className="relative">
                         <div className="absolute -left-3 -top-3 w-6 h-6 border-2 border-red-500 rounded-full animate-ping opacity-75"></div>
                         <Crosshair className="text-red-500 drop-shadow-md" size={24} />
                     </div>
                 ) : (
                     <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-lg opacity-50"></div>
                 )}
             </div>
        )}
        
        {/* Picking Overlay Instruction */}
        {isPickingZoom && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/60 text-white px-4 py-2 rounded-lg backdrop-blur text-sm font-bold border border-white/10 animate-pulse">
                    Click to Set Focus Point
                </div>
            </div>
        )}

      </div>

      {/* Overlays */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
        {/* Top: Notifications */}
        <div className="flex justify-end">
           {skipNotification && (
             <div className="bg-red-500/80 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm animate-pulse">
               {skipNotification}
             </div>
           )}
        </div>

        {/* Bottom: Subtitles (Active / Highlight Style) */}
        <div className="flex justify-center mb-2">
          {currentSubtitle && (
            <div className="bg-black/60 text-white px-3 py-1.5 rounded-lg text-sm font-medium text-center backdrop-blur-sm max-w-[70%] shadow-lg border border-white/5 transition-all duration-200">
              <ActiveSubtitleText 
                text={currentSubtitle.text} 
                start={currentSubtitle.start} 
                end={currentSubtitle.end} 
                currentTime={currentTime} 
              />
            </div>
          )}
        </div>
      </div>

      {/* Controls (visible on hover) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center gap-4">
          <button onClick={togglePlay} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors">
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <div className="text-xs font-mono text-neutral-300">
            {videoRef.current ? formatTime(videoRef.current.currentTime) : "00:00"}
          </div>
          
          <div className="flex-1" />

          {/* Speed Control */}
           <div className="relative group/speed">
              <button className="text-xs font-bold font-mono text-neutral-300 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors w-12">
                  {playbackRate}x
              </button>
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/speed:flex flex-col bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden shadow-xl z-50 min-w-[60px]">
                  {[2.0, 1.5, 1.0, 0.5].map(rate => (
                      <button
                          key={rate}
                          onClick={() => setPlaybackRate(rate)}
                          className={`px-3 py-2 text-xs hover:bg-neutral-800 transition-colors text-center ${playbackRate === rate ? "text-blue-400 font-bold bg-blue-900/20" : "text-neutral-300"}`}
                      >
                          {rate}x
                      </button>
                  ))}
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component to render active word highlighting
const ActiveSubtitleText = ({ text, start, end, currentTime }: { text: string, start: number, end: number, currentTime: number }) => {
  const words = text.split(' ');
  const totalDuration = end - start;
  
  // Estimate current word index based on time progress through the subtitle
  const elapsed = Math.max(0, currentTime - start);
  const progress = Math.min(1, elapsed / totalDuration);
  const activeIndex = Math.floor(progress * words.length);

  return (
    <div className="flex flex-wrap justify-center gap-[4px] leading-snug">
      {words.map((word, i) => {
        const isActive = i === activeIndex;
        // const isPast = i < activeIndex;

        return (
          <span 
            key={i} 
            className={`transition-all duration-75 inline-block ${
              isActive 
                ? 'text-yellow-400 font-bold transform scale-110 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]' 
                : 'text-white/90 font-semibold'
            }`}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};