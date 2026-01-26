export interface FilePair {
  id: string;
  truthFile: File | null;
  ocrFile: File | null;
  truthContent?: string;
  ocrContent?: string;
  status: 'pending' | 'loading' | 'analyzed' | 'error';
}

export type DiffType = 'match' | 'substitution' | 'insertion' | 'deletion';

export interface DiffItem {
  type: DiffType;
  truth?: string; // The word from the ground truth
  ocr?: string;   // The word from the OCR output
}

export interface MetricDetails {
  score: number;
  // For display "formula"
  numerator?: number; // e.g. distance or errors
  denominator?: number; // e.g. total length
  breakdown?: {
    s: number; // substitutions
    i: number; // insertions
    d: number; // deletions
  };
}

export interface Metrics {
  cer: MetricDetails; 
  wer: MetricDetails & { diffs: DiffItem[] };
  punctuationAccuracy: MetricDetails;
  truthLength: number;
  ocrLength: number;
}

export interface AnalysisResult extends Metrics {
  pairId: string;
  truthFileName: string;
  ocrFileName: string;
}

export interface AggregateMetrics {
  avgCer: number;
  avgWer: number;
  avgPunc: number;
}