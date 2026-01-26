import { DiffItem, MetricDetails } from "../types";

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
 * Returns details for formula display.
 */
export const calculateCER = (truth: string, ocr: string): MetricDetails => {
  // Remove all whitespace (spaces, tabs, newlines)
  const cleanTruth = truth.replace(/\s+/g, '');
  const cleanOcr = ocr.replace(/\s+/g, '');

  const len = cleanTruth.length;
  if (len === 0) {
    return { score: cleanOcr.length > 0 ? 1 : 0, numerator: cleanOcr.length, denominator: 0 };
  }
  
  const dist = levenshteinDistance(cleanTruth, cleanOcr);
  return { 
    score: dist / len, 
    numerator: dist, 
    denominator: len 
  };
};

/**
 * Calculates Word Error Rate (WER) AND generates a Diff.
 * EXCLUDES SPACES: Tokenizes by whitespace, ignores empty tokens.
 * Returns details including S/I/D counts.
 */
export const calculateWERWithDiff = (truth: string, ocr: string): MetricDetails & { diffs: DiffItem[] } => {
  // Helper to tokenize
  const tokenize = (text: string) => text.trim().split(/\s+/).filter(t => t.length > 0);
  
  const tWords = tokenize(truth);
  const oWords = tokenize(ocr);

  const m = tWords.length;
  const n = oWords.length;

  // 1. Compute Matrix
  const dp: number[][] = [];
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

  // 2. Backtrack to find Diff and Count Errors
  const diffs: DiffItem[] = [];
  let s = 0, iCount = 0, d = 0;
  
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && ptr[i][j] === 0) {
      // Diagonal (Match or Sub)
      if (tWords[i - 1] === oWords[j - 1]) {
        diffs.unshift({ type: 'match', truth: tWords[i - 1], ocr: oWords[j - 1] });
      } else {
        diffs.unshift({ type: 'substitution', truth: tWords[i - 1], ocr: oWords[j - 1] });
        s++;
      }
      i--;
      j--;
    } else if (j > 0 && (i === 0 || ptr[i][j] === 2)) {
      // Left (Insertion in OCR)
      diffs.unshift({ type: 'insertion', ocr: oWords[j - 1] });
      iCount++;
      j--;
    } else {
      // Up (Deletion from Truth)
      diffs.unshift({ type: 'deletion', truth: tWords[i - 1] });
      d++;
      i--;
    }
  }

  const dist = s + iCount + d;
  const wer = m === 0 ? (n > 0 ? 1 : 0) : dist / m;

  return { 
    score: wer, 
    numerator: dist, 
    denominator: m,
    breakdown: { s, i: iCount, d },
    diffs 
  };
};

/**
 * Calculates Punctuation Accuracy.
 */
export const calculatePunctuationAccuracy = (truth: string, ocr: string): MetricDetails => {
  const punctuationRegex = /[.,?!:;""''()-]/g;
  const truthPunc = truth.match(punctuationRegex) || [];
  const ocrPunc = ocr.match(punctuationRegex) || [];

  const len = truthPunc.length;
  if (len === 0) {
    return { score: ocrPunc.length === 0 ? 1 : 0, numerator: 0, denominator: 0 };
  }

  const dist = levenshteinDistance(truthPunc, ocrPunc);
  const score = Math.max(0, 1 - dist / len);

  return {
    score,
    numerator: dist,
    denominator: len
  };
};
