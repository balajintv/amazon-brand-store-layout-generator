export interface ModuleSection {
  id: string;
  type: string;
  name: string;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  area: number;
  center: {
    x: number;
    y: number;
  };
  unique_id: string;
  source_file: string;
  cropped_files: {
    full: string;
    medium: string;
    thumbnail: string;
    dimensions: {
      original: { width: number; height: number };
      medium: { width: number; height: number };
      thumbnail: { width: number; height: number };
    };
  };
  processing_date: string;
}

export interface ModuleCatalog {
  metadata: {
    generated: string;
    total_modules: number;
    source_stores: number;
    section_types: string[];
  };
  modules: ModuleSection[];
  types_index: Record<string, string[]>;
}

export interface LayoutSection {
  id: string;
  module: ModuleSection;
  position: number;
  customizations?: {
    width?: string;
    height?: string;
    margin?: string;
    padding?: string;
  };
}

export interface Layout {
  id: string;
  name: string;
  sections: LayoutSection[];
  metadata: {
    created: string;
    modified: string;
    template?: string;
  };
}

export interface PatternAnalysis {
  section_types: Record<string, {
    count: number;
    common_dimensions: [number[], number][];
    common_aspect_ratios: [number, number][];
    avg_area: number;
    size_range: {
      min_area: number;
      max_area: number;
    };
  }>;
  frequency_analysis: {
    most_common_types: [string, number][];
    total_sections: number;
    unique_types: number;
  };
}

export interface LayoutTemplate {
  name: string;
  description: string;
  sections: string[];
  use_cases: string[];
}

export type ViewMode = 'mobile' | 'tablet' | 'desktop';
export type ExportFormat = 'html' | 'react' | 'json';

export interface DestinationContext {
  width: number;
  height: number;
  viewMode: ViewMode;
  usage: 'hero' | 'prominent' | 'secondary' | 'filler';
  position: 'header' | 'content' | 'footer';
}

export interface ModuleWithQuality extends ModuleSection {
  qualityScore: number;
  destinationFitScore?: number;
  recommendedImageSize?: 'full' | 'medium' | 'thumbnail';
}