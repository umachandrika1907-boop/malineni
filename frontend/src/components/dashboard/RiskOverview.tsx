import type { StudentSummary } from '../../types';
import { RiskDistributionBar } from '../charts/RiskDistributionBar';

interface RiskOverviewProps {
  students: StudentSummary[];
}

export function RiskOverview({ students }: RiskOverviewProps) {
  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Student Risk Segment Distribution
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
          Automated multi-factor risk categorization across current student cohort
        </p>
      </div>

      <RiskDistributionBar students={students} />

      {/* Threshold Explanation Grid */}
      <div
        style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          fontSize: '12px',
        }}
      >
        <div style={{ padding: '10px', backgroundColor: 'var(--risk-high-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--risk-high-border)' }}>
          <div style={{ fontWeight: 600, color: 'var(--risk-high-text)', marginBottom: '3px' }}>
            High Risk (Critical)
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Overall score &lt; 50% or chronic attendance deficit below 75%. Requires urgent advisor outreach.
          </div>
        </div>

        <div style={{ padding: '10px', backgroundColor: 'var(--risk-med-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--risk-med-border)' }}>
          <div style={{ fontWeight: 600, color: 'var(--risk-med-text)', marginBottom: '3px' }}>
            Medium Risk (Warning)
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Score between 50%–69% or declining LMS engagement. Eligible for tutoring or counseling.
          </div>
        </div>

        <div style={{ padding: '10px', backgroundColor: 'var(--risk-low-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--risk-low-border)' }}>
          <div style={{ fontWeight: 600, color: 'var(--risk-low-text)', marginBottom: '3px' }}>
            Low Risk (On Track)
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Overall score ≥ 70% with stable attendance and academic milestones.
          </div>
        </div>
      </div>
    </div>
  );
}
