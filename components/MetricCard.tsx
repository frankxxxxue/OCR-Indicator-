import React from 'react';

interface MetricCardProps {
  title: string;
  value: number;
  format?: 'percent' | 'decimal';
  color?: 'blue' | 'green' | 'red' | 'yellow';
  description?: string;
  inverse?: boolean; // If true, lower is better (like error rates)
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  format = 'percent',
  color = 'blue',
  description,
  inverse = false,
}) => {
  const formattedValue = format === 'percent' 
    ? `${(value * 100).toFixed(2)}%` 
    : value.toFixed(3);

  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]} flex flex-col items-center justify-center shadow-sm`}>
      <h3 className="text-sm font-semibold uppercase tracking-wider opacity-80 mb-1">{title}</h3>
      <span className="text-3xl font-bold">{formattedValue}</span>
      {description && <span className="text-xs mt-2 opacity-70 text-center">{description}</span>}
    </div>
  );
};