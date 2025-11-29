import React, { useState } from 'react';
import { AnalysisResult, SmartZoom, Subtitle, CutSegment, Highlight } from '../types';
import { Scissors, type LucideIcon, FileText, ListVideo, Clock, Maximize, Pencil, Check, X, Trash2, AlertTriangle, Search, Star, Zap, Crosshair } from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
  analysis: AnalysisResult | null;
  onSeek: (time: number) => void;
  onSubtitleUpdate: (index: number, newText: string) => void;
  onSubtitleDelete: (index: number) => void;
  onZoomUpdate: (index: number, updatedFields: Partial<SmartZoom>) => void;
  onCutUpdate: (index: number, updatedFields: Partial<CutSegment>) => void;
  onCutDelete: (index: number) => void;
  onPromoteCut: (index: number) => void;
  onHighlightUpdate: (index: number, updatedFields: Partial<Highlight>) => void;
  onHighlightDelete: (index: number) => void;
  pickingZoomIndex?: number | null;
  setPickingZoomIndex?: (index: number | null) => void;
}

type Tab = 'chapters' | 'cuts' | 'highlights' | 'subtitles' | 'zooms';

export const Sidebar: React.FC<SidebarProps> = ({ 
    analysis, 
    onSeek, 
    onSubtitleUpdate,
    onSubtitleDelete, 
    onZoomUpdate,
    onCutUpdate,
    onCutDelete,
    onPromoteCut,
    onHighlightUpdate,
    onHighlightDelete,
    pickingZoomIndex,
    setPickingZoomIndex
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('chapters');
  const [subtitleSearch, setSubtitleSearch] = useState('');

  if (!analysis) {
    return (
      <div className="w-80 border-l border-neutral-800 bg-neutral-900 p-6 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4">
           <FileText className="text-neutral-600" />
        </div>
        <h3 className="text-neutral-400 font-medium">Waiting for Analysis</h3>
        <p className="text-neutral-600 text-sm mt-2">Upload a video and click Analyze to see generated edits.</p>
      </div>
    );
  }

  // Ensure highlights array exists if loading from older data
  const highlights = analysis.highlights || [];

  return (
    <div className="w-80 border-l border-neutral-800 bg-neutral-900 flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-neutral-800 overflow-x-auto scrollbar-none">
        <TabButton 
            active={activeTab === 'chapters'} 
            onClick={() => setActiveTab('chapters')} 
            icon={ListVideo} 
            label="Chapters" 
        />
        <TabButton 
            active={activeTab === 'cuts'} 
            onClick={() => setActiveTab('cuts')} 
            icon={Scissors} 
            label="Cuts" 
        />
        <TabButton 
            active={activeTab === 'highlights'} 
            onClick={() => setActiveTab('highlights')} 
            icon={Star} 
            label="Stars" 
        />
        <TabButton 
            active={activeTab === 'zooms'} 
            onClick={() => setActiveTab('zooms')} 
            icon={Maximize} 
            label="Zooms" 
        />
        <TabButton 
            active={activeTab === 'subtitles'} 
            onClick={() => setActiveTab('subtitles')} 
            icon={FileText} 
            label="Subs" 
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-neutral-700">
        {activeTab === 'chapters' && (
             analysis.chapters.length === 0 ? <EmptyState label="No chapters detected" /> :
             analysis.chapters.map((chapter, i) => (
                <div key={i} onClick={() => onSeek(chapter.timestamp)} className="p-3 bg-neutral-800/50 hover:bg-neutral-800 rounded cursor-pointer transition-colors border border-transparent hover:border-neutral-700">
                    <div className="flex items-center gap-2 mb-1">
                        <Clock size={14} className="text-blue-400" />
                        <span className="text-xs font-mono text-blue-400">{formatTime(chapter.timestamp)}</span>
                    </div>
                    <div className="font-medium text-sm text-neutral-200">{chapter.title}</div>
                </div>
            ))
        )}

        {activeTab === 'cuts' && (
             analysis.cuts.length === 0 ? <EmptyState label="No cuts needed" /> :
             analysis.cuts.map((cut, i) => (
                <CutItem
                    key={i}
                    cut={cut}
                    index={i}
                    onSeek={onSeek}
                    onUpdate={onCutUpdate}
                    onDelete={onCutDelete}
                    onPromote={onPromoteCut}
                />
            ))
        )}

        {activeTab === 'highlights' && (
             highlights.length === 0 ? <EmptyState label="No highlights marked" /> :
             highlights.map((highlight, i) => (
                <HighlightItem
                    key={i}
                    highlight={highlight}
                    index={i}
                    onSeek={onSeek}
                    onUpdate={onHighlightUpdate}
                    onDelete={onHighlightDelete}
                />
            ))
        )}

        {activeTab === 'zooms' && (
             analysis.zooms.length === 0 ? <EmptyState label="No smart zooms detected" /> :
             analysis.zooms.map((zoom, i) => {
                const isPicking = pickingZoomIndex === i;
                return (
                    <div key={i} className={`p-3 bg-blue-900/10 hover:bg-blue-900/20 rounded transition-colors border ${isPicking ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'border-blue-900/30'} group`}>
                        <div className="flex justify-between items-center mb-2" onClick={() => onSeek(zoom.start)}>
                            <span className="text-xs font-mono text-blue-400 cursor-pointer hover:underline">{formatTime(zoom.start)} - {formatTime(zoom.end)}</span>
                        </div>
                        
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Focus Point</span>
                                    <span className="text-[10px] text-neutral-400 font-mono">
                                        {zoom.x !== undefined ? `x:${Math.round(zoom.x)}% y:${Math.round(zoom.y)}%` : 'Auto'}
                                    </span>
                                </div>
                                {setPickingZoomIndex && (
                                    <button
                                        onClick={() => {
                                            onSeek(zoom.start);
                                            setPickingZoomIndex(isPicking ? null : i);
                                        }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                            isPicking 
                                                ? 'bg-red-500 text-white animate-pulse' 
                                                : 'bg-neutral-800 border border-neutral-700 text-neutral-300 hover:bg-neutral-700'
                                        }`}
                                    >
                                        <Crosshair size={12} />
                                        {isPicking ? 'Click Video to Set' : 'Set Focus'}
                                    </button>
                                )}
                            </div>
                            
                            <input 
                                type="text"
                                value={zoom.description}
                                onChange={(e) => onZoomUpdate(i, { description: e.target.value })}
                                className="w-full bg-transparent border-b border-neutral-700 text-sm text-neutral-400 focus:text-white focus:border-blue-500 focus:outline-none py-1 placeholder-neutral-600"
                                placeholder="Zoom description..."
                            />
                        </div>
                    </div>
                );
             })
        )}

        {activeTab === 'subtitles' && (
            <>
                <div className="sticky top-0 bg-neutral-900 pb-3 z-10 -mt-2 pt-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
                        <input
                            type="text"
                            value={subtitleSearch}
                            onChange={(e) => setSubtitleSearch(e.target.value)}
                            placeholder="Search subtitles..."
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-full pl-9 pr-8 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                        {subtitleSearch && (
                            <button
                                onClick={() => setSubtitleSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white p-1 rounded-full hover:bg-neutral-700"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>

                {(() => {
                    if (analysis.subtitles.length === 0) return <EmptyState label="No speech detected" />;

                    const filteredSubtitles = analysis.subtitles
                        .map((sub, index) => ({ sub, originalIndex: index }))
                        .filter(({ sub }) => sub.text.toLowerCase().includes(subtitleSearch.toLowerCase()));

                    if (filteredSubtitles.length === 0) return <EmptyState label="No matching subtitles found" />;

                    return filteredSubtitles.map(({ sub, originalIndex }) => (
                        <SubtitleItem 
                            key={originalIndex} 
                            sub={sub} 
                            index={originalIndex} 
                            onSeek={onSeek} 
                            onUpdate={onSubtitleUpdate} 
                            onDelete={onSubtitleDelete}
                        />
                    ));
                })()}
            </>
        )}
      </div>
    </div>
  );
};

// Sub-component for individual cut items
interface CutItemProps {
    cut: CutSegment;
    index: number;
    onSeek: (time: number) => void;
    onUpdate: (index: number, updatedFields: Partial<CutSegment>) => void;
    onDelete: (index: number) => void;
    onPromote: (index: number) => void;
}

const CutItem: React.FC<CutItemProps> = ({ cut, index, onSeek, onUpdate, onDelete, onPromote }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [startStr, setStartStr] = useState(formatTime(cut.start));
    const [endStr, setEndStr] = useState(formatTime(cut.end));
    const [reason, setReason] = useState(cut.reason);

    const handleEdit = () => {
        setStartStr(formatTime(cut.start));
        setEndStr(formatTime(cut.end));
        setReason(cut.reason);
        setIsEditing(true);
    };

    const handleSave = () => {
        const start = parseTimeString(startStr);
        const end = parseTimeString(endStr);
        onUpdate(index, { start, end, reason });
        setIsEditing(false);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsConfirming(true);
    };

    const confirmDelete = () => {
        onDelete(index);
        setIsConfirming(false);
    };

    if (isConfirming) {
        return (
            <div className="p-3 bg-red-950/20 border border-red-500/40 rounded flex flex-col gap-2">
                <div className="flex items-center gap-2 text-red-200 justify-center pt-1">
                    <AlertTriangle size={14} className="text-red-500" />
                    <span className="text-sm font-medium">Remove this cut?</span>
                </div>
                <div className="text-center">
                    <span className="text-[10px] text-red-400/80 font-normal">
                        The video segment will be restored.
                    </span>
                </div>
                <div className="flex gap-2 mt-1">
                    <button 
                        onClick={confirmDelete}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs py-1.5 rounded font-medium transition-colors shadow-sm"
                    >
                        Confirm
                    </button>
                    <button 
                        onClick={() => setIsConfirming(false)}
                        className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs py-1.5 rounded font-medium transition-colors border border-neutral-700"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    if (isEditing) {
        return (
            <div className="p-3 bg-neutral-800 border border-neutral-700 rounded shadow-md space-y-2">
                <div className="flex items-center gap-2">
                    <input 
                        type="text" 
                        value={startStr} 
                        onChange={e => setStartStr(e.target.value)}
                        className="w-16 bg-neutral-900 border border-neutral-700 rounded px-1 text-xs text-center focus:border-blue-500 outline-none"
                    />
                    <span className="text-neutral-500">-</span>
                    <input 
                        type="text" 
                        value={endStr} 
                        onChange={e => setEndStr(e.target.value)}
                        className="w-16 bg-neutral-900 border border-neutral-700 rounded px-1 text-xs text-center focus:border-blue-500 outline-none"
                    />
                </div>
                <input 
                    type="text" 
                    value={reason} 
                    onChange={e => setReason(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs focus:border-blue-500 outline-none"
                    placeholder="Reason..."
                />
                
                <div className="flex flex-col gap-2 pt-2 border-t border-neutral-700 mt-2">
                     <button 
                        onClick={() => onPromote(index)}
                        className="w-full flex items-center justify-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded py-1 text-xs transition-colors"
                     >
                        <Star size={12} /> Promote to Highlight
                     </button>
                     
                     <div className="flex justify-between items-center">
                        <button 
                            onClick={handleDeleteClick} 
                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-900/20 transition-colors"
                            title="Remove this cut to keep the video segment"
                        >
                            <Trash2 size={12} />
                            Keep Segment
                        </button>
                        <div className="flex gap-2">
                            <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-neutral-700 text-neutral-400 rounded"><X size={14}/></button>
                            <button onClick={handleSave} className="p-1 hover:bg-green-500/20 text-green-500 rounded"><Check size={14}/></button>
                        </div>
                     </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-3 bg-red-900/10 hover:bg-red-900/20 rounded transition-colors border border-red-900/30 group relative">
            <div className="flex justify-between items-center mb-1">
                <div onClick={() => onSeek(cut.start)} className="cursor-pointer flex items-center gap-2">
                    <span className="text-xs font-mono text-red-400 hover:underline">{formatTime(cut.start)} - {formatTime(cut.end)}</span>
                    <span className="text-[10px] uppercase font-bold text-red-500 bg-red-900/40 px-1.5 py-0.5 rounded">Auto-Cut</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={() => onPromote(index)} 
                        className="p-1 hover:bg-amber-500/20 text-amber-500/70 hover:text-amber-500 rounded" 
                        title="Highlight Segment (Convert to Highlight)"
                    >
                        <Star size={12} />
                    </button>
                     <button onClick={handleEdit} className="p-1 hover:bg-neutral-800 text-neutral-400 rounded" title="Edit Time">
                        <Pencil size={12} />
                    </button>
                    <button onClick={handleDeleteClick} className="p-1 hover:bg-red-900/50 text-red-400 rounded" title="Keep Segment (Remove Cut)">
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>
            <p className="text-xs text-neutral-300 leading-snug">{cut.reason}</p>
        </div>
    );
};


// Sub-component for individual Highlight items
interface HighlightItemProps {
    highlight: Highlight;
    index: number;
    onSeek: (time: number) => void;
    onUpdate: (index: number, updatedFields: Partial<Highlight>) => void;
    onDelete: (index: number) => void;
}

const HighlightItem: React.FC<HighlightItemProps> = ({ highlight, index, onSeek, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [label, setLabel] = useState(highlight.label);

    const handleSave = () => {
        onUpdate(index, { label });
        setIsEditing(false);
    };

    if (isEditing) {
         return (
            <div className="p-3 bg-neutral-800 border border-neutral-700 rounded shadow-md space-y-2">
                <input 
                    type="text" 
                    value={label} 
                    onChange={e => setLabel(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs focus:border-amber-500 outline-none"
                    placeholder="Highlight Label..."
                    autoFocus
                />
                <div className="flex justify-end gap-2">
                    <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-neutral-700 text-neutral-400 rounded"><X size={14}/></button>
                    <button onClick={handleSave} className="p-1 hover:bg-green-500/20 text-green-500 rounded"><Check size={14}/></button>
                </div>
            </div>
        );
    }

    return (
         <div className="p-3 bg-amber-900/10 hover:bg-amber-900/20 rounded transition-colors border border-amber-900/30 group relative">
            <div className="flex justify-between items-center mb-1">
                <div onClick={() => onSeek(highlight.start)} className="cursor-pointer flex items-center gap-2">
                    <span className="text-xs font-mono text-amber-500 hover:underline">{formatTime(highlight.start)} - {formatTime(highlight.end)}</span>
                    <Zap size={10} className="text-amber-500 fill-amber-500" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setIsEditing(true)} className="p-1 hover:bg-neutral-800 text-neutral-400 rounded" title="Edit Label">
                        <Pencil size={12} />
                    </button>
                    <button onClick={() => onDelete(index)} className="p-1 hover:bg-red-900/50 text-red-400 rounded" title="Remove Highlight">
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>
            <p className="text-xs text-neutral-300 font-medium">{highlight.label}</p>
        </div>
    );
};


// Sub-component for individual subtitle items to handle edit state
interface SubtitleItemProps {
  sub: Subtitle;
  index: number;
  onSeek: (time: number) => void;
  onUpdate: (index: number, text: string) => void;
  onDelete: (index: number) => void;
}

const SubtitleItem: React.FC<SubtitleItemProps> = ({ sub, index, onSeek, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [backupText, setBackupText] = useState("");

  const handleEdit = () => {
    setBackupText(sub.text);
    setIsEditing(true);
  };

  const handleDone = () => {
    setIsEditing(false);
  };

  const handleCancel = () => {
    onUpdate(index, backupText);
    setIsEditing(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirming(true);
  };

  const confirmDelete = () => {
      onDelete(index);
      setIsConfirming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleDone();
    }
    if (e.key === 'Escape') {
        handleCancel();
    }
  };

  if (isConfirming) {
      return (
        <div className="p-2 bg-neutral-800 border border-neutral-700 rounded shadow-inner space-y-1.5">
            <p className="text-xs text-neutral-300 text-center font-medium">Delete subtitle?</p>
            <div className="flex gap-2">
                    <button 
                    onClick={confirmDelete}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white text-[10px] py-1 rounded font-medium transition-colors"
                >
                    Delete
                </button>
                <button 
                    onClick={() => setIsConfirming(false)}
                    className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-[10px] py-1 rounded font-medium transition-colors border border-neutral-700"
                >
                    Cancel
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className={clsx(
        "p-2 rounded transition-colors border group relative",
        isEditing ? "bg-neutral-800 border-neutral-700 shadow-md" : "bg-neutral-800/30 hover:bg-neutral-800 border-transparent hover:border-neutral-700"
    )}>
        <div className="flex items-center justify-between mb-1">
            <span 
                className="text-[10px] font-mono text-emerald-500 hover:text-emerald-400 transition-colors cursor-pointer select-none" 
                onClick={() => onSeek(sub.start)}
            >
                {formatTime(sub.start)} - {formatTime(sub.end)}
            </span>
            
            <div className="flex gap-1">
                {isEditing ? (
                    <>
                        <button onClick={handleDone} className="p-1 hover:bg-green-500/20 text-green-500 rounded transition-colors" title="Save">
                            <Check size={12} />
                        </button>
                        <button onClick={handleCancel} className="p-1 hover:bg-red-500/20 text-red-500 rounded transition-colors" title="Cancel">
                            <X size={12} />
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={handleEdit} className="p-1 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded transition-colors opacity-0 group-hover:opacity-100" title="Edit">
                            <Pencil size={12} />
                        </button>
                        <button 
                            onClick={handleDeleteClick} 
                            className="p-1 hover:bg-neutral-700 text-neutral-400 hover:text-red-400 rounded transition-colors opacity-0 group-hover:opacity-100" 
                            title="Delete"
                        >
                            <Trash2 size={12} />
                        </button>
                    </>
                )}
            </div>
        </div>

        {isEditing ? (
            <textarea 
                value={sub.text}
                onChange={(e) => onUpdate(index, e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-neutral-900 border border-neutral-700 rounded p-1.5 text-[10px] text-white focus:outline-none focus:border-blue-500 resize-none block leading-tight"
                rows={Math.max(2, Math.ceil(sub.text.length / 35))}
                autoFocus
                placeholder="Enter subtitle text..."
            />
        ) : (
            <p className="text-[9px] text-neutral-300 italic whitespace-pre-wrap leading-tight">
                "{sub.text}"
            </p>
        )}
    </div>
  );
};

const TabButton = ({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: LucideIcon, label: string }) => (
    <button 
        onClick={onClick}
        className={clsx(
            "flex-1 flex items-center justify-center gap-2 py-3 px-2 text-sm font-medium transition-colors border-b-2 min-w-[80px]",
            active ? "text-white border-blue-500 bg-neutral-800/50" : "text-neutral-500 border-transparent hover:text-neutral-300 hover:bg-neutral-800/30"
        )}
    >
        <Icon size={16} />
        {label}
    </button>
);

const EmptyState = ({ label }: { label: string }) => (
    <div className="text-center py-10 text-neutral-600 text-sm italic">
        {label}
    </div>
);

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const parseTimeString = (str: string): number => {
  const parts = str.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return Number(str) || 0;
};