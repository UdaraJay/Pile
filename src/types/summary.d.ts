export interface ThreadSummary {
  title: string;
  summary: string;
  keyPoints: string[];
  mood?: 'positive' | 'negative' | 'neutral' | 'mixed';
  confidence?: number; // 0..1
  createdAt: string; // ISO date
  model?: string;
}

export interface PostDataWithSummary {
  isSummarized?: boolean;
  summaryStale?: boolean;
  summary?: ThreadSummary | null;
}

