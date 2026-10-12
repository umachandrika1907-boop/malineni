import type { StudentSummary } from '../../types';

interface PerformanceChartProps {
  students: StudentSummary[];
}

export function PerformanceChart({ students }: PerformanceChartProps) {
  if (students.length === 0) {
    return (
      <div
        style={{
          height: '200px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '13px',
          textAlign: 'center',
          padding: '20px',
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '8px', opacity: 0.5 }}>
          <path d="M18 20V10" />
          <path d="M12 20V4" />
          <path d="M6 20v-6" />
        </svg>
        No performance records loaded yet.
      </div>
    );
  }

  // Calculate score tiers
  const tiers = [
    { label: '85 - 100', name: 'Excellent', count: 0, color: '#10b981' },
    { label: '70 - 84', name: 'Good', count: 0, color: '#6366f1' },
    { label: '55 - 69', name: 'Average', count: 0, color: '#f59e0b' },
    { label: '< 55', name: 'At Risk', count: 0, color: '#f43f5e' },
    { label: 'N/A', name: 'Pending', count: 0, color: '#64748b' },
  ];

  students.forEach((student) => {
    const score = student.total_score;
    if (score === null || score === undefined) {
      tiers[4].count += 1;
    } else if (score >= 85) {
      tiers[0].count += 1;
    } else if (score >= 70) {
      tiers[1].count += 1;
    } else if (score >= 55) {
      tiers[2].count += 1;
    } else {
      tiers[3].count += 1;
    }
  });

  const maxCount = Math.max(...tiers.map((t) => t.count), 1);
  const chartHeight = 160;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '12px',
          height: `${chartHeight}px`,
          paddingBottom: '24px',
          borderBottom: '1px solid var(--border-subtle)',
          position: 'relative',
        }}
      >
        {tiers.map((tier) => {
          const heightPct = Math.round((tier.count / maxCount) * 100);
          const barHeightPx = Math.max(tier.count > 0 ? (heightPct * 110) / 100 : 4, 4);

          return (
            <div
              key={tier.label}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                height: '100%',
              }}
            >
              {/* Value label on top of bar */}
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: tier.count > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                  marginBottom: '6px',
                }}
              >
                {tier.count}
              </span>

              {/* Bar */}
              <div
                title={`${tier.name} (${tier.label}): ${tier.count} students`}
                style={{
                  width: '100%',
                  maxWidth: '36px',
                  height: `${barHeightPx}px`,
                  backgroundColor: tier.color,
                  borderRadius: '4px 4px 0 0',
                  opacity: tier.count > 0 ? 0.9 : 0.25,
                  transition: 'height 0.4s ease, opacity 0.2s',
                  boxShadow: tier.count > 0 ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                }}
              />

              {/* Tier Label */}
              <span
                style={{
                  position: 'absolute',
                  bottom: '2px',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                {tier.label}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
        <span>Score Range (0–100)</span>
        <span>Total Evaluated: {students.length - tiers[4].count}/{students.length}</span>
      </div>
    </div>
  );
}
