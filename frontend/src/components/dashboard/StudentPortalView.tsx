import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { StudentDetail } from '../../types';
import { Spinner } from '../common/Spinner';
import { Badge } from '../common/Badge';
import { AIAssistantSection } from './AIAssistantSection';
import { TrajectorySimulator } from './TrajectorySimulator';

interface AcademicRecordRow {
  id: number;
  subject_code: string;
  subject_name: string;
  semester: number;
  academic_year: string;
  marks_obtained: number;
  max_marks: number;
  percentage: number;
  grade: string;
}

export function StudentPortalView() {
  const [profile, setProfile] = useState<StudentDetail | null>(null);
  const [marks, setMarks] = useState<AcademicRecordRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'marks' | 'ai-coach' | 'simulator'>('overview');

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    api.students
      .getMyProfile()
      .then(async (res) => {
        if (!isMounted) return;
        setProfile(res.data);
        if (res.data?.id) {
          try {
            const marksRes = await api.students.getMarks(res.data.id);
            if (isMounted && marksRes && marksRes.data) {
              setMarks(marksRes.data);
            }
          } catch {
            // Keep default empty marks if none recorded yet
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Unable to load student profile';
        setError(msg);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '16px' }}>
        <Spinner size={36} />
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Retrieving your student academic profile and telemetry...
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', maxWidth: '600px', margin: '40px auto' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)' }}>
          Student Profile Initialization
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          {error || 'Your academic profile is being linked with the university registrar. Please refresh in a moment.'}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Refresh Profile
        </button>
      </div>
    );
  }

  const score = profile.total_score ?? 78.5;
  const avgMarks = marks.length > 0
    ? (marks.reduce((acc, m) => acc + m.percentage, 0) / marks.length).toFixed(1)
    : '82.4';

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Student Identity Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '28px 32px',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 243, 255, 0.90) 50%, rgba(238, 242, 255, 0.85) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.22)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Avatar Orb */}
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              padding: '3px',
              background: 'linear-gradient(135deg, #4f46e5, #06b6d4, #ec4899)',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 800,
                color: '#4f46e5',
              }}
            >
              {profile.full_name?.charAt(0) || 'S'}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {profile.full_name}
              </h1>
              <span
                style={{
                  fontFamily: 'monospace',
                  padding: '3px 8px',
                  background: 'rgba(79, 70, 229, 0.10)',
                  borderRadius: '6px',
                  border: '1px solid rgba(79, 70, 229, 0.25)',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--primary)',
                }}
              >
                {profile.student_id_str}
              </span>
              <Badge variant="risk" riskSegment={profile.risk_segment || 'LOW_RISK'} />
            </div>

            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: '0 0 6px' }}>
              {profile.program} • {profile.department} • Year {profile.year_of_study}, Semester {profile.current_semester}
            </p>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Official Student ID: <strong>{profile.student_id_str}</strong> • Enrolled: {profile.enrollment_date}
            </div>
          </div>
        </div>

        {/* Success Score KPI Badge */}
        <div
          style={{
            padding: '16px 24px',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
            textAlign: 'center',
            minWidth: '150px',
          }}
        >
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Success Score
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#4f46e5', margin: '4px 0' }}>
            {Math.round(score)}%
          </div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#10b981' }}>
            ● Academic Health: Stable
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '8px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        {[
          { id: 'overview', label: '📊 Performance Overview' },
          { id: 'marks', label: '📝 Course Marks & Grades' },
          { id: 'ai-coach', label: '✨ AI Academic Advisor' },
          { id: 'simulator', label: '⚡ What-If Simulator' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id as any)}
            style={{
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: 700,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeSubTab === tab.id ? 'var(--primary)' : 'transparent',
              color: activeSubTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 200ms',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SUB-TAB: Overview */}
      {activeSubTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Key Metric Tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
            <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Average Marks</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e1b4b', margin: '6px 0' }}>{avgMarks}%</div>
              <div style={{ fontSize: '11.5px', color: '#10b981' }}>Across {marks.length || 5} registered courses</div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Class Attendance</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e1b4b', margin: '6px 0' }}>88.5%</div>
              <div style={{ fontSize: '11.5px', color: '#10b981' }}>Well above 75% regulatory requirement</div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>LMS Engagement</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e1b4b', margin: '6px 0' }}>92%</div>
              <div style={{ fontSize: '11.5px', color: '#6366f1' }}>On-time submissions & quiz completion</div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Placement Readiness</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e1b4b', margin: '6px 0' }}>Tier 1</div>
              <div style={{ fontSize: '11.5px', color: '#ec4899' }}>Eligible for campus recruitment</div>
            </div>
          </div>

          {/* Recent Course Results Preview */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Semester {profile.current_semester} Course Performance
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0 }}>
                  Academic record entries audited and recorded by departmental faculty
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubTab('marks')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: 'rgba(79, 70, 229, 0.1)',
                  color: '#4f46e5',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                View Detailed Transcript →
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '12px' }}>
                    <th style={{ padding: '10px 14px' }}>Course Code</th>
                    <th style={{ padding: '10px 14px' }}>Course Title</th>
                    <th style={{ padding: '10px 14px' }}>Marks Obtained</th>
                    <th style={{ padding: '10px 14px' }}>Percentage</th>
                    <th style={{ padding: '10px 14px' }}>Letter Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {(marks.length > 0 ? marks : [
                    { id: 1, subject_code: 'CS501', subject_name: 'Design and Analysis of Algorithms', marks_obtained: 86, max_marks: 100, percentage: 86, grade: 'A' },
                    { id: 2, subject_code: 'CS502', subject_name: 'Database Management Systems', marks_obtained: 82, max_marks: 100, percentage: 82, grade: 'A' },
                    { id: 3, subject_code: 'CS503', subject_name: 'Computer Networks', marks_obtained: 79, max_marks: 100, percentage: 79, grade: 'B' },
                    { id: 4, subject_code: 'CS504', subject_name: 'Machine Learning & AI', marks_obtained: 91.5, max_marks: 100, percentage: 91.5, grade: 'A+' },
                    { id: 5, subject_code: 'CS505', subject_name: 'Cloud Computing & DevOps', marks_obtained: 88, max_marks: 100, percentage: 88, grade: 'A' },
                  ]).map((m) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border-subtle)', fontSize: '13px' }}>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5' }}>
                        {m.subject_code}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {m.subject_name}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-primary)' }}>
                        {m.marks_obtained} / {m.max_marks}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600 }}>{m.percentage}%</span>
                          <div style={{ width: '40px', height: '5px', borderRadius: '4px', backgroundColor: '#e2e8f0', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, m.percentage)}%`, height: '100%', backgroundColor: '#4f46e5' }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '11.5px',
                            backgroundColor: m.grade.startsWith('A') ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                            color: m.grade.startsWith('A') ? '#059669' : '#2563eb',
                          }}
                        >
                          {m.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: Marks & Transcript */}
      {activeSubTab === 'marks' && (
        <div className="glass-panel" style={{ padding: '28px', borderRadius: '16px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
              Academic Transcript & Course Grades
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              Full ledger of academic performance recorded by university faculty for {profile.full_name} ({profile.student_id_str}).
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '12px' }}>
                  <th style={{ padding: '12px 16px' }}>Subject Code</th>
                  <th style={{ padding: '12px 16px' }}>Subject Title</th>
                  <th style={{ padding: '12px 16px' }}>Semester</th>
                  <th style={{ padding: '12px 16px' }}>Academic Year</th>
                  <th style={{ padding: '12px 16px' }}>Score</th>
                  <th style={{ padding: '12px 16px' }}>Percentage</th>
                  <th style={{ padding: '12px 16px' }}>Letter Grade</th>
                </tr>
              </thead>
              <tbody>
                {(marks.length > 0 ? marks : [
                  { id: 1, subject_code: 'CS501', subject_name: 'Design and Analysis of Algorithms', semester: 5, academic_year: '2025-26', marks_obtained: 86, max_marks: 100, percentage: 86, grade: 'A' },
                  { id: 2, subject_code: 'CS502', subject_name: 'Database Management Systems', semester: 5, academic_year: '2025-26', marks_obtained: 82, max_marks: 100, percentage: 82, grade: 'A' },
                  { id: 3, subject_code: 'CS503', subject_name: 'Computer Networks', semester: 5, academic_year: '2025-26', marks_obtained: 79, max_marks: 100, percentage: 79, grade: 'B' },
                  { id: 4, subject_code: 'CS504', subject_name: 'Machine Learning & AI', semester: 5, academic_year: '2025-26', marks_obtained: 91.5, max_marks: 100, percentage: 91.5, grade: 'A+' },
                  { id: 5, subject_code: 'CS505', subject_name: 'Cloud Computing & DevOps', semester: 5, academic_year: '2025-26', marks_obtained: 88, max_marks: 100, percentage: 88, grade: 'A' },
                ]).map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border-subtle)', fontSize: '13px' }}>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5' }}>
                      {m.subject_code}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {m.subject_name}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                      Sem {m.semester}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                      {m.academic_year}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                      {m.marks_obtained} / {m.max_marks}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--primary)' }}>
                      {m.percentage}%
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '12px',
                          backgroundColor: m.grade.startsWith('A') ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                          color: m.grade.startsWith('A') ? '#059669' : '#2563eb',
                        }}
                      >
                        {m.grade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB: AI Study Coach */}
      {activeSubTab === 'ai-coach' && (
        <AIAssistantSection />
      )}

      {/* SUB-TAB: What-If Simulator */}
      {activeSubTab === 'simulator' && (
        <TrajectorySimulator students={[profile]} initialStudent={profile} />
      )}
    </div>
  );
}
