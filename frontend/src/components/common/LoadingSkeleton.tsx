import type { CSSProperties } from 'react';

interface LoadingSkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  style?: CSSProperties;
  className?: string;
}

export function LoadingSkeleton({
  width = '100%',
  height = '18px',
  borderRadius = 'var(--radius-sm)',
  style = {},
  className = '',
}: LoadingSkeletonProps) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, var(--bg-subtle) 25%, var(--border-card) 50%, var(--bg-subtle) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.8s infinite linear',
        ...style,
      }}
    />
  );
}
