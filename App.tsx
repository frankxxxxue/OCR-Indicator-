import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { FilePair, AnalysisResult, AggregateMetrics } from './types';
import { 
  calculateCER, 
  calculateWERWithDiff, 
  calculatePunctuationAccuracy, 
  calculateParagraphF1 
} from './utils/algorithms';
import { MetricCard } from './components/MetricCard';
import { ResultsTable } from './components/ResultsTable';

const App: React.FC = () => {
  const [truthFiles, setTruthFiles] = useState<File[]>([]);
  const [ocrFiles, setOcrFiles] = useState<File[]>([]);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTruthUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setTruthFiles(Array.from(e.target.files));
    }
  };

  const handleOcrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setOcrFiles(Array.from(e.target.files));
    }
  };

  // Auto-pair files based on index after sorting filenames
  const pairedFiles: FilePair[] = useMemo(() => {
    const sortedTruth = [...truthFiles].sort((a, b) => a.name.localeCompare(b.name));
    const sortedOcr = [...ocrFiles].sort((a, b) => a.name.localeCompare(b.name));
    
    const maxLen = Math.max(sortedTruth.length, sortedOcr.length);
    const pairs: FilePair[] = [];

    for (let i = 0; i < maxLen; i++) {
      pairs.push({
        id: `pair-${i}`,
        truthFile: sortedTruth[i] || null,
        ocrFile: sortedOcr[i] || null,
        status: 'pending'
      });
    }
    return pairs;
  }, [truthFiles, ocrFiles]);

  const runAnalysis = async () => {
    if (pairedFiles.length === 0) {
      setError("Please upload files first.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    const newResults: AnalysisResult[] = [];

    try {
      for (const pair of pairedFiles) {
        if (!pair.truthFile || !pair.ocrFile) continue;

        const truthText = await readFile(pair.truthFile);
        const ocrText = await readFile(pair.ocrFile);

        const cer = calculateCER(truthText, ocrText);
        const { wer, diffs } = calculateWERWithDiff(truthText, ocrText);
        const punc = calculatePunctuationAccuracy(truthText, ocrText);
        const paraF1 = calculateParagraphF1(truthText, ocrText);

        newResults.push({
          pairId: pair.id,
          truthFileName: pair.truthFile.name,
          ocrFileName: pair.ocrFile.name,
          cer,
          wer,
          wordDiffs: diffs,
          punctuationAccuracy: punc,
          paragraphF1: paraF1,
          truthLength: truthText.length,
          ocrLength: ocrText.length
        });
      }
      setResults(newResults);
    } catch (err) {
      setError("An error occurred while reading files.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const aggregates: AggregateMetrics | null = useMemo(() => {
    if (results.length === 0) return null;
    const sum = results.reduce((acc, curr) => ({
      cer: acc.cer + curr.cer,
      wer: acc.wer + curr.wer,
      punc: acc.punc + curr.punctuationAccuracy,
      paraF1: acc.paraF1 + curr.paragraphF1
    }), { cer: 0, wer: 0, punc: 0, paraF1: 0 });

    return {
      avgCer: sum.cer / results.length,
      avgWer: sum.wer / results.length,
      avgPunc: sum.punc / results.length,
      avgParaF1: sum.paraF1 / results.length
    };
  }, [results]);

  const chartData = aggregates ? [
    { name: 'CER (No Space)', value: parseFloat((aggregates.avgCer * 100).toFixed(2)), fill: '#ef4444' },
    { name: 'WER', value: parseFloat((aggregates.avgWer * 100).toFixed(2)), fill: '#f97316' },
    { name: 'Punc Acc', value: parseFloat((aggregates.avgPunc * 100).toFixed(2)), fill: '#3b82f6' },
    { name: 'Para F1', value: parseFloat((aggregates.avgParaF1 * 100).toFixed(2)), fill: '#22c55e' },
  ] : [];

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h1 className="text-xl font-bold text-gray-900">OCR Benchmark Tool</h1>
          </div>
          <div className="text-sm text-gray-500">
             Evaluate Accuracy (Space Excluded)
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Upload Section */}
        <section className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Upload Datasets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Ground Truth Files (txt)</label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> Truth</p>
                    <p className="text-xs text-gray-500">.txt files only</p>
                  </div>
                  <input type="file" className="hidden" multiple accept=".txt" onChange={handleTruthUpload} />
                </label>
              </div>
              <p className="text-xs text-right text-gray-500">{truthFiles.length} files selected</p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">OCR Output Files (txt)</label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <p className="mb-2 text-sm text-blue-500"><span className="font-semibold">Click to upload</span> OCR Output</p>
                    <p className="text-xs text-blue-500">.txt files only</p>
                  </div>
                  <input type="file" className="hidden" multiple accept=".txt" onChange={handleOcrUpload} />
                </label>
              </div>
              <p className="text-xs text-right text-gray-500">{ocrFiles.length} files selected</p>
            </div>
          </div>

          {/* Pairing Preview */}
          {pairedFiles.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">File Pairing Preview (Sorted by Name)</h3>
              <div className="bg-gray-50 rounded border max-h-40 overflow-y-auto text-xs p-2">
                {pairedFiles.map((p, i) => (
                  <div key={p.id} className={`grid grid-cols-2 gap-4 py-1 px-2 ${i % 2 === 0 ? '' : 'bg-gray-100'} ${(p.truthFile && p.ocrFile) ? 'text-gray-700' : 'text-red-500'}`}>
                    <span>{i + 1}. {p.truthFile?.name || '(Missing Truth)'}</span>
                    <span>{p.ocrFile?.name || '(Missing OCR)'}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={runAnalysis}
                  disabled={isProcessing || pairedFiles.length === 0}
                  className={`px-6 py-2 rounded text-white font-medium shadow-sm transition-colors
                    ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
                  `}
                >
                  {isProcessing ? 'Analyzing...' : 'Run Analysis'}
                </button>
              </div>
              {error && <p className="mt-2 text-red-600 text-sm text-right">{error}</p>}
            </div>
          )}
        </section>

        {/* Results Section */}
        {aggregates && (
          <div className="space-y-8 animate-fade-in">
            <h2 className="text-lg font-semibold text-gray-900">2. Analysis Results</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MetricCard 
                title="Avg CER (No Space)" 
                value={aggregates.avgCer} 
                description="Lower is better"
                color={aggregates.avgCer < 0.05 ? 'green' : 'red'}
              />
              <MetricCard 
                title="Avg WER (Diff)" 
                value={aggregates.avgWer} 
                description="Lower is better"
                color={aggregates.avgWer < 0.1 ? 'green' : 'red'}
              />
              <MetricCard 
                title="Punctuation Acc" 
                value={aggregates.avgPunc} 
                description="Higher is better"
                color="blue"
              />
              <MetricCard 
                title="Paragraph F1" 
                value={aggregates.avgParaF1} 
                description="Structure restoration"
                color="blue"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-6 rounded-xl border shadow-sm">
                <h3 className="text-base font-medium text-gray-900 mb-4">Detailed Breakdown (Click rows for Word Diff)</h3>
                <ResultsTable results={results} />
              </div>

              <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col">
                <h3 className="text-base font-medium text-gray-900 mb-4">Performance Overview</h3>
                <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" width={100} style={{ fontSize: '10px' }} />
                      <Tooltip formatter={(val: number) => `${val}%`} />
                      <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} barSize={30} label={{ position: 'right', fill: '#666', fontSize: 12, formatter: (val:number) => `${val}%` }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;