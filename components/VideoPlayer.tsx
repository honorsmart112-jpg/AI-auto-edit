import React, { useRef, useEffect, useState } from 'react';
import { AnalysisResult, CutSegment, SmartZoom, Subtitle } from '../types';
import { Play, Pause, RotateCcw, SkipForward, Maximize, Minimize } from 'lucide-react';

interface VideoPlayerProps {
  videoUrl: string | null;
  analysis: AnalysisResult | null;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  analysis,
  currentTime,
  onTimeUpdate,
  onDurationChange
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState<string | null>(null);
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({});
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
        setCurrentSubtitle(activeSub ? activeSub.text : null);
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
    setCurrentSubtitle(activeSub ? activeSub.text : null);

    // 3. Handle Smart Zooms
    const activeZoom = analysis.zooms.find(z => time >= z.start && time <= z.end);
    if (activeZoom) {
      let transformOrigin = 'center center';
      switch (activeZoom.target) {
        case 'top-left': transformOrigin = 'top left'; break;
        case 'top-right': transformOrigin = 'top right'; break;
        case 'bottom-left': transformOrigin = 'bottom left'; break;
        case 'bottom-right': transformOrigin = 'bottom right'; break;
        default: transformOrigin = 'center center';
      }
      setZoomStyle({
        transform: 'scale(1.5)',
        transformOrigin: transformOrigin,
        transition: 'transform 0.8s ease-in-out'
      });
    } else {
      setZoomStyle({
        transform: 'scale(1)',
        transformOrigin: 'center center',
        transition: 'transform 0.8s ease-in-out'
      });
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
    <div className="relative group w-full aspect-video bg-black rounded-lg overflow-hidden shadow-2xl border border-neutral-800">
      {/* Zoom Container */}
      <div 
        ref={containerRef}
        className="w-full h-full overflow-hidden"
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

        {/* Bottom: Subtitles */}
        <div className="flex justify-center mb-8">
          {currentSubtitle && (
            <div className="bg-black/60 text-white px-4 py-2 rounded-lg text-lg text-center backdrop-blur-md max-w-[80%] shadow-lg border border-white/10 transition-all duration-200">
              {currentSubtitle}
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

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
