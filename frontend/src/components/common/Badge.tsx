import type { RiskSegment } from '../../types';

interface BadgeProps {
  variant?: 'risk' | 'role' | 'status' | 'default';
  riskSegment?: RiskSegment | null;
  role?: string;
  active?: boolean;
  text?: string;
  size?: 'sm' | 'md';
}

export function Badge({
  variant = 'risk',
  riskSegment,
  role,
  active,
  text,
  size = 'md',
}: BadgeProps) {
  let label = text || '';
  let colorStyle = {
    backgroundColor: 'var(--bg-subtle)',
    color: 'var(--text-secondary)',
    borderColor: 'var(--border-subtle)',
  };

  if (variant === 'risk') {
    switch (riskSegment) {
      case 'CRITICAL':
        label = 'Critical';
        colorStyle = {
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          color: '#f87171',
          borderColor: 'rgba(239, 68, 68, 0.45)',
        };
        break;
      case 'HIGH_RISK':
      case 'AT_RISK':
        label = 'High Risk';
        colorStyle = {
          backgroundColor: 'var(--risk-high-bg)',
          color: 'var(--risk-high-text)',
          borderColor: 'var(--risk-high-border)',
        };
        break;
      case 'MEDIUM_RISK':
      case 'NEEDS_ATTENTION':
        label = 'Medium Risk';
        colorStyle = {
          backgroundColor: 'var(--risk-med-bg)',
          color: 'var(--risk-med-text)',
          borderColor: 'var(--risk-med-border)',
        };
        break;
      case 'LOW_RISK':
      case 'ON_TRACK':
        label = 'Low Risk';
        colorStyle = {
          backgroundColor: 'var(--risk-low-bg)',
          color: 'var(--risk-low-text)',
          borderColor: 'var(--risk-low-border)',
        };
        break;
      case 'SAFE':
      case 'HIGH_PERFORMER':
        label = 'Safe';
        colorStyle = {
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          color: '#34d399',
          borderColor: 'rgba(16, 185, 129, 0.45)',
        };
        break;
      default:
        label = 'Unassessed';
        colorStyle = {
          backgroundColor: 'var(--bg-subtle)',
          color: 'var(--text-muted)',
          borderColor: 'var(--border-subtle)',
        };
    }
  } else if (variant === 'status') {
    if (active) {
      label = text || 'Active';
      colorStyle = {
        backgroundColor: 'var(--risk-low-bg)',
        color: 'var(--risk-low-text)',
        borderColor: 'var(--risk-low-border)',
      };
    } else {
      label = text || 'Inactive';
      colorStyle = {
        backgroundColor: 'var(--bg-subtle)',
        color: 'var(--text-muted)',
        borderColor: 'var(--border-subtle)',
      };
    }
  } else if (variant === 'role') {
    label = role || text || 'User';
    colorStyle = {
      backgroundColor: 'var(--info-bg)',
      color: 'var(--info-text)',
      borderColor: 'var(--info-border)',
    };
  }

  const isSmall = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: isSmall ? '2px 8px' : '3px 10px',
        fontSize: isSmall ? '11px' : '12px',
        fontWeight: 600,
        borderRadius: 'var(--radius-full)',
        border: '1px solid',
        letterSpacing: '0.02em',
        lineHeight: 1.4,
        ...colorStyle,
      }}
    >
      <span
        style={{
          width: isSmall ? '5px' : '6px',
          height: isSmall ? '5px' : '6px',
          borderRadius: '50%',
          backgroundColor: 'currentColor',
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}
