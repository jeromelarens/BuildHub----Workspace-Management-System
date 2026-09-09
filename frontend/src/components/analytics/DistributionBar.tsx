import React from 'react';
import { Card } from '../ui/Card';

export interface DistributionSegment {
  label: string;
  count: number;
  colorClass: string;
  bgClass: string;
}

export interface DistributionBarProps {
  title: string;
  subtitle?: string;
  segments: DistributionSegment[];
}

export const DistributionBar: React.FC<DistributionBarProps> = ({
  title,
  subtitle,
  segments,
}) => {
  const total = segments.reduce((sum, seg) => sum + seg.count, 0);

  return (
    <Card className="p-6 space-y-4 bg-dark-surface border-dark-borderSubtle">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
      </div>

      {total === 0 ? (
        <div className="py-6 text-center text-xs text-text-muted">No items recorded.</div>
      ) : (
        <div className="space-y-3">
          {/* Multi-segment Progress Bar */}
          <div className="h-3 w-full rounded-full bg-dark-elevated flex overflow-hidden p-0.5 gap-0.5">
            {segments.map((seg, idx) => {
              if (seg.count === 0) return null;
              const widthPct = Math.max(2, (seg.count / total) * 100);
              return (
                <div
                  key={idx}
                  style={{ width: `${widthPct}%` }}
                  className={`h-full rounded-full ${seg.bgClass} transition-all duration-300`}
                  title={`${seg.label}: ${seg.count} (${Math.round((seg.count / total) * 100)}%)`}
                />
              );
            })}
          </div>

          {/* Segment Details & Legend */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {segments.map((seg, idx) => {
              const pct = total > 0 ? Math.round((seg.count / total) * 100) : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <span className={`w-2 h-2 rounded-full ${seg.bgClass} shrink-0`} />
                    <span className="truncate">{seg.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5 pl-3.5">
                    <span className="text-base font-bold text-text-primary">{seg.count}</span>
                    <span className="text-[10px] text-text-muted">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};
