import React from 'react';

interface ProgressBarProps {
  percent: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  percent,
  size = 'md',
  showLabel = true,
}) => {
  const clampedPercent = Math.min(Math.max(percent, 0), 100);

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
          <div
            className="bg-primary-500 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${clampedPercent}%` }}
          />
        </div>
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-gray-700 min-w-fit">
          {Math.round(clampedPercent)}%
        </span>
      )}
    </div>
  );
};

export default ProgressBar;
