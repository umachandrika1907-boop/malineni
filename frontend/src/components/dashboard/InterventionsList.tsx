import { useState, useEffect, type FormEvent } from 'react';
import {
  type CloudIntervention,
  getCloudInterventions,
  createCloudIntervention,
  updateCloudInterventionStatus,
  subscribeToInterventions,
} from '../../services/firebaseDb';
import { api, ApiRequestError } from '../../services/api';
import type { GenerateActionPlanResponse } from '../../types';
import { Spinner } from '../common/Spinner';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

export function InterventionsList() {
  const [interventions, setInterventions] = useState<CloudIntervention[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form state
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [type, setType] = useState<CloudIntervention['type']>('ACADEMIC_TUTORING');
  const [severity, setSeverity] = useState<CloudIntervention['severity']>('MEDIUM');
  const [notes, setNotes] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // RAG Action Plan Generator state
  const [isRagModalOpen, setIsRagModalOpen] = useState(false);
  const [ragStudentId, setRagStudentId] = useState('24CS001');
  const [isGeneratingRag, setIsGeneratingRag] = useState(false);
  const [ragResult, setRagResult] = useState<GenerateActionPlanResponse | null>(null);
  const [ragError, setRagError] = useState<string | null>(null);
  const [ragSuccessMsg, setRagSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    // Initial fetch
    getCloudInterventions()
      .then((items) => {
        if (isMounted) {
          setInterventions(items);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    // Real-time live Firestore subscription
    const unsubscribe = subscribeToInterventions((updatedItems) => {
      if (isMounted) {
        setInterventions(updatedItems);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!studentId.trim() || !studentName.trim() || !notes.trim()) {
      setFormError('Please fill in Student ID, Student Name, and Case Notes.');
      return;
    }

    try {
      setIsCreating(true);
      setFormError(null);

      const created = await createCloudIntervention({
        student_id_str: studentId.trim(),
        student_name: studentName.trim(),
        type,
        severity,
        status: 'OPEN',
        notes: notes.trim(),
        action_plan: actionPlan.trim() || undefined,
        assigned_to: assignedTo.trim() || 'Academic Counseling Office',
      });

      // Prepend locally for immediate response
      setInterventions((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);

      // Reset form
      setStudentId('');
      setStudentName('');
      setNotes('');
      setActionPlan('');
      setAssignedTo('');
      setIsFormOpen(false);
    } catch {
      setFormError('Failed to save intervention to cloud. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED') => {
    // Optimistic update
    setInterventions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
    await updateCloudInterventionStatus(id, newStatus);
  };

  // RAG Action Plan Trigger
  const handleGenerateRagPlan = async (targetStudentId?: string) => {
    const idToQuery = (targetStudentId || ragStudentId).trim();
    if (!idToQuery) {
      setRagError('Please enter a valid Student ID (e.g. 24CS001).');
      return;
    }

    try {
      setIsGeneratingRag(true);
      setRagError(null);
      setRagSuccessMsg(null);

      const plan = await api.ai.generateActionPlan(idToQuery, {
        save_as_intervention: true,
      });

      setRagResult(plan);

      // Automatically sync new intervention directly into Cloud Firestore
      const primaryLead = plan.retrieved_policies[0]?.contact_lead || 'Dean of Academic Affairs';
      const severityLevel: CloudIntervention['severity'] =
        plan.risk_segment === 'CRITICAL' || plan.risk_segment === 'HIGH_RISK' ? 'HIGH' : 'MEDIUM';

      const excerpt = plan.action_plan_markdown.slice(0, 280) + '...';

      const cloudSaved = await createCloudIntervention({
        student_id_str: plan.student_id_str,
        student_name: plan.student_name,
        type: 'ACADEMIC_TUTORING',
        severity: severityLevel,
        status: 'OPEN',
        notes: `[RAG ${plan.risk_segment}] ${excerpt}`,
        action_plan: `3-Week Structured Recovery Plan (${plan.retrieved_policies.length} institutional policies cited)`,
        assigned_to: primaryLead,
      });

      // Update local list
      setInterventions((prev) => [cloudSaved, ...prev.filter((item) => item.id !== cloudSaved.id)]);
      setRagSuccessMsg(
        `Action plan generated and synced live to Cloud Firestore & PostgreSQL database! (Case ID: ${cloudSaved.id})`
      );
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setRagError(err.message);
      } else {
        const msg = err instanceof Error ? err.message : 'Plan generation failed';
        setRagError(`RAG Advisor Error: ${msg}`);
      }
    } finally {
      setIsGeneratingRag(false);
    }
  };

  const filteredItems = interventions.filter((item) => {
    if (filterStatus === 'ALL') return true;
    return item.status === filterStatus;
  });

  const activeCount = interventions.filter((i) => i.status !== 'RESOLVED').length;
  const highRiskCount = interventions.filter((i) => i.severity === 'HIGH' && i.status !== 'RESOLVED').length;
  const resolvedCount = interventions.filter((i) => i.status === 'RESOLVED').length;

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
      {/* Header section */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Recent Interventions & Action Plans
            </h2>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                }}
              />
              Firebase Firestore Live
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Live advisor cases, remediation milestones, and counseling referrals synced in real-time.
          </p>
        </div>

        {/* Top Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Generate AI Intervention Plan CTA */}
          <button
            type="button"
            onClick={() => {
              setIsRagModalOpen(true);
              setRagResult(null);
              setRagError(null);
              setRagSuccessMsg(null);
            }}
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
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
              transition: 'opacity var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1.0')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Generate AI Intervention Plan
          </button>

          {/* New Manual Intervention CTA */}
          <button
            type="button"
            onClick={() => setIsFormOpen(!isFormOpen)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: 'var(--radius-md)',
              backgroundColor: isFormOpen ? 'var(--bg-subtle)' : 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-card)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              {isFormOpen ? (
                <line x1="18" y1="6" x2="6" y2="18" />
              ) : (
                <>
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </>
              )}
            </svg>
            {isFormOpen ? 'Close Form' : 'Manual Entry'}
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Cases</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{activeCount}</div>
        </div>
        <div style={{ padding: '12px 14px', backgroundColor: 'var(--risk-high-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--risk-high-border)' }}>
          <div style={{ fontSize: '11px', color: 'var(--risk-high-text)', textTransform: 'uppercase', fontWeight: 600 }}>High Severity Alerts</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--risk-high-text)', marginTop: '2px' }}>{highRiskCount}</div>
        </div>
        <div style={{ padding: '12px 14px', backgroundColor: 'var(--risk-low-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--risk-low-border)' }}>
          <div style={{ fontSize: '11px', color: 'var(--risk-low-text)', textTransform: 'uppercase', fontWeight: 600 }}>Resolved Milestones</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--risk-low-text)', marginTop: '2px' }}>{resolvedCount}</div>
        </div>
      </div>

      {/* Manual Intervention Form Drawer */}
      {isFormOpen && (
        <form
          onSubmit={handleCreate}
          style={{
            padding: '18px',
            marginBottom: '22px',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
              Record New Academic Intervention Plan
            </span>
            <button
              type="button"
              onClick={() => {
                if (studentId.trim()) {
                  setRagStudentId(studentId.trim());
                }
                setIsRagModalOpen(true);
              }}
              style={{
                fontSize: '12px',
                color: 'var(--primary-light)',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              Need inspiration? Use AI Recovery Advisor ↗
            </button>
          </div>

          {formError && (
            <div style={{ padding: '8px 12px', borderRadius: '4px', backgroundColor: 'var(--risk-high-bg)', color: 'var(--risk-high-text)', fontSize: '12px' }}>
              {formError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Student ID *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 24CS001"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                style={{ width: '100%', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Student Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Aarav Sharma"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                style={{ width: '100%', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Intervention Category
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-card)',
                  fontSize: '13px',
                }}
              >
                <option value="ACADEMIC_TUTORING">Academic Tutoring</option>
                <option value="ATTENDANCE_WARNING">Attendance Remediation</option>
                <option value="MENTAL_HEALTH">Wellness & Counseling Check-in</option>
                <option value="CAREER_COUNSELING">Career Mentorship</option>
                <option value="FINANCIAL_AID">Financial / Resource Assistance</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Severity Level
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as CloudIntervention['severity'])}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-card)',
                  fontSize: '13px',
                }}
              >
                <option value="HIGH">High Severity (Immediate Action)</option>
                <option value="MEDIUM">Medium Severity (Monitored)</option>
                <option value="LOW">Low Severity (Advisory)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Advisor Diagnosis & Observations *
            </label>
            <textarea
              required
              rows={2}
              placeholder="Document early warning triggers, student feedback, or course performance deficits..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: '100%', fontSize: '13px', padding: '8px 12px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Action Plan & Milestones
              </label>
              <input
                type="text"
                placeholder="e.g. Attend twice-weekly tutoring sessions and complete LMS quizzes"
                value={actionPlan}
                onChange={(e) => setActionPlan(e.target.value)}
                style={{ width: '100%', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Assigned Advisor / Counselor
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. Sarah Jenkins"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                style={{ width: '100%', fontSize: '13px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              style={{
                padding: '7px 14px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 18px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {isCreating ? (
                <>
                  <Spinner size={14} color="#ffffff" />
                  Saving to Cloud...
                </>
              ) : (
                'Save Intervention'
              )}
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginRight: '4px' }}>Filter:</span>
        {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilterStatus(status)}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 500,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: filterStatus === status ? 'var(--primary)' : 'var(--bg-subtle)',
              color: filterStatus === status ? '#ffffff' : 'var(--text-secondary)',
              border: '1px solid var(--border-card)',
            }}
          >
            {status === 'ALL' ? 'All Cases' : status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Interventions List */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
          <Spinner size={24} color="var(--primary)" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>
          No interventions match the selected filter.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredItems.map((item) => {
            const isHigh = item.severity === 'HIGH';
            const isResolved = item.status === 'RESOLVED';
            return (
              <div
                key={item.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: `1px solid ${isHigh && !isResolved ? 'var(--risk-high-border)' : 'var(--border-subtle)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'border-color var(--transition-fast)',
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                      {item.student_name}
                    </span>
                    <code style={{ fontSize: '12px', color: 'var(--primary-light)', backgroundColor: 'var(--bg-surface)', padding: '1px 6px', borderRadius: '3px' }}>
                      {item.student_id_str}
                    </code>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 7px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor:
                          item.severity === 'HIGH'
                            ? 'var(--risk-high-bg)'
                            : item.severity === 'MEDIUM'
                            ? 'var(--risk-med-bg)'
                            : 'var(--risk-low-bg)',
                        color:
                          item.severity === 'HIGH'
                            ? 'var(--risk-high-text)'
                            : item.severity === 'MEDIUM'
                            ? 'var(--risk-med-text)'
                            : 'var(--risk-low-text)',
                        fontWeight: 600,
                      }}
                    >
                      {item.severity} SEVERITY
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Status:</span>
                    <select
                      value={item.status}
                      onChange={(e) =>
                        item.id && handleStatusChange(item.id, e.target.value as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED')
                      }
                      style={{
                        padding: '3px 8px',
                        fontSize: '12px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-surface)',
                        color: isResolved ? 'var(--risk-low-text)' : 'var(--text-primary)',
                        border: '1px solid var(--border-card)',
                        fontWeight: 600,
                      }}
                    >
                      <option value="OPEN">Open Case</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                    </select>
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {item.notes}
                </div>

                {item.action_plan && (
                  <div style={{ fontSize: '12px', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 11 12 14 22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                    Action Plan: {item.action_plan}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <span>Advisor: {item.assigned_to || 'Assigned Staff'}</span>
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RAG Institutional Knowledge Advisor Modal */}
      <Modal
        isOpen={isRagModalOpen}
        onClose={() => setIsRagModalOpen(false)}
        title="Institutional RAG Advisor — 3-Week Recovery Plan Generator"
        maxWidth="750px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Semantically queries institutional remediation policies, tutoring schedules, attendance regulations,
            and counseling guidelines. Gemini LLM produces a structured, actionable 21-day recovery roadmap.
          </p>

          {/* Student Selector Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                Target Student ID
              </label>
              <input
                type="text"
                value={ragStudentId}
                onChange={(e) => setRagStudentId(e.target.value)}
                placeholder="e.g. 24CS001"
                style={{ width: '100%', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quick Select:</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['24CS001', '24CS002'].map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setRagStudentId(id);
                      void handleGenerateRagPlan(id);
                    }}
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: ragStudentId === id ? 'var(--primary)' : 'var(--bg-surface)',
                      color: ragStudentId === id ? '#ffffff' : 'var(--text-primary)',
                      border: '1px solid var(--border-card)',
                    }}
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleGenerateRagPlan()}
              disabled={isGeneratingRag || !ragStudentId.trim()}
              style={{
                alignSelf: 'flex-end',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                color: '#ffffff',
                border: 'none',
                cursor: isGeneratingRag ? 'not-allowed' : 'pointer',
              }}
            >
              {isGeneratingRag ? (
                <>
                  <Spinner size={14} color="#ffffff" />
                  Retrieving & Generating...
                </>
              ) : (
                'Generate Recovery Plan'
              )}
            </button>
          </div>

          {ragError && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--risk-high-bg)', border: '1px solid var(--risk-high-border)', color: 'var(--risk-high-text)', fontSize: '12px' }}>
              {ragError}
            </div>
          )}

          {ragSuccessMsg && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#10b981', fontSize: '12px' }}>
              ✓ {ragSuccessMsg}
            </div>
          )}

          {/* RAG Generated Result Details */}
          {ragResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '6px' }}>
              {/* Header metadata summary */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div>
                  <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
                    {ragResult.student_name}
                  </strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                    ({ragResult.student_id_str})
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Badge variant="risk" riskSegment={ragResult.risk_segment} size="sm" />
                  {ragResult.model_used && (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-surface)', padding: '2px 6px', borderRadius: '3px' }}>
                      {ragResult.model_used}
                    </span>
                  )}
                </div>
              </div>

              {/* Retrieved Policies Cards */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Retrieved Institutional Policies & Resources ({ragResult.retrieved_policies.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                  {ragResult.retrieved_policies.map((p) => (
                    <div
                      key={p.doc_id}
                      style={{
                        padding: '10px',
                        backgroundColor: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '11px',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--primary-light)' }}>
                        [{p.doc_id}] {p.title}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                        📍 {p.location}
                      </div>
                      <div style={{ color: 'var(--text-muted)', marginTop: '1px' }}>
                        🕒 {p.schedule}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3-Week Action Plan Text Box */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Structured 3-Week Action Plan & Counseling Notes
                </div>
                <div
                  style={{
                    maxHeight: '320px',
                    overflowY: 'auto',
                    padding: '14px',
                    backgroundColor: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-card)',
                    fontSize: '12px',
                    lineHeight: 1.6,
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'ui-monospace, monospace',
                  }}
                >
                  {ragResult.action_plan_markdown}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => setIsRagModalOpen(false)}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                color: 'var(--text-primary)',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Export InterventionsView alias for full architectural alignment
export const InterventionsView = InterventionsList;
