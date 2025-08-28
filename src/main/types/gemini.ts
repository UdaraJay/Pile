/**
 * Type definitions for Gemini AI integration
 */

export interface GeminiResponse {
  success: boolean;
  timestamp: string;
  data?: any;
  error?: string;
  parseWarning?: {
    message: string;
    fallbackUsed: boolean;
    originalResponse?: string;
  };
}

export interface GeminiStreamResponse {
  success: boolean;
  timestamp: string;
  streamId?: string;
  error?: string;
}

export interface GeminiStreamEvent {
  type: 'start' | 'chunk' | 'end' | 'error';
  streamId: string;
  timestamp: string;
  data?: string;
  error?: string;
}

// JSON template response types for structured AI responses
export interface SummaryResponse {
  title: string;
  summary: string;
  keyThemes: string[];
  mood: 'positive' | 'negative' | 'neutral' | 'mixed';
  confidence: number;
}

export interface MetadataResponse {
  tags: string[];
  category: string;
  importance: 'low' | 'medium' | 'high';
  actionItems: string[];
}

export interface LinkPreviewResponse {
  url: string;
  category: string;
  images: Array<{ src: string; alt: string }>;
  summary: string;
  highlights: string[];
  buttons: Array<{ title: string; href: string }>;
}

export type JSONTemplateResponse = SummaryResponse | MetadataResponse | LinkPreviewResponse;
