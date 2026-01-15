import { DiffItem } from "../types";

/**
 * Basic Levenshtein distance for numbers or strings
 */
export const levenshteinDistance = <T>(a: T[] | string, b: T[] | string): number => {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = [];

  for (let i = 0; i <= m; i++) dp[i] = [i];
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
};

/**
 * Calculates Character Error Rate (CER).
 * EXCLUDES SPACES: strips all whitespace before comparison.
 */
export const calculateCER = (truth: string, ocr: string): number => {
  // Remove all whitespace (spaces, tabs, newlines)
  const cleanTruth = truth.replace(/\s+/g, '');
  const cleanOcr = ocr.replace(/\s+/g, '');

  if (cleanTruth.length === 0) return cleanOcr.length > 0 ? 1 : 0;
  
  const dist = levenshteinDistance(cleanTruth, cleanOcr);
  return dist / cleanTruth.length;
};

/**
 * Calculates Word Error Rate (WER) AND generates a Diff.
 * EXCLUDES SPACES: Tokenizes by whitespace, ignores empty tokens.
 */
export const calculateWERWithDiff = (truth: string, ocr: string): { wer: number; diffs: DiffItem[] } => {
  // Tokenizer: split by whitespace, remove punctuation attached to words for cleaner matching if desired,
  // but usually WER includes punctuation as part of the word or treats punctuation as separate tokens.
  // Given user request "exclude spaces value", we split strictly by space.
  // To make matching robust, we lowercase.
  
  // Helper to tokenize
  const tokenize = (text: string) => text.trim().split(/\s+/).filter(t => t.length > 0);
  
  const tWords = tokenize(truth);
  const oWords = tokenize(ocr);

  const m = tWords.length;
  const n = oWords.length;

  // 1. Compute Matrix
  const dp: number[][] = [];
  // Path tracking: 0=match/sub, 1=del(up), 2=ins(left)
  const ptr: number[][] = []; 

  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
    ptr[i] = [];
    ptr[i][0] = 1; // Deletion from truth
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
    ptr[0][j] = 2; // Insertion into OCR
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      // Compare lowercased for cost, but keep original for display
      // We also strip punctuation for the COMPARISON to be more forgiving, or strict?
      // Standard WER is strict. Let's do strict equality.
      const cost = tWords[i - 1] === oWords[j - 1] ? 0 : 1;
      
      const del = dp[i - 1][j] + 1;
      const ins = dp[i][j - 1] + 1;
      const sub = dp[i - 1][j - 1] + cost;

      if (sub <= del && sub <= ins) {
        dp[i][j] = sub;
        ptr[i][j] = 0; // diag
      } else if (del <= ins) {
        dp[i][j] = del;
        ptr[i][j] = 1; // up
      } else {
        dp[i][j] = ins;
        ptr[i][j] = 2; // left
      }
    }
  }

  // 2. Backtrack to find Diff
  const diffs: DiffItem[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && ptr[i][j] === 0) {
      // Diagonal (Match or Sub)
      if (tWords[i - 1] === oWords[j - 1]) {
        diffs.unshift({ type: 'match', truth: tWords[i - 1], ocr: oWords[j - 1] });
      } else {
        diffs.unshift({ type: 'substitution', truth: tWords[i - 1], ocr: oWords[j - 1] });
      }
      i--;
      j--;
    } else if (j > 0 && (i === 0 || ptr[i][j] === 2)) {
      // Left (Insertion in OCR)
      diffs.unshift({ type: 'insertion', ocr: oWords[j - 1] });
      j--;
    } else {
      // Up (Deletion from Truth)
      diffs.unshift({ type: 'deletion', truth: tWords[i - 1] });
      i--;
    }
  }

  const dist = dp[m][n];
  const wer = m === 0 ? (n > 0 ? 1 : 0) : dist / m;

  return { wer, diffs };
};

/**
 * Calculates Punctuation Accuracy.
 */
export const calculatePunctuationAccuracy = (truth: string, ocr: string): number => {
  const punctuationRegex = /[.,?!:;""''()-]/g;
  const truthPunc = truth.match(punctuationRegex) || [];
  const ocrPunc = ocr.match(punctuationRegex) || [];

  if (truthPunc.length === 0) return ocrPunc.length === 0 ? 1 : 0;

  const dist = levenshteinDistance(truthPunc, ocrPunc);
  return Math.max(0, 1 - dist / truthPunc.length);
};

/**
 * Calculates Paragraph F1 Score.
 * REVISED DEFINITION: Treats each paragraph as a structural unit.
 * Uses fuzzy matching (normalized edit distance) to allow for minor OCR character errors
 * while penalizing structural errors (missed splits, extra splits, merges).
 */
export const calculateParagraphF1 = (truth: string, ocr: string): number => {
  // Normalize: 
  // 1. Remove carriage returns.
  // 2. Split by double newline (or more) to find paragraph blocks.
  // 3. Remove all internal whitespace from content for robust text comparison.
  const normalize = (s: string) => {
    return s.replace(/\r/g, '')
            .split(/\n\s*\n+/) 
            .map(p => p.replace(/\s+/g, '')) 
            .filter(p => p.length > 0);
  };

  const truthParas = normalize(truth);
  const ocrParas = normalize(ocr);

  if (truthParas.length === 0) return ocrParas.length === 0 ? 1 : 0;

  let truePositives = 0;
  const usedOcrIndices = new Set<number>();

  // Threshold: A paragraph is considered "matched" (correctly segmented) if 
  // the character error rate between the truth paragraph and OCR paragraph is low.
  // This ensures we are measuring structural recovery, not just strict character equality.
  // 0.1 means up to 10% difference is allowed.
  const MATCH_THRESHOLD = 0.1; 

  truthParas.forEach(tPara => {
    let bestMatchIdx = -1;
    let bestDist = Infinity;

    ocrParas.forEach((oPara, oIdx) => {
      if (usedOcrIndices.has(oIdx)) return;
      
      // Optimization: If length difference is already larger than threshold, skip expensive Levenshtein
      if (Math.abs(tPara.length - oPara.length) / tPara.length > MATCH_THRESHOLD) return;

      const dist = levenshteinDistance(tPara, oPara);
      const normalizedDist = dist / Math.max(tPara.length, oPara.length);

      if (normalizedDist < bestDist) {
        bestDist = normalizedDist;
        bestMatchIdx = oIdx;
      }
    });

    if (bestMatchIdx !== -1 && bestDist <= MATCH_THRESHOLD) {
      truePositives++;
      usedOcrIndices.add(bestMatchIdx);
    }
  });

  const precision = ocrParas.length === 0 ? 0 : truePositives / ocrParas.length;
  const recall = truthParas.length === 0 ? 0 : truePositives / truthParas.length;

  if (precision + recall === 0) return 0;

  return (2 * precision * recall) / (precision + recall);
};
