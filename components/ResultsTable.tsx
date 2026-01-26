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
              <span key={idx} className="bg-red-100 text-red-700 px-1 rounded line-through decoration-red-500" title="漏读">
                {item.truth}
              </span>
            );
          }
          if (item.type === 'insertion') {
            return (
              <span key={idx} className="bg-red-100 text-red-700 px-1 rounded font-bold border border-red-200" title="多读">
                {item.ocr}
              </span>
            );
          }
          if (item.type === 'substitution') {
            return (
              <span key={idx} className="bg-orange-100 text-orange-800 px-1 rounded border border-orange-200 flex flex-col items-center justify-center leading-none py-1 mx-1" title="错误替换">
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

  // Helper component for tooltips
  const TableTooltip = ({ title, formula, values }: { title: string, formula: string, values: string }) => (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
      <div className="font-bold text-slate-100 mb-1 border-b border-slate-600 pb-1">{title}</div>
      <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 my-1">
        <span className="text-slate-400 text-right">公式:</span>
        <span className="font-mono text-amber-300">{formula}</span>
        <span className="text-slate-400 text-right">计算:</span>
        <span className="font-mono">{values}</span>
      </div>
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
    </div>
  );

  return (
    <div className="overflow-x-auto border rounded-lg shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">文件配对</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">字符错误率 (CER)</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">词错误率 (WER)</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">标点准确率</th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
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
                    <span className="text-xs text-gray-500">对比 {res.ocrFileName}</span>
                  </div>
                </td>
                
                {/* CER */}
                <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative group ${res.cer.score > 0.05 ? 'text-red-600' : 'text-gray-900'}`}>
                  <span className="border-b border-dotted border-gray-300 cursor-help">
                    {(res.cer.score * 100).toFixed(2)}%
                  </span>
                  <TableTooltip 
                    title="字符错误率 (CER)"
                    formula="编辑距离 / 真值总长度"
                    values={`${res.cer.numerator} / ${res.cer.denominator}`}
                  />
                </td>

                {/* WER */}
                <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative group ${res.wer.score > 0.1 ? 'text-red-600' : 'text-gray-900'}`}>
                  <span className="border-b border-dotted border-gray-300 cursor-help">
                    {(res.wer.score * 100).toFixed(2)}%
                  </span>
                  <TableTooltip 
                    title="词错误率 (WER)"
                    formula="(替换+插入+删除) / 真值总词数"
                    values={`(${res.wer.breakdown?.s} + ${res.wer.breakdown?.i} + ${res.wer.breakdown?.d}) / ${res.wer.denominator}`}
                  />
                </td>

                {/* Punctuation */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 relative group">
                  <span className="border-b border-dotted border-gray-300 cursor-help">
                    {(res.punctuationAccuracy.score * 100).toFixed(2)}%
                  </span>
                  <TableTooltip 
                    title="标点符号准确率"
                    formula="1 - (编辑距离 / 标点总数)"
                    values={`1 - (${res.punctuationAccuracy.numerator} / ${res.punctuationAccuracy.denominator})`}
                  />
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                   <span className="text-blue-600 hover:underline">{expandedId === res.pairId ? '收起' : '查看差异'}</span>
                </td>
              </tr>
              {expandedId === res.pairId && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 bg-gray-50">
                    <div className="mb-2 text-xs font-semibold text-gray-500 uppercase">词错误差异可视化 (WER Diff)</div>
                    <div className="mb-2 text-xs text-gray-500 flex gap-4">
                       <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full"></span>匹配</span>
                       <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full"></span>漏读 (Deletion)</span>
                       <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-700 rounded-full"></span>多读 (Insertion)</span>
                       <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-500 rounded-full"></span>错误替换 (Substitution)</span>
                    </div>
                    {renderDiff(res.wer.diffs)}
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