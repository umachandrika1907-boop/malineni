import { useState, useEffect } from 'react';
import type { StudentSummary, StudentDetail, GenerateActionPlanResponse } from '../../types';
import { api, ApiRequestError } from '../../services/api';
import { createCloudIntervention } from '../../services/firebaseDb';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Spinner } from '../common/Spinner';
import { TrajectorySimulator } from './TrajectorySimulator';

interface StudentDetailModalProps {
  studentSummary: StudentSummary | null;
  isOpen: boolean;
  onClose: () => void;
}

export function StudentDetailModal({
  studentSummary,
  isOpen,
  onClose,
}: StudentDetailModalProps) {
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'profile' | 'simulator'>('profile');

  // RAG Action Plan State inside modal
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planResult, setPlanResult] = useState<GenerateActionPlanResponse | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planSaved, setPlanSaved] = useState<boolean>(false);
  const [copiedMemo, setCopiedMemo] = useState<boolean>(false);

  useEffect(() => {
    if (!studentSummary || !isOpen) {
      return;
    }

    let isMounted = true;
    setPlanResult(null);
    setPlanError(null);
    setPlanSaved(false);

    api.students
      .getById(studentSummary.id)
      .then((res) => {
        if (isMounted) {
          setDetail(res.data);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to fetch student details';
          setError(msg);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [studentSummary, isOpen]);

  const handleGeneratePlan = async () => {
    if (!studentSummary) return;
    try {
      setIsGeneratingPlan(true);
      setPlanError(null);
      setPlanSaved(false);

      const res = await api.ai.generateActionPlan(studentSummary.student_id_str, {
        save_as_intervention: true,
      });

      setPlanResult(res);

      // Save to Firestore
      const primaryLead = res.retrieved_policies[0]?.contact_lead || 'Academic Counseling Office';
      await createCloudIntervention({
        student_id_str: res.student_id_str,
        student_name: res.student_name,
        type: 'ACADEMIC_TUTORING',
        severity: res.risk_segment === 'CRITICAL' || res.risk_segment === 'HIGH_RISK' ? 'HIGH' : 'MEDIUM',
        status: 'OPEN',
        notes: res.action_plan_markdown.slice(0, 300) + '...',
        action_plan: '3-Week Institutional Recovery Plan',
        assigned_to: primaryLead,
      });

      setPlanSaved(true);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setPlanError(err.message);
      } else {
        const msg = err instanceof Error ? err.message : 'Plan generation failed';
        setPlanError(msg);
      }
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleClose = () => {
    setDetail(null);
    setError(null);
    setPlanResult(null);
    setPlanError(null);
    setPlanSaved(false);
    onClose();
  };

  if (!studentSummary) return null;

  const current = detail || studentSummary;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Student Profile — ${current.student_id_str}`}
      maxWidth={modalTab === 'simulator' || planResult ? '840px' : '620px'}
    >
      {/* Sub-tab navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
        <button
          type="button"
          onClick={() => setModalTab('profile')}
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            backgroundColor: modalTab === 'profile' ? 'var(--primary)' : 'var(--bg-subtle)',
            color: modalTab === 'profile' ? '#ffffff' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          👤 Profile & Action Plan
        </button>

        <button
          type="button"
          onClick={() => setModalTab('simulator')}
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            backgroundColor: modalTab === 'simulator' ? 'var(--primary)' : 'var(--bg-subtle)',
            color: modalTab === 'simulator' ? '#ffffff' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>⚡</span>
          <span>2026 Trajectory Forecaster</span>
        </button>
      </div>

      {modalTab === 'simulator' ? (
        <TrajectorySimulator initialStudent={current} onPlanSaved={() => setPlanSaved(true)} />
      ) : isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <Spinner size={24} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--risk-med-bg)',
                border: '1px solid var(--risk-med-border)',
                color: 'var(--risk-med-text)',
                fontSize: '12px',
              }}
            >
              Notice: Full detail view requires authentication. Showing summary snapshot.
            </div>
          )}

          {/* Header block */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {current.full_name}
              </h3>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {current.program} • {current.department}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              <Badge variant="risk" riskSegment={current.risk_segment || 'SAFE'} />
              <span style={{ fontSize: '11px', color: current.is_active ? '#10b981' : '#64748b', fontWeight: 600 }}>
                ● {current.is_active ? 'Active Enrolled' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '14px',
              backgroundColor: 'var(--bg-subtle)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
            }}
          >
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                Academic Year
              </span>
              <span style={{ fontWeight: 600 }}>Year {current.year_of_study}</span>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                Current Semester
              </span>
              <span style={{ fontWeight: 600 }}>Semester {current.current_semester}</span>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                Calculated Score
              </span>
              <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                {current.total_score !== null && current.total_score !== undefined
                  ? `${Math.round(current.total_score)}% / 100`
                  : 'Pending evaluation'}
              </span>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                Data Completeness
              </span>
              <span style={{ fontWeight: 600, color: '#10b981' }}>
                {current.data_completeness_pct !== null && current.data_completeness_pct !== undefined
                  ? `${current.data_completeness_pct}%`
                  : 'N/A'}
              </span>
            </div>

            {detail && (
              <>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                    Email
                  </span>
                  <span style={{ fontWeight: 500 }}>{detail.email}</span>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                    Enrollment Date
                  </span>
                  <span style={{ fontWeight: 500 }}>{detail.enrollment_date}</span>
                </div>
              </>
            )}
          </div>

          {/* RAG Generator Error */}
          {planError && (
            <div style={{ padding: '8px 12px', borderRadius: '4px', backgroundColor: 'var(--risk-high-bg)', color: 'var(--risk-high-text)', fontSize: '12px' }}>
              {planError}
            </div>
          )}

          {/* RAG Generated Plan Display */}
          {planResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>
                  ✓ Official Institutional Recovery Directive {planSaved && '& Synced to Cloud Firestore'}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(planResult.action_plan_markdown);
                      setCopiedMemo(true);
                      setTimeout(() => setCopiedMemo(false), 2000);
                    }}
                    style={{
                      padding: '3px 8px',
                      fontSize: '11px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-card)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {copiedMemo ? '✓ Copied!' : '📋 Copy Memo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    style={{
                      padding: '3px 8px',
                      fontSize: '11px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-card)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    🖨️ Print
                  </button>
                </div>
              </div>

              <div
                style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  padding: '12px',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-card)',
                  fontSize: '12px',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                  color: 'var(--text-primary)',
                }}
              >
                {planResult.action_plan_markdown}
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
            <button
              type="button"
              onClick={handleGeneratePlan}
              disabled={isGeneratingPlan}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                color: '#ffffff',
                border: 'none',
                cursor: isGeneratingPlan ? 'not-allowed' : 'pointer',
              }}
            >
              {isGeneratingPlan ? (
                <>
                  <Spinner size={14} color="#ffffff" />
                  Generating RAG Plan...
                </>
              ) : (
                '⚡ Generate AI Action Plan'
              )}
            </button>

            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
