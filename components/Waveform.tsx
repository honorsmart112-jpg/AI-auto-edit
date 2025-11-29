import React, { useEffect, useRef, useState } from 'react';
import { AnalysisResult } from '../types';

interface WaveformProps {
  videoUrl: string | null;
  analysis: AnalysisResult | null;
  duration: number;
  onSeek: (time: number) => void;
  height?: number;
}

export const Waveform: React.FC<WaveformProps> = ({
  videoUrl,
  analysis,
  duration,
  onSeek,
  height = 64
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const abortController = useRef<AbortController | null>(null);

  // 1. Fetch and Decode Audio
  useEffect(() => {
    if (!videoUrl) {
      setAudioBuffer(null);
      return;
    }

    const loadAudio = async () => {
      // Cancel previous requests
      if (abortController.current) {
        abortController.current.abort();
      }
      abortController.current = new AbortController();

      setIsDecoding(true);
      try {
        const response = await fetch(videoUrl, { signal: abortController.current.signal });
        const arrayBuffer = await response.arrayBuffer();
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        setAudioBuffer(decodedBuffer);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("Error decoding audio:", err);
        }
      } finally {
        setIsDecoding(false);
      }
    };

    loadAudio();

    return () => {
      if (abortController.current) abortController.current.abort();
    };
  }, [videoUrl]);

  // 2. Draw Waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const data = audioBuffer.getChannelData(0); // Use first channel
      const step = Math.ceil(data.length / width);
      const amp = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Draw Base Waveform
      ctx.fillStyle = '#4b5563'; // neutral-600
      ctx.beginPath();

      for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;
        
        // Find peak in this chunk
        for (let j = 0; j < step; j++) {
          const datum = data[(i * step) + j];
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }

        // Draw pixel line
        const yMin = (1 + min) * amp;
        const yMax = (1 + max) * amp;
        
        // Prevent flat lines
        const h = Math.max(1, yMax - yMin);
        
        ctx.fillRect(i, yMin, 1, h);
      }

      // Draw Cut Overlays
      if (analysis && analysis.cuts.length > 0 && duration > 0) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)'; // red-500 with opacity
        
        analysis.cuts.forEach(cut => {
          const startX = (cut.start / duration) * width;
          const endX = (cut.end / duration) * width;
          ctx.fillRect(startX, 0, endX - startX, height);
          
          // Add a stronger red line at the top/bottom for visibility
          ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
          ctx.fillRect(startX, 0, endX - startX, 2);
          ctx.fillRect(startX, height - 2, endX - startX, 2);
          ctx.fillStyle = 'rgba(239, 68, 68, 0.3)'; // Reset
        });
      }
    };

    // Handle resizing (basic)
    const resizeObserver = new ResizeObserver(() => {
        if(canvasRef.current) {
            canvasRef.current.width = canvasRef.current.offsetWidth;
            canvasRef.current.height = canvasRef.current.offsetHeight;
            draw();
        }
    });
    resizeObserver.observe(canvas);

    // Initial Draw
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    draw();

    return () => resizeObserver.disconnect();
  }, [audioBuffer, analysis, duration]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || duration === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    onSeek(percentage * duration);
  };

  if (!videoUrl) return null;

  return (
    <div className="w-full relative group" style={{ height }}>
      {isDecoding && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/50 text-xs text-neutral-400 z-10 backdrop-blur-sm">
           Generating waveform...
        </div>
      )}
      <canvas 
        ref={canvasRef}
        className="w-full h-full cursor-pointer hover:bg-neutral-800/20 transition-colors"
        onClick={handleClick}
      />
    </div>
  );
};
