import { StatCard } from '../common/StatCard';
import type { StudentSummary } from '../../types';

interface SummaryStatsProps {
  students: StudentSummary[];
  totalCount: number;
  isLoading: boolean;
}

export function SummaryStats({ students, totalCount, isLoading }: SummaryStatsProps) {
  // Real stats calculation based purely on database records
  const hasData = students.length > 0;

  // Students at risk (High Risk + Medium Risk)
  const atRiskCount = students.filter(
    (s) => s.risk_segment === 'HIGH_RISK' || s.risk_segment === 'CRITICAL' || s.risk_segment === 'MEDIUM_RISK'
  ).length;

  const highRiskOnlyCount = students.filter(
    (s) => s.risk_segment === 'HIGH_RISK' || s.risk_segment === 'CRITICAL'
  ).length;

  // Avg Success Score calculation
  const studentsWithScore = students.filter((s) => s.total_score !== null && s.total_score !== undefined);
  const avgScore =
    studentsWithScore.length > 0
      ? (
          studentsWithScore.reduce((acc, curr) => acc + (curr.total_score ?? 0), 0) /
          studentsWithScore.length
        ).toFixed(1)
      : null;

  // Data completeness
  const studentsWithCompleteness = students.filter(
    (s) => s.data_completeness_pct !== null && s.data_completeness_pct !== undefined
  );
  const avgCompleteness =
    studentsWithCompleteness.length > 0
      ? (
          studentsWithCompleteness.reduce((acc, curr) => acc + (curr.data_completeness_pct ?? 0), 0) /
          studentsWithCompleteness.length
        ).toFixed(0)
      : null;

  return (
    <div
      className="summary-stats-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '28px',
      }}
    >
      {/* 1. Total Students */}
      <StatCard
        title="Total Students"
        value={totalCount}
        isLoading={isLoading}
        isEmpty={totalCount === 0}
        emptyHint="No student profiles registered"
        subtitle={hasData ? `${students.filter((s) => s.is_active).length} currently active` : undefined}
        accentColor="var(--primary)"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        }
      />

      {/* 2. Students At Risk */}
      <StatCard
        title="Students At Risk"
        value={atRiskCount}
        isLoading={isLoading}
        isEmpty={!hasData || atRiskCount === 0}
        emptyHint={hasData ? "0 students flagged" : "Requires risk evaluation"}
        subtitle={
          highRiskOnlyCount > 0
            ? `${highRiskOnlyCount} high risk, ${atRiskCount - highRiskOnlyCount} medium`
            : hasData
            ? 'All evaluated students safe'
            : undefined
        }
        accentColor="var(--risk-high)"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        }
      />

      {/* 3. Average Success Score */}
      <StatCard
        title="Avg Success Score"
        value={avgScore ? `${avgScore} / 100` : '--'}
        isLoading={isLoading}
        isEmpty={avgScore === null}
        emptyHint="Scores pending evaluation"
        subtitle={
          avgScore !== null
            ? `Based on ${studentsWithScore.length} evaluated students`
            : undefined
        }
        accentColor="var(--info)"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        }
      />

      {/* 4. Data Completeness / Attendance Readiness */}
      <StatCard
        title="Data Completeness"
        value={avgCompleteness ? `${avgCompleteness}%` : '--'}
        isLoading={isLoading}
        isEmpty={avgCompleteness === null}
        emptyHint="Upload records to calculate"
        subtitle={
          avgCompleteness !== null
            ? 'Average profile metrics logged'
            : undefined
        }
        accentColor="var(--accent)"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        }
      />
    </div>
  );
}
