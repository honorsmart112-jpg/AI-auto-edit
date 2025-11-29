import React, { useState, useEffect, useCallback } from 'react';
import { VideoPlayer } from './components/VideoPlayer';
import { Timeline } from './components/Timeline';
import { Sidebar } from './components/Sidebar';
import { AnalysisResult, SmartZoom, CutSegment } from './types';
import { analyzeVideoWithGemini } from './services/geminiService';
import { saveVideoToDB, getVideoFromDB } from './services/storage';
import { Upload, Sparkles, AlertCircle, Loader2, Undo, Redo } from 'lucide-react';

const App: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  
  // Undo/Redo History State
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedAnalysis = localStorage.getItem('bina_ai_analysis');
    const savedVideoId = localStorage.getItem('bina_ai_video_id');
    
    if (savedAnalysis) {
      const parsed = JSON.parse(savedAnalysis);
      setAnalysis(parsed);
      // Initialize history with the saved state
      setHistory([parsed]);
      setHistoryIndex(0);
    }

    if (savedVideoId) {
      getVideoFromDB(savedVideoId).then(file => {
        if (file) {
          setVideoFile(file);
          setVideoUrl(URL.createObjectURL(file));
        }
      });
    }
  }, []);

  // --- Undo / Redo Logic ---

  const pushToHistory = (newAnalysis: AnalysisResult) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAnalysis);
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setAnalysis(newAnalysis);
    localStorage.setItem('bina_ai_analysis', JSON.stringify(newAnalysis));
  };

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setAnalysis(history[newIndex]);
      localStorage.setItem('bina_ai_analysis', JSON.stringify(history[newIndex]));
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setAnalysis(history[newIndex]);
      localStorage.setItem('bina_ai_analysis', JSON.stringify(history[newIndex]));
    }
  }, [history, historyIndex]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      // Support Ctrl+Y for Redo on Windows
      if ((e.metaKey || e.ctrlKey) && e.key === 'y' && !e.shiftKey) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);


  // --- Handlers ---

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Limit check updated to 1GB
    if (file.size > 1024 * 1024 * 1024) {
        setError("File size exceeds 1GB limit.");
        return;
    }

    setError(null);
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    
    // Reset analysis and history
    setAnalysis(null);
    setHistory([]);
    setHistoryIndex(-1);

    // Persist video
    const videoId = `vid_${Date.now()}`;
    await saveVideoToDB(videoId, file);
    localStorage.setItem('bina_ai_video_id', videoId);
  };

  const handleAnalyze = async () => {
    if (!videoFile) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeVideoWithGemini(videoFile);
      setAnalysis(result);
      
      // Initialize history with new result
      setHistory([result]);
      setHistoryIndex(0);
      
      localStorage.setItem('bina_ai_analysis', JSON.stringify(result));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze video. Check API Key or file format.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubtitleUpdate = (index: number, newText: string) => {
    if (!analysis) return;
    const updatedSubtitles = [...analysis.subtitles];
    updatedSubtitles[index] = { ...updatedSubtitles[index], text: newText };
    
    const newAnalysis = {
        ...analysis,
        subtitles: updatedSubtitles
    };
    
    pushToHistory(newAnalysis);
  };

  const handleSubtitleDelete = (index: number) => {
    if (!analysis) return;
    const updatedSubtitles = analysis.subtitles.filter((_, i) => i !== index);

    const newAnalysis = { ...analysis, subtitles: updatedSubtitles };
    pushToHistory(newAnalysis);
  };

  const handleZoomUpdate = (index: number, updatedFields: Partial<SmartZoom>) => {
    if (!analysis) return;
    const updatedZooms = [...analysis.zooms];
    updatedZooms[index] = { ...updatedZooms[index], ...updatedFields };

    const newAnalysis = {
      ...analysis,
      zooms: updatedZooms
    };

    pushToHistory(newAnalysis);
  };

  const handleCutUpdate = (index: number, updatedFields: Partial<CutSegment>) => {
    if (!analysis) return;
    const updatedCuts = [...analysis.cuts];
    updatedCuts[index] = { ...updatedCuts[index], ...updatedFields };

    const newAnalysis = { ...analysis, cuts: updatedCuts };
    pushToHistory(newAnalysis);
  };

  const handleCutDelete = (index: number) => {
    if (!analysis) return;
    const updatedCuts = analysis.cuts.filter((_, i) => i !== index);

    const newAnalysis = { ...analysis, cuts: updatedCuts };
    pushToHistory(newAnalysis);
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-neutral-100 font-sans">
      {/* Header */}
      <header className="h-14 border-b border-neutral-800 flex items-center justify-between px-6 bg-neutral-950 z-20">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
             <Sparkles size={18} className="text-white" />
           </div>
           <h1 className="text-lg font-bold tracking-tight">Bina AI <span className="text-neutral-500 font-normal">Auto Edit</span></h1>
        </div>
        
        {/* Undo/Redo Controls */}
        <div className="flex items-center gap-1">
            <button 
                onClick={undo} 
                disabled={historyIndex <= 0}
                className="p-2 text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors rounded-lg hover:bg-neutral-800"
                title="Undo (Ctrl+Z)"
            >
                <Undo size={18} />
            </button>
            <button 
                onClick={redo} 
                disabled={historyIndex >= history.length - 1}
                className="p-2 text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors rounded-lg hover:bg-neutral-800"
                title="Redo (Ctrl+Shift+Z)"
            >
                <Redo size={18} />
            </button>
        </div>

        <div className="flex items-center gap-4">
           {!analysis && videoFile && (
               <button 
                  onClick={handleAnalyze} 
                  disabled={isAnalyzing}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
               >
                  {isAnalyzing ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16} />}
                  {isAnalyzing ? 'Analyzing...' : 'Auto-Edit with Gemini 2.5'}
               </button>
           )}
           <label className="cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-4 py-1.5 rounded-full text-sm transition-colors border border-neutral-700 flex items-center gap-2">
             <Upload size={14} />
             <span>Import Video</span>
             <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
           </label>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Player & Timeline */}
        <div className="flex-1 flex flex-col relative">
            <div className="flex-1 p-8 flex flex-col items-center justify-center bg-neutral-900/50 relative overflow-y-auto">
               
               {error && (
                   <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg flex items-center gap-2 text-sm z-30">
                       <AlertCircle size={16} />
                       {error}
                   </div>
               )}

               <div className="w-full max-w-4xl">
                 <VideoPlayer 
                    videoUrl={videoUrl}
                    analysis={analysis}
                    currentTime={currentTime}
                    onTimeUpdate={setCurrentTime}
                    onDurationChange={setDuration}
                 />
               </div>
            </div>

            {/* Timeline Area */}
            <div className="h-48 bg-neutral-950 border-t border-neutral-800 z-10">
                <Timeline 
                    duration={duration} 
                    currentTime={currentTime} 
                    analysis={analysis}
                    onSeek={setCurrentTime}
                    videoUrl={videoUrl}
                />
            </div>
        </div>

        {/* Right: Sidebar */}
        <Sidebar 
          analysis={analysis} 
          onSeek={setCurrentTime} 
          onSubtitleUpdate={handleSubtitleUpdate}
          onSubtitleDelete={handleSubtitleDelete}
          onZoomUpdate={handleZoomUpdate}
          onCutUpdate={handleCutUpdate}
          onCutDelete={handleCutDelete}
        />
      </div>
    </div>
  );
};

export default App;