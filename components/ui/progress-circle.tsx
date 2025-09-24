'use client';

import { cn } from '@/lib/utils';

interface ProgressCircleProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function ProgressCircle({
  value,
  size = 120,
  strokeWidth = 8,
  showPercentage = true,
  className,
  children
}: ProgressCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  // Color gradient based on score (red → orange → green)
  const getColor = (score: number) => {
    if (score >= 100) return '#22c55e'; // green-500 - only 100% is green
    if (score >= 80) return '#f59e0b'; // amber-500
    if (score >= 60) return '#f97316'; // orange-500
    return '#ef4444'; // red-500
  };

  const color = getColor(value);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted-foreground/20"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{
            filter: `drop-shadow(0 0 6px ${color}40)`
          }}
        />
      </svg>
      
      {/* Content overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children || (
          <>
            {showPercentage && (
              <div className="text-2xl font-bold" style={{ color }}>
                {Math.round(value)}%
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}