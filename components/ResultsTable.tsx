import React, { useState } from 'react';
import { AnalysisResult, DiffItem } from '../types';

interface ResultsTableProps {
  results: AnalysisResult[];
}

export const ResultsTable: React.FC<ResultsTableProps> = ({ results }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (results.length === 0) return null;

  const toggleRow = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const renderDiff = (diffs: DiffItem[]) => {
    return (
      <div className="flex flex-wrap gap-1.5 text-sm leading-relaxed p-4 bg-gray-50 rounded border border-gray-200 font-mono">
        {diffs.map((item, idx) => {
          if (item.type === 'match') {
            return <span key={idx} className="text-gray-600">{item.truth}</span>;
          }
          if (item.type === 'deletion') {
            return (
              <span key={idx} className="bg-red-100 text-red-700 px-1 rounded line-through decoration-red-500" title="Missing in OCR">
                {item.truth}
              </span>
            );
          }
          if (item.type === 'insertion') {
            return (
              <span key={idx} className="bg-red-100 text-red-700 px-1 rounded font-bold border border-red-200" title="Extra word in OCR">
                {item.ocr}
              </span>
            );
          }
          if (item.type === 'substitution') {
            return (
              <span key={idx} className="bg-orange-100 text-orange-800 px-1 rounded border border-orange-200 flex flex-col items-center justify-center leading-none py-1 mx-1">
                 <span className="line-through text-[10px] opacity-60 mb-0.5">{item.truth}</span>
                 <span className="font-bold">{item.ocr}</span>
              </span>
            );
          }
          return null;
        })}
      </div>
    );
  };

  return (
    <div className="overflow-x-auto border rounded-lg shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Pair</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">CER (No Space)</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">WER (Diff)</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Punctuation</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Para F1</th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {results.map((res) => (
            <React.Fragment key={res.pairId}>
              <tr 
                className={`hover:bg-gray-50 cursor-pointer transition-colors ${expandedId === res.pairId ? 'bg-blue-50' : ''}`}
                onClick={() => toggleRow(res.pairId)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">{res.truthFileName}</span>
                    <span className="text-xs text-gray-500">vs {res.ocrFileName}</span>
                  </div>
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${res.cer > 0.05 ? 'text-red-600' : 'text-gray-900'}`}>
                  {(res.cer * 100).toFixed(2)}%
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${res.wer > 0.1 ? 'text-red-600' : 'text-gray-900'}`}>
                  {(res.wer * 100).toFixed(2)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {(res.punctuationAccuracy * 100).toFixed(2)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {(res.paragraphF1 * 100).toFixed(2)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                   <span className="text-blue-600 hover:underline">{expandedId === res.pairId ? 'Hide' : 'Show Diff'}</span>
                </td>
              </tr>
              {expandedId === res.pairId && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 bg-gray-50">
                    <div className="mb-2 text-xs font-semibold text-gray-500 uppercase">Word Error Diff Visualization</div>
                    <div className="mb-2 text-xs text-gray-500 flex gap-4">
                       <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full"></span>Match</span>
                       <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full"></span>Missing (Line-through)</span>
                       <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-700 rounded-full"></span>Extra (Bold)</span>
                       <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-500 rounded-full"></span>Substitution</span>
                    </div>
                    {renderDiff(res.wordDiffs)}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};