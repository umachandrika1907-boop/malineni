import type { StudentSummary } from '../../types';

interface RiskDistributionBarProps {
  students: StudentSummary[];
}

export function RiskDistributionBar({ students }: RiskDistributionBarProps) {
  const total = students.length;

  if (total === 0) {
    return (
      <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
        No student risk evaluations available to display distribution.
      </div>
    );
  }

  const highRiskCount = students.filter(
    (s) => s.risk_segment === 'HIGH_RISK' || s.risk_segment === 'CRITICAL'
  ).length;

  const medRiskCount = students.filter(
    (s) => s.risk_segment === 'MEDIUM_RISK'
  ).length;

  const lowRiskCount = students.filter(
    (s) => s.risk_segment === 'LOW_RISK' || s.risk_segment === 'SAFE'
  ).length;

  const unassessedCount = total - (highRiskCount + medRiskCount + lowRiskCount);

  const highPct = Math.round((highRiskCount / total) * 100);
  const medPct = Math.round((medRiskCount / total) * 100);
  const lowPct = Math.round((lowRiskCount / total) * 100);
  const unassessedPct = Math.max(0, 100 - (highPct + medPct + lowPct));

  return (
    <div>
      {/* Segmented bar */}
      <div
        style={{
          display: 'flex',
          height: '14px',
          width: '100%',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-subtle)',
          marginBottom: '16px',
        }}
      >
        {highPct > 0 && (
          <div
            title={`High Risk: ${highRiskCount} (${highPct}%)`}
            style={{
              width: `${highPct}%`,
              backgroundColor: 'var(--risk-high)',
              transition: 'width 0.5s ease',
            }}
          />
        )}
        {medPct > 0 && (
          <div
            title={`Medium Risk: ${medRiskCount} (${medPct}%)`}
            style={{
              width: `${medPct}%`,
              backgroundColor: 'var(--risk-med)',
              transition: 'width 0.5s ease',
            }}
          />
        )}
        {lowPct > 0 && (
          <div
            title={`Low Risk: ${lowRiskCount} (${lowPct}%)`}
            style={{
              width: `${lowPct}%`,
              backgroundColor: 'var(--risk-low)',
              transition: 'width 0.5s ease',
            }}
          />
        )}
        {unassessedPct > 0 && (
          <div
            title={`Unassessed: ${unassessedCount} (${unassessedPct}%)`}
            style={{
              width: `${unassessedPct}%`,
              backgroundColor: 'var(--text-muted)',
              opacity: 0.4,
              transition: 'width 0.5s ease',
            }}
          />
        )}
      </div>

      {/* Legend & counts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--risk-high)' }} />
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>High Risk</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {highRiskCount} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({highPct}%)</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--risk-med)' }} />
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Medium Risk</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {medRiskCount} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({medPct}%)</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--risk-low)' }} />
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Low Risk</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {lowRiskCount} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({lowPct}%)</span>
            </div>
          </div>
        </div>

        {unassessedCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--text-muted)' }} />
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Unassessed</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {unassessedCount} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({unassessedPct}%)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
