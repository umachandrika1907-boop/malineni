import { useState, useEffect } from 'react';
import { api, ApiRequestError } from '../../services/api';
import type { StudentSummary, TrajectorySimulateResponse } from '../../types';
import { Badge } from '../common/Badge';
import { Spinner } from '../common/Spinner';

interface TrajectorySimulatorProps {
  students?: StudentSummary[];
  initialStudent?: StudentSummary | null;
  onPlanSaved?: () => void;
}

export function TrajectorySimulator({
  students = [],
  initialStudent = null,
  onPlanSaved,
}: TrajectorySimulatorProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudent?.student_id_str || (students[0]?.student_id_str ?? '')
  );

  // Sliders state
  const [attendance, setAttendance] = useState<number>(64);
  const [academics, setAcademics] = useState<number>(55);
  const [lmsLogins, setLmsLogins] = useState<number>(3);
  const [assignmentsPct, setAssignmentsPct] = useState<number>(75);

  const [currentAttendance, setCurrentAttendance] = useState<number>(64);
  const [currentAcademics, setCurrentAcademics] = useState<number>(55);
  const [currentLogins, setCurrentLogins] = useState<number>(3);

  // Result state
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [result, setResult] = useState<TrajectorySimulateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Synchronize when selected student changes
  useEffect(() => {
    if (selectedStudentId) {
      const found = students.find((s) => s.student_id_str === selectedStudentId);
      if (found) {
        const baseScore = found.total_score ?? 60;
        const baseAtt = found.risk_segment === 'HIGH_RISK' || found.risk_segment === 'CRITICAL' ? 64 : 88;
        setCurrentAttendance(baseAtt);
        setCurrentAcademics(Math.round(baseScore));
        setCurrentLogins(found.risk_segment === 'HIGH_RISK' ? 2 : 10);

        setAttendance(Math.min(100, baseAtt + 15));
        setAcademics(Math.min(100, Math.round(baseScore) + 12));
        setLmsLogins(found.risk_segment === 'HIGH_RISK' ? 8 : 14);
        setAssignmentsPct(90);
      }
    }
  }, [selectedStudentId, students]);

  // Execute simulation calculation
  useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(async () => {
      try {
        setIsSimulating(true);
        setError(null);
        const res = await api.ai.simulateTrajectory({
          student_id_str: selectedStudentId || undefined,
          current_attendance: currentAttendance,
          current_academics: currentAcademics,
          current_lms_logins: currentLogins,
          simulated_attendance: attendance,
          simulated_academics: academics,
          simulated_lms_logins: lmsLogins,
          simulated_assignments_pct: assignmentsPct,
        });
        if (!isCancelled) {
          setResult(res);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof ApiRequestError ? err.message : 'Simulation computation failed');
        }
      } finally {
        if (!isCancelled) {
          setIsSimulating(false);
        }
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [attendance, academics, lmsLogins, assignmentsPct, currentAttendance, currentAcademics, currentLogins, selectedStudentId]);

  const applyPreset = (preset: 'SAFE_HARBOR' | 'CONDONATION_ESCAPE' | 'DEANS_HONORS' | 'RESET') => {
    if (preset === 'SAFE_HARBOR') {
      setAttendance(86);
      setAcademics(78);
      setLmsLogins(12);
      setAssignmentsPct(95);
    } else if (preset === 'CONDONATION_ESCAPE') {
      setAttendance(76);
      setAcademics(65);
      setLmsLogins(8);
      setAssignmentsPct(85);
    } else if (preset === 'DEANS_HONORS') {
      setAttendance(95);
      setAcademics(92);
      setLmsLogins(18);
      setAssignmentsPct(100);
    } else {
      setAttendance(currentAttendance);
      setAcademics(currentAcademics);
      setLmsLogins(currentLogins);
      setAssignmentsPct(60);
    }
  };

  const handleSaveTrajectoryPlan = async () => {
    if (!result || !selectedStudentId) return;
    try {
      setSavedSuccess(false);
      // Create intervention note in Firestore / backend
      await api.ai.generateActionPlan(selectedStudentId, {
        save_as_intervention: true,
        custom_notes: `Targeting simulated trajectory: +${result.delta_score} score improvement via ${attendance}% attendance and ${lmsLogins} LMS sessions/wk.`,
      });
      setSavedSuccess(true);
      if (onPlanSaved) onPlanSaved();
    } catch {
      setError('Unable to save recovery plan to database.');
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              2026 Predictive AI Risk Radar & What-If Trajectory Forecaster
            </h2>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                color: 'var(--primary)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
              }}
            >
              2026/2027 Simulator
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Simulate forward-looking recovery outcomes, exam debarment escape trajectories, and score migrations.
          </p>
        </div>

        {/* Student Selector */}
        {students.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="student-sim-select" style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Cohort Student:
            </label>
            <select
              id="student-sim-select"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-card)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              {students.map((s) => (
                <option key={s.id} value={s.student_id_str}>
                  {s.student_id_str} — {s.full_name} ({s.department})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Preset Action Chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Quick Targets:</span>
        <button
          type="button"
          onClick={() => applyPreset('CONDONATION_ESCAPE')}
          style={{
            padding: '5px 12px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '999px',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            color: '#d97706',
            cursor: 'pointer',
          }}
        >
          🛡️ Clear 75% Debarment
        </button>
        <button
          type="button"
          onClick={() => applyPreset('SAFE_HARBOR')}
          style={{
            padding: '5px 12px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '999px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            color: '#059669',
            cursor: 'pointer',
          }}
        >
          ✨ Target Safe Tier (&gt;80)
        </button>
        <button
          type="button"
          onClick={() => applyPreset('DEANS_HONORS')}
          style={{
            padding: '5px 12px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '999px',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
            color: 'var(--primary)',
            cursor: 'pointer',
          }}
        >
          🏆 Dean&apos;s Honors Mastery
        </button>
        <button
          type="button"
          onClick={() => applyPreset('RESET')}
          style={{
            padding: '5px 12px',
            fontSize: '12px',
            fontWeight: 500,
            borderRadius: '999px',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          ↺ Reset
        </button>
      </div>

      {/* Main Grid: Left Controls, Right Real-Time Trajectory Output */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Controls Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Slider 1: Attendance */}
          <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label htmlFor="sim-attendance-slider" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Target Lecture & Lab Attendance:
              </label>
              <span style={{ fontSize: '14px', fontWeight: 700, color: attendance >= 75 ? '#10b981' : '#ef4444' }}>
                {attendance}% {attendance >= 75 ? '✓ Safe' : '⚠ Debarred'}
              </span>
            </div>
            <input
              id="sim-attendance-slider"
              type="range"
              min="40"
              max="100"
              value={attendance}
              onChange={(e) => setAttendance(Number(e.target.value))}
              style={{ width: '100%', accentColor: attendance >= 75 ? '#10b981' : '#ef4444' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>40% (Critical)</span>
              <span style={{ fontWeight: 600, color: '#f59e0b' }}>75% (Mandatory)</span>
              <span>100% (Perfect)</span>
            </div>
          </div>

          {/* Slider 2: Academic Exam Marks */}
          <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label htmlFor="sim-academics-slider" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Simulated Assessment Performance:
              </label>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)' }}>
                {academics}% / 100
              </span>
            </div>
            <input
              id="sim-academics-slider"
              type="range"
              min="30"
              max="100"
              value={academics}
              onChange={(e) => setAcademics(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>30%</span>
              <span>55% (Pass)</span>
              <span>80% (First Class)</span>
              <span>100%</span>
            </div>
          </div>

          {/* Slider 3: LMS Logins & Lab Study Hours */}
          <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label htmlFor="sim-lms-slider" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Weekly LMS Study & Practice Sessions:
              </label>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#06b6d4' }}>
                {lmsLogins} sessions/wk
              </span>
            </div>
            <input
              id="sim-lms-slider"
              type="range"
              min="0"
              max="20"
              value={lmsLogins}
              onChange={(e) => setLmsLogins(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#06b6d4' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>0 (Inactive)</span>
              <span>6 (Standard)</span>
              <span>14+ (High Intensity)</span>
            </div>
          </div>

          {/* Slider 4: Assignment Submissions */}
          <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label htmlFor="sim-assignment-slider" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Assignment & Lab Quiz Submissions:
              </label>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#8b5cf6' }}>
                {assignmentsPct}%
              </span>
            </div>
            <input
              id="sim-assignment-slider"
              type="range"
              min="20"
              max="100"
              value={assignmentsPct}
              onChange={(e) => setAssignmentsPct(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#8b5cf6' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>20%</span>
              <span>75% (Target)</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Output Column: Trajectory Forecast Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '24px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {error ? (
            <div style={{ color: 'var(--risk-high-text)', fontSize: '14px', padding: '16px' }}>{error}</div>
          ) : result ? (
            <div>
              {/* Score Transition Badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Risk Migration Vector
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor:
                      result.projected_risk === 'SAFE' || result.projected_risk === 'LOW_RISK'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                    color:
                      result.projected_risk === 'SAFE' || result.projected_risk === 'LOW_RISK'
                        ? '#059669'
                        : '#dc2626',
                    border: '1px solid currentColor',
                  }}
                >
                  {result.risk_transition}
                </span>
              </div>

              {/* Big Score Comparison */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-around',
                  padding: '20px',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '20px',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>CURRENT BASELINE</div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {result.current_score}
                  </div>
                  <Badge variant="risk" riskSegment={result.current_risk} size="sm" />
                </div>

                <div style={{ fontSize: '24px', color: 'var(--primary)', fontWeight: 700 }}>
                  ➔
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>PROJECTED SCORE</div>
                  <div
                    style={{
                      fontSize: '36px',
                      fontWeight: 800,
                      color: result.delta_score >= 0 ? '#10b981' : '#ef4444',
                    }}
                  >
                    {result.projected_score}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: result.delta_score >= 0 ? '#10b981' : '#ef4444' }}>
                    {result.delta_score >= 0 ? `+${result.delta_score}` : result.delta_score} pts delta
                  </div>
                </div>
              </div>

              {/* Key Recovery Milestones */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Trajectory Impact & Milestones:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {result.recovery_milestones.map((milestone, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
                      <span>{milestone}</span>
                    </div>
                  ))}
                  {result.trajectory_insights.map((insight, idx) => (
                    <div
                      key={`ins-${idx}`}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <span style={{ color: 'var(--primary)', fontWeight: 700 }}>💡</span>
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <Spinner size={24} />
            </div>
          )}

          {/* Action Button */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
            {savedSuccess ? (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                ✓ Recovery Action Plan recorded and synced to Advisor Dashboard!
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void handleSaveTrajectoryPlan()}
                disabled={isSimulating}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: isSimulating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                }}
              >
                {isSimulating ? <Spinner size={16} color="#ffffff" /> : '⚡ Commit Trajectory as Official Intervention Plan'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
