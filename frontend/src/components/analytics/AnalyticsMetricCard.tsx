import React from 'react';
import { Card } from '../ui/Card';

export interface AnalyticsMetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  badgeText?: string;
  badgeVariant?: 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'default';
  onClick?: () => void;
}

export const AnalyticsMetricCard: React.FC<AnalyticsMetricCardProps> = ({
  label,
  value,
  icon,
  subtitle,
  badgeText,
  badgeVariant = 'default',
  onClick,
}) => {
  const getBadgeClass = () => {
    switch (badgeVariant) {
      case 'brand':
        return 'bg-brand/15 text-brand border-brand/30';
      case 'success':
        return 'bg-status-success/15 text-status-success border-status-success/30';
      case 'warning':
        return 'bg-status-warning/15 text-status-warning border-status-warning/30';
      case 'danger':
        return 'bg-status-danger/15 text-status-danger border-status-danger/30';
      case 'info':
        return 'bg-status-info/15 text-status-info border-status-info/30';
      default:
        return 'bg-dark-elevated text-text-muted border-dark-border';
    }
  };

  return (
    <Card
      onClick={onClick}
      className={`p-5 transition-all duration-200 border-dark-borderSubtle bg-dark-surface ${
        onClick ? 'cursor-pointer hover:border-brand/40 hover:bg-dark-surface/90' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
            {label}
          </span>
          <div className="text-2xl font-bold text-text-primary tracking-tight">{value}</div>
        </div>

        <div className="p-2.5 rounded-xl bg-dark-elevated border border-dark-borderSubtle shrink-0">
          {icon}
        </div>
      </div>

      {(subtitle || badgeText) && (
        <div className="mt-3 pt-3 border-t border-dark-borderSubtle/60 flex items-center justify-between text-xs">
          {subtitle && <span className="text-text-muted truncate">{subtitle}</span>}
          {badgeText && (
            <span
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${getBadgeClass()}`}
            >
              {badgeText}
            </span>
          )}
        </div>
      )}
    </Card>
  );
};
