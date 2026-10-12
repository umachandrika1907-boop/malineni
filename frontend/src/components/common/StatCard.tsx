import type { ReactNode } from 'react';
import { LoadingSkeleton } from './LoadingSkeleton';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  subtitle?: string;
  trend?: {
    text: string;
    positive?: boolean;
  };
  accentColor?: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyHint?: string;
}

export function StatCard({
  title,
  value,
  icon,
  subtitle,
  trend,
  accentColor = 'var(--primary)',
  isLoading = false,
  isEmpty = false,
  emptyHint,
}: StatCardProps) {
  return (
    <div
      className="glass-panel card-hover-lift"
      style={{
        padding: '22px 24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        background: `radial-gradient(circle at 90% 10%, ${accentColor}15 0%, rgba(255, 255, 255, 0.95) 70%)`,
        border: '1px solid var(--border-card)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {/* Decorative top accent glow bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3.5px',
          background: `linear-gradient(90deg, ${accentColor}, transparent 85%)`,
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {title}
          </span>
        </div>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}08)`,
            border: `1px solid ${accentColor}35`,
            boxShadow: `0 4px 12px ${accentColor}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accentColor,
            flexShrink: 0,
            transition: 'transform 200ms ease',
          }}
        >
          {icon}
        </div>
      </div>

      <div>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <LoadingSkeleton width="60%" height="32px" />
            <LoadingSkeleton width="40%" height="14px" />
          </div>
        ) : (
          <>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: isEmpty ? 'var(--text-muted)' : 'var(--text-primary)',
                letterSpacing: '-0.02em',
                marginBottom: '4px',
              }}
            >
              {isEmpty ? '0' : value}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {trend && !isEmpty && (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: trend.positive ? 'var(--risk-low-text)' : 'var(--risk-high-text)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  {trend.positive ? '↑' : '↓'} {trend.text}
                </span>
              )}
              {isEmpty && emptyHint ? (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {emptyHint}
                </span>
              ) : subtitle ? (
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {subtitle}
                </span>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
