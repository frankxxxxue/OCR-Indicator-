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

export interface Metrics {
  cer: number; // Character Error Rate
  wer: number; // Word Error Rate
  punctuationAccuracy: number;
  paragraphF1: number;
  truthLength: number;
  ocrLength: number;
}

export interface AnalysisResult extends Metrics {
  pairId: string;
  truthFileName: string;
  ocrFileName: string;
  wordDiffs: DiffItem[]; // Detailed breakdown of WER
}

export interface AggregateMetrics {
  avgCer: number;
  avgWer: number;
  avgPunc: number;
  avgParaF1: number;
}