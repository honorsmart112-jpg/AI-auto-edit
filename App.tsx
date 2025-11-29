import React, { useState, useEffect, useCallback } from 'react';
import { VideoPlayer } from './components/VideoPlayer';
import { Timeline } from './components/Timeline';
import { Sidebar } from './components/Sidebar';
import { ExportModal, ExportSettings } from './components/ExportModal';
import { AnalysisResult, SmartZoom, CutSegment, Highlight } from './types';
import { analyzeVideoWithGemini } from './services/geminiService';
import { saveVideoToDB, getVideoFromDB } from './services/storage';
import { Upload, Sparkles, AlertCircle, Loader2, Undo, Redo, Download, CheckCircle2 } from 'lucide-react';

const App: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  
  // Undo/Redo History State
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Zoom Picking State
  const [pickingZoomIndex, setPickingZoomIndex] = useState<number | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Export State
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState('');

  // Load state from localStorage on mount
  useEffect(() => {
    const savedAnalysis = localStorage.getItem('bina_ai_analysis');
    const savedVideoId = localStorage.getItem('bina_ai_video_id');
    
    if (savedAnalysis) {
      const parsed = JSON.parse(savedAnalysis);
      // Backwards compatibility: ensure highlights array exists
      if (!parsed.highlights) parsed.highlights = [];
      
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
      // If picking zoom, Escape cancels
      if (pickingZoomIndex !== null && e.key === 'Escape') {
          setPickingZoomIndex(null);
          return;
      }

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
  }, [undo, redo, pickingZoomIndex]);


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

  const handleAddZoom = () => {
    if (!analysis) return;
    
    // Create new zoom starting at current time, default duration 3s
    const start = currentTime;
    const end = Math.min(duration, start + 3);
    
    const newZoom: SmartZoom = {
        start,
        end,
        target: 'center', // legacy fallback, using x/y mainly
        description: 'Manual Focus',
        x: 50,
        y: 50
    };

    // Append and sort
    const updatedZooms = [...analysis.zooms, newZoom].sort((a, b) => a.start - b.start);
    
    // Find new index to trigger picking mode
    const newIndex = updatedZooms.indexOf(newZoom);

    const newAnalysis = {
      ...analysis,
      zooms: updatedZooms
    };

    pushToHistory(newAnalysis);
    setPickingZoomIndex(newIndex);
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

  const handleVideoClick = (x: number, y: number) => {
      if (pickingZoomIndex !== null && analysis) {
          handleZoomUpdate(pickingZoomIndex, { x, y });
          setPickingZoomIndex(null); // Exit picking mode
      }
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

  const handlePromoteCutToHighlight = (index: number) => {
    if (!analysis) return;
    
    const cut = analysis.cuts[index];
    
    // 1. Remove from cuts
    const updatedCuts = analysis.cuts.filter((_, i) => i !== index);

    // 2. Add to highlights
    const newHighlight: Highlight = {
        start: cut.start,
        end: cut.end,
        label: "Highlighted Segment" // Default label
    };
    const updatedHighlights = [...(analysis.highlights || []), newHighlight];

    const newAnalysis = { 
        ...analysis, 
        cuts: updatedCuts,
        highlights: updatedHighlights 
    };
    pushToHistory(newAnalysis);
  };

  const handleHighlightUpdate = (index: number, updatedFields: Partial<Highlight>) => {
    if (!analysis) return;
    const updatedHighlights = [...analysis.highlights];
    updatedHighlights[index] = { ...updatedHighlights[index], ...updatedFields };

    const newAnalysis = { ...analysis, highlights: updatedHighlights };
    pushToHistory(newAnalysis);
  };

  const handleHighlightDelete = (index: number) => {
    if (!analysis) return;
    const updatedHighlights = analysis.highlights.filter((_, i) => i !== index);
    
    const newAnalysis = { ...analysis, highlights: updatedHighlights };
    pushToHistory(newAnalysis);
  };

  // --- Export Logic ---

  const handleStartExport = async (settings: ExportSettings) => {
    setShowExportModal(false);
    setIsExporting(true);
    setExportProgress(0);

    // Simulation steps
    const steps = [
        { progress: 10, stage: 'Analyzing Edit Decision List (EDL)...' },
        { progress: 30, stage: 'Processing Cuts & Trimming...' },
        { progress: 50, stage: `Applying Smart Zooms (${settings.resolution})...` },
        { progress: 70, stage: 'Burning Subtitles (Bahasa Melayu KL)...' },
        { progress: 90, stage: `Encoding to ${settings.format.toUpperCase()} (${settings.quality})...` },
        { progress: 100, stage: 'Finalizing...' }
    ];

    for (const step of steps) {
        setExportStage(step.stage);
        setExportProgress(step.progress);
        // Random delay between 800ms and 2000ms per step
        await new Promise(r => setTimeout(r, Math.random() * 1200 + 800));
    }

    // "Finish"
    setIsExporting(false);
    
    // Create a dummy download
    const exportData = {
        project: "Bina AI Auto Edit",
        date: new Date().toISOString(),
        settings: settings,
        analysisResult: analysis
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bina_ai_export_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert(`Export Complete! \n\n(Note: In this demo, we generated a JSON manifest of your edits. A real production app would use FFmpeg to render the .${settings.format} file.)`);
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
           
           {analysis && (
               <button
                 onClick={() => setShowExportModal(true)}
                 className="flex items-center gap-2 bg-neutral-100 hover:bg-white text-neutral-900 px-4 py-1.5 rounded-full text-sm font-bold transition-all shadow-lg shadow-white/10"
               >
                   <Download size={16} />
                   Export
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
                    // Picking props
                    isPickingZoom={pickingZoomIndex !== null}
                    onVideoClick={handleVideoClick}
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
          onAddZoom={handleAddZoom}
          onCutUpdate={handleCutUpdate}
          onCutDelete={handleCutDelete}
          onPromoteCut={handlePromoteCutToHighlight}
          onHighlightUpdate={handleHighlightUpdate}
          onHighlightDelete={handleHighlightDelete}
          // Zoom picking
          pickingZoomIndex={pickingZoomIndex}
          setPickingZoomIndex={setPickingZoomIndex}
        />
      </div>

      {/* Modals & Overlays */}
      <ExportModal 
        isOpen={showExportModal} 
        onClose={() => setShowExportModal(false)} 
        onExport={handleStartExport} 
      />

      {isExporting && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center text-center">
              <div className="w-full max-w-md space-y-6">
                  <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                          <circle className="text-neutral-800 stroke-current" strokeWidth="6" cx="50" cy="50" r="40" fill="transparent"></circle>
                          <circle 
                            className="text-blue-500 progress-ring__circle stroke-current transition-all duration-300 ease-out" 
                            strokeWidth="6" 
                            strokeLinecap="round" 
                            cx="50" 
                            cy="50" 
                            r="40" 
                            fill="transparent" 
                            strokeDasharray="251.2" 
                            strokeDashoffset={251.2 - (251.2 * exportProgress) / 100}
                            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                          ></circle>
                      </svg>
                      <span className="absolute text-xl font-bold text-white">{exportProgress}%</span>
                  </div>
                  
                  <div className="space-y-2">
                      <h2 className="text-2xl font-bold text-white animate-pulse">Exporting Video...</h2>
                      <p className="text-blue-400 font-mono text-sm">{exportStage}</p>
                  </div>

                  <p className="text-neutral-500 text-xs mt-8">Please do not close this tab.</p>
              </div>
          </div>
      )}

    </div>
  );
};

export default App;