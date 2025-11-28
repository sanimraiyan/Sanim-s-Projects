export interface PaperSection {
  id: string;
  title: string;
  content: string; // Markdown or HTML
  imagePrompt?: string;
  imageUrl?: string;
  isProcessing?: boolean;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface PaperData {
  title: string;
  abstract: string;
  sections: PaperSection[];
  references: GroundingSource[];
  generatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isError?: boolean;
}

export enum GenerationStep {
  IDLE = 'idle',
  OUTLINING = 'outlining',
  RESEARCHING = 'researching',
  VISUALIZING = 'visualizing',
  COMPLETED = 'completed',
  ERROR = 'error'
}
