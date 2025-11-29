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
}

export interface Subtitle {
  start: number;
  end: number;
  text: string;
}

export interface AnalysisResult {
  cuts: CutSegment[];
  chapters: Chapter[];
  zooms: SmartZoom[];
  subtitles: Subtitle[];
}

export interface ProjectState {
  id: string;
  name: string;
  lastModified: number;
  analysis: AnalysisResult | null;
}
