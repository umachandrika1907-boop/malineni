interface ErrorBannerProps {
  message: string;
  detail?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, detail, onRetry, onDismiss }: ErrorBannerProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '16px 20px',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--risk-high-bg)',
        border: '1px solid var(--risk-high-border)',
        color: 'var(--risk-high-text)',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ flexShrink: 0, marginTop: '2px' }}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>

        <div>
          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: detail ? '4px' : 0 }}>
            {message}
          </div>
          {detail && (
            <div style={{ fontSize: '13px', opacity: 0.9, lineHeight: 1.4 }}>
              {detail}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: 'rgba(244, 63, 94, 0.2)',
              color: '#ffffff',
              border: '1px solid var(--risk-high-border)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss alert"
            style={{
              padding: '6px',
              color: 'currentColor',
              opacity: 0.8,
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
