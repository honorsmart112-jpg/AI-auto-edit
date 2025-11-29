import React, { useState } from 'react';
import { X, Download, Film, Settings, Monitor } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (settings: ExportSettings) => void;
}

export interface ExportSettings {
  format: 'mp4' | 'mov' | 'webm';
  resolution: 'original' | '4k' | '1080p' | '720p';
  quality: 'high' | 'medium' | 'low';
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport }) => {
  const [format, setFormat] = useState<ExportSettings['format']>('mp4');
  const [resolution, setResolution] = useState<ExportSettings['resolution']>('1080p');
  const [quality, setQuality] = useState<ExportSettings['quality']>('high');

  if (!isOpen) return null;

  const handleExportClick = () => {
    onExport({ format, resolution, quality });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Download size={20} className="text-blue-500" />
            Export Video
          </h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* Format Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-neutral-400 flex items-center gap-2">
              <Film size={16} /> File Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['mp4', 'mov', 'webm'].map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt as any)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all uppercase ${
                    format === fmt 
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' 
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Resolution Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-neutral-400 flex items-center gap-2">
              <Monitor size={16} /> Resolution
            </label>
            <div className="relative">
                <select 
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value as any)}
                    className="w-full bg-neutral-800 border border-neutral-700 text-white text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 appearance-none"
                >
                    <option value="original">Original (Source)</option>
                    <option value="4k">4K Ultra HD (3840x2160)</option>
                    <option value="1080p">Full HD (1920x1080)</option>
                    <option value="720p">HD (1280x720)</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                    <Settings size={14} />
                </div>
            </div>
          </div>

          {/* Quality Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm font-medium text-neutral-400">
                <label className="flex items-center gap-2">Quality (Bitrate)</label>
                <span className={`text-xs px-2 py-0.5 rounded ${
                    quality === 'high' ? 'bg-green-500/20 text-green-400' : 
                    quality === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                }`}>
                    {quality.toUpperCase()}
                </span>
            </div>
            <div className="flex gap-2">
                 {(['low', 'medium', 'high'] as const).map((q) => (
                     <button
                        key={q}
                        onClick={() => setQuality(q)}
                        className={`flex-1 h-2 rounded-full transition-colors ${
                            quality === q 
                                ? (q === 'high' ? 'bg-green-500' : q === 'medium' ? 'bg-yellow-500' : 'bg-red-500')
                                : 'bg-neutral-800 hover:bg-neutral-700'
                        }`}
                     />
                 ))}
            </div>
            <p className="text-xs text-neutral-500 text-right">
                {quality === 'high' ? 'Best for archival (~20mbps)' : quality === 'medium' ? 'Best for social media (~8mbps)' : 'Best for preview (~2mbps)'}
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-950 border-t border-neutral-800 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleExportClick}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2"
          >
            <Download size={16} />
            Start Export
          </button>
        </div>

      </div>
    </div>
  );
};
