import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { CohortBreakdownResponse } from '../../types';
import { Spinner } from '../common/Spinner';

interface DeanExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeanExecutiveReportModal({ isOpen, onClose }: DeanExecutiveReportModalProps) {
  const [data, setData] = useState<CohortBreakdownResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    api.data
      .getCohortBreakdown()
      .then((res) => setData(res))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const todayStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          borderRadius: '16px',
          padding: '36px',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Printable Letterhead Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                }}
              >
                E
              </div>
              <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#1e293b' }}>
                EduSuccessAI Executive Briefing Dossier
              </h1>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              KPMG Campus Challenge 04 — Multi-Dimensional Student Success & Early Intervention Audit
            </p>
          </div>

          <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748b' }}>
            <div><strong>Date:</strong> {todayStr}</div>
            <div><strong>Status:</strong> Official Provost & Dean Review</div>
            <div><strong>Classification:</strong> Institutional Confidential</div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            🖨️ Print / Save Official PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 500,
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <Spinner size={32} />
          </div>
        ) : data ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Executive Highlights Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Total Evaluated
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                  {data.total_cohort_count}
                </div>
                <div style={{ fontSize: '11px', color: '#10b981' }}>Active records in database</div>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Active Academic Units
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#4f46e5', margin: '4px 0' }}>
                  {data.departments.length}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Departments monitored</div>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Urgent Attention Flags
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#ef4444', margin: '4px 0' }}>
                  {data.departments.reduce((acc, d) => acc + d.at_risk_count, 0)}
                </div>
                <div style={{ fontSize: '11px', color: '#ef4444' }}>Require advisor outreach</div>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Safe Harbor Rate
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981', margin: '4px 0' }}>
                  {data.total_cohort_count > 0
                    ? Math.round(
                        (data.departments.reduce((acc, d) => acc + d.safe_count, 0) /
                          data.total_cohort_count) *
                          100
                      )
                    : 0}
                  %
                </div>
                <div style={{ fontSize: '11px', color: '#10b981' }}>On-track for progression</div>
              </div>
            </div>

            {/* Department Breakdown Heatmap Table */}
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px', color: '#1e293b' }}>
                Cross-Department Retention & Academic Risk Heatmap
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '10px 12px' }}>Department</th>
                    <th style={{ padding: '10px 12px' }}>Enrolled</th>
                    <th style={{ padding: '10px 12px' }}>Avg Score</th>
                    <th style={{ padding: '10px 12px' }}>At Risk (Count)</th>
                    <th style={{ padding: '10px 12px' }}>Risk %</th>
                    <th style={{ padding: '10px 12px' }}>Health Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.departments.map((dept, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      }}
                    >
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{dept.department}</td>
                      <td style={{ padding: '10px 12px' }}>{dept.total_students}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: dept.avg_score >= 70 ? '#059669' : '#d97706' }}>
                        {dept.avg_score} / 100
                      </td>
                      <td style={{ padding: '10px 12px', color: dept.at_risk_count > 0 ? '#dc2626' : '#16a34a' }}>
                        {dept.at_risk_count} ({dept.critical_count} crit, {dept.high_risk_count} high)
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                        {dept.at_risk_pct}%
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor:
                              dept.health_status === 'Optimal'
                                ? '#dcfce7'
                                : dept.health_status === 'Warning'
                                ? '#fef3c7'
                                : '#fee2e2',
                            color:
                              dept.health_status === 'Optimal'
                                ? '#166534'
                                : dept.health_status === 'Warning'
                                ? '#92400e'
                                : '#991b1b',
                          }}
                        >
                          {dept.health_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Recommended Immediate Executive Directives */}
            <div style={{ backgroundColor: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>
                Key Provost Recommendations & Compliance Milestones
              </h3>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                <li>
                  <strong>Mandatory Condonation Clearance:</strong> Flagged students in Computer Science with attendance between 65% and 74.9% must submit certified medical documents before November 15, 2026.
                </li>
                <li>
                  <strong>High-Volume LMS Outreach:</strong> Students with zero weekly logins will be sent automated SMS and LMS nudge alerts via Firebase Cloud Messaging.
                </li>
                <li>
                  <strong>Free Peer Tutoring Allocation:</strong> Central Library Lab 3 peer tutoring capacity increased by 30% for Data Structures & Discrete Mathematics.
                </li>
              </ul>
            </div>

            {/* Official Sign-offs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #e2e8f0', paddingTop: '24px', marginTop: '12px' }}>
              <div style={{ textAlign: 'center', width: '200px' }}>
                <div style={{ height: '30px', borderBottom: '1px solid #94a3b8', marginBottom: '6px' }} />
                <div style={{ fontSize: '12px', fontWeight: 700 }}>Dr. Arvind Sharma</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Dean of Academic Affairs</div>
              </div>

              <div style={{ textAlign: 'center', width: '200px' }}>
                <div style={{ height: '30px', borderBottom: '1px solid #94a3b8', marginBottom: '6px' }} />
                <div style={{ fontSize: '12px', fontWeight: 700 }}>EduSuccessAI Analytics Lead</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>KPMG Campus Challenge 04</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
