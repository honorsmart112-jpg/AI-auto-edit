export interface CutSegment {
  start: number;
  end: number;
  reason: string;
}

export interface Chapter {
  timestamp: number;
  title: string;
}

export interface SmartZoom {
  start: number;
  end: number;
  target: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  description: string;
  x?: number; // 0-100 percentage
  y?: number; // 0-100 percentage
}

export interface Subtitle {
  start: number;
  end: number;
  text: string;
}

export interface Highlight {
  start: number;
  end: number;
  label: string;
}

export interface AnalysisResult {
  cuts: CutSegment[];
  chapters: Chapter[];
  zooms: SmartZoom[];
  subtitles: Subtitle[];
  highlights: Highlight[];
}

export interface ProjectState {
  id: string;
  name: string;
  lastModified: number;
  analysis: AnalysisResult | null;
}