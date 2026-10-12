import { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { api, ApiRequestError } from './services/api';
import type { ActiveTab, StudentSummary } from './types';

import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';

import { HeroBanner2026 } from './components/dashboard/HeroBanner2026';
import { SummaryStats } from './components/dashboard/SummaryStats';
import { StudentTable } from './components/dashboard/StudentTable';
import { RiskOverview } from './components/dashboard/RiskOverview';
import { InterventionsList } from './components/dashboard/InterventionsList';
import { PerformanceChart } from './components/charts/PerformanceChart';

import { LoginModal } from './components/dashboard/LoginModal';
import { AddStudentModal } from './components/dashboard/AddStudentModal';
import { DataUploadModal } from './components/dashboard/DataUploadModal';
import { StudentDetailModal } from './components/dashboard/StudentDetailModal';
import { AIAssistantSection } from './components/dashboard/AIAssistantSection';
import { AdminUserProvisioning } from './components/dashboard/AdminUserProvisioning';
import { TrajectorySimulator } from './components/dashboard/TrajectorySimulator';
import { PolicyCopilotSection } from './components/dashboard/PolicyCopilotSection';
import { DeanExecutiveReportModal } from './components/dashboard/DeanExecutiveReportModal';
import { ErrorBanner } from './components/common/ErrorBanner';

import { AuthPortal } from './components/auth/AuthPortal';
import { StudentPortalView } from './components/dashboard/StudentPortalView';
import { AddMarksModal } from './components/dashboard/AddMarksModal';
import { Spinner } from './components/common/Spinner';

function DashboardContent() {
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeanModalOpen, setIsDeanModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);
  const [studentForMarks, setStudentForMarks] = useState<StudentSummary | null>(null);

  // Data fetching state
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const perPage = 20;
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<{ message: string; detail?: string } | null>(null);
  const [cohortData, setCohortData] = useState<import('./types').CohortBreakdownResponse | null>(null);

  useEffect(() => {
    // If auth state is still initializing on app start, wait
    if (isAuthLoading) {
      return;
    }

    // If user is unauthenticated (e.g. after logout or guest state),
    // clear student records and do NOT request protected endpoints.
    if (!isAuthenticated) {
      setStudents([]);
      setTotalCount(0);
      setIsLoading(false);
      setFetchError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    api.students
      .list({ page: currentPage, per_page: perPage })
      .then((response) => {
        if (isMounted && response && response.success) {
          setStudents(response.data || []);
          setTotalCount(response.meta?.total ?? response.data?.length ?? 0);
          setFetchError(null);
        }
        api.data.getCohortBreakdown().then((cRes) => {
          if (isMounted && cRes && cRes.success) setCohortData(cRes);
        }).catch(() => {});
      })
      .catch((err) => {
        if (!isMounted) return;
        if (err instanceof ApiRequestError) {
          if (err.status === 401) {
            setStudents([]);
            setTotalCount(0);
            setFetchError({
              message: 'Authentication Required to View Student Records',
              detail: 'Please sign in with an Administrator, Faculty, or Counselor account to access student analytics.',
            });
          } else if (err.status === 0) {
            setStudents([]);
            setTotalCount(0);
            setFetchError({
              message: 'Unable to Connect to Backend Service',
              detail: 'The FastAPI backend at http://127.0.0.1:8000 is not responding. Please make sure the backend server is running.',
            });
          } else {
            setFetchError({
              message: err.message,
              detail: typeof err.detail === 'string' ? err.detail : undefined,
            });
          }
        } else {
          setFetchError({
            message: 'An unexpected error occurred while loading student records.',
          });
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
  }, [currentPage, perPage, isAuthenticated, isAuthLoading]);

  const refreshStudents = useCallback(async (pageToLoad: number = currentPage) => {
    if (!isAuthenticated) {
      setStudents([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setFetchError(null);

    try {
      const response = await api.students.list({ page: pageToLoad, per_page: perPage });
      if (response && response.success) {
        setStudents(response.data || []);
        setTotalCount(response.meta?.total ?? response.data?.length ?? 0);
      }
      api.data.getCohortBreakdown().then(setCohortData).catch(() => {});
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.status === 401) {
          setStudents([]);
          setTotalCount(0);
          setFetchError({
            message: 'Authentication Required to View Student Records',
            detail: 'Please sign in with an Administrator, Faculty, or Counselor account to access student analytics.',
          });
        } else if (err.status === 0) {
          setStudents([]);
          setTotalCount(0);
          setFetchError({
            message: 'Unable to Connect to Backend Service',
            detail: 'The FastAPI backend at http://127.0.0.1:8000 is not responding. Please verify that the server is online.',
          });
        } else {
          setFetchError({
            message: err.message,
            detail: typeof err.detail === 'string' ? err.detail : undefined,
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, perPage, isAuthenticated]);

  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  const atRiskCount = useMemo(() => {
    return students.filter(
      (s) => s.risk_segment === 'HIGH_RISK' || s.risk_segment === 'CRITICAL' || s.risk_segment === 'MEDIUM_RISK'
    ).length;
  }, [students]);

  const avgScore = useMemo(() => {
    const scored = students.filter((s) => s.total_score !== null && s.total_score !== undefined);
    return scored.length > 0
      ? (scored.reduce((acc, curr) => acc + (curr.total_score ?? 0), 0) / scored.length).toFixed(1)
      : null;
  }, [students]);

  const handleSeedBenchmark = async () => {
    try {
      setIsSeeding(true);
      await api.data.seedBenchmark(50);
      void refreshStudents(1);
    } catch (err) {
      console.error('Failed to seed benchmark cohort:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleStudentCreated = () => {
    setCurrentPage(1);
    void refreshStudents(1);
  };

  // Pre-Login Authentication Barrier: Unauthenticated visitors see the full AuthPortal
  if (isAuthLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 50%, #eff6ff 100%)',
          gap: '16px',
        }}
      >
        <Spinner size={36} />
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#4f46e5' }}>
          Loading EduSuccess AI Portal...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPortal />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, maxWidth: '100%', overflowX: 'hidden' }}>
        <Header
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onOpenAddStudentModal={() => setIsAddStudentModalOpen(true)}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          onBenchmarkSeeded={() => void refreshStudents(1)}
        />


        <main className="app-main-content">
          {/* Error Banner when backend call fails */}
          {fetchError && (
            <ErrorBanner
              message={fetchError.message}
              detail={fetchError.detail}
              onRetry={() => void refreshStudents(currentPage)}
              onDismiss={() => setFetchError(null)}
            />
          )}

          {/* VIEW: Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="animate-fade-in">
              {user?.role === 'STUDENT' ? (
                <StudentPortalView />
              ) : (
                <>
                  {/* 2026 Ultra-Premium Control Center Hero Banner */}
                  <HeroBanner2026
                    onOpenUploadModal={() => setIsUploadModalOpen(true)}
                    onOpenDeanModal={() => setIsDeanModalOpen(true)}
                    onSeedBenchmark={handleSeedBenchmark}
                    isSeeding={isSeeding}
                    totalStudents={totalCount}
                    atRiskCount={atRiskCount}
                    avgScore={avgScore}
                  />

                  {/* Summary Cards */}
                  <SummaryStats
                    students={students}
                    totalCount={totalCount}
                    isLoading={isLoading}
                  />

                  {/* Two Column Grid: Left Student Table, Right Charts */}
                  <div
                    className="charts-two-col-grid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
                      gap: '24px',
                      marginBottom: '28px',
                    }}
                  >
                    {/* Academic Performance Tier Chart */}
                    <div className="glass-panel" style={{ padding: '24px' }}>
                      <div style={{ marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                          {user?.role === 'FACULTY' ? `${user.department || 'Department'} Score Distribution` : 'Academic Score Distribution'}
                        </h2>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                          Student score distribution across performance tiers
                        </p>
                      </div>
                      <PerformanceChart students={students} />
                    </div>

                    {/* Risk Distribution Breakdown */}
                    <RiskOverview students={students} />
                  </div>

                  {/* 2026/2027 Predictive Intelligence Command Bar */}
                  {user?.role === 'ADMIN' && (
                    <div
                      className="glass-panel"
                      style={{
                        padding: '16px 20px',
                        marginBottom: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '14px',
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        borderRadius: 'var(--radius-lg)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--primary)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                          }}
                        >
                          ⚡
                        </div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            2026/2027 Predictive Intelligence & Regulatory Command Center
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            What-If Trajectory Simulation • RAG Policy Copilot • Dean&apos;s Printable Briefing Dossier
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => setActiveTab('simulator')}
                          style={{
                            padding: '8px 14px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--primary)',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span>⚡</span>
                          <span>What-If Forecaster</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('policy-copilot')}
                          style={{
                            padding: '8px 14px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--bg-card)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-card)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span>📖</span>
                          <span>Policy Copilot</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsDeanModalOpen(true)}
                          style={{
                            padding: '8px 14px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--bg-card)',
                            color: '#4f46e5',
                            border: '1px solid rgba(79, 70, 229, 0.3)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span>🖨️</span>
                          <span>Dean&apos;s Dossier</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* AI Study Planning Assistant */}
                  <AIAssistantSection />

                  {/* Student Performance Table */}
                  <StudentTable
                    students={students}
                    totalCount={totalCount}
                    currentPage={currentPage}
                    perPage={perPage}
                    isLoading={isLoading}
                    onPageChange={handlePageChange}
                    onSelectStudent={setSelectedStudent}
                    onOpenAddModal={() => setIsAddStudentModalOpen(true)}
                    onOpenAddMarksModal={(student) => setStudentForMarks(student)}
                    facultyDepartment={user?.role === 'FACULTY' ? user.department : null}
                  />

                  {/* Recent Interventions Section */}
                  <InterventionsList />
                </>
              )}
            </div>
          )}

          {/* VIEW: Students Directory */}
          {activeTab === 'students' && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px' }}>
                  {user?.role === 'FACULTY' ? `${user.department || 'Department'} Student Records` : 'Student Records Management'}
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {user?.role === 'FACULTY'
                    ? `View and manage students and enter marks for the ${user.department || 'assigned'} department.`
                    : 'View, filter, and add student records stored in SQLite database.'}
                </p>
              </div>

              <StudentTable
                students={students}
                totalCount={totalCount}
                currentPage={currentPage}
                perPage={perPage}
                isLoading={isLoading}
                onPageChange={handlePageChange}
                onSelectStudent={setSelectedStudent}
                onOpenAddModal={() => setIsAddStudentModalOpen(true)}
                onOpenAddMarksModal={(student) => setStudentForMarks(student)}
                facultyDepartment={user?.role === 'FACULTY' ? user.department : null}
              />
            </div>
          )}

          {/* VIEW: Analytics */}
          {activeTab === 'analytics' && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px' }}>
                    Student Analytics & Predictive Insights
                  </h1>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                    Cross-department cohort health, multi-dimensional score distributions, and early intervention predictors.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDeanModalOpen(true)}
                  style={{
                    padding: '10px 18px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--primary)',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                  }}
                >
                  <span>🖨️</span>
                  <span>Export Dean&apos;s Executive Dossier (PDF)</span>
                </button>
              </div>

              {/* Top Charts */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                  gap: '24px',
                  marginBottom: '28px',
                }}
              >
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      Performance Spectrum
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                      Calculated from weighted academic, attendance, and LMS metrics
                    </p>
                  </div>
                  <PerformanceChart students={students} />
                </div>

                <RiskOverview students={students} />
              </div>

              {/* 2026 Cross-Department Cohort Health Matrix */}
              <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      Cross-Department Retention & Health Matrix
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                      Automated institutional early-warning breakdown across academic departments
                    </p>
                  </div>
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
                    Live Cohort Audit
                  </span>
                </div>

                {cohortData && cohortData.departments.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-card)', textAlign: 'left', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '10px 12px' }}>Academic Department</th>
                          <th style={{ padding: '10px 12px' }}>Total Cohort</th>
                          <th style={{ padding: '10px 12px' }}>Average Score</th>
                          <th style={{ padding: '10px 12px' }}>At Risk Students</th>
                          <th style={{ padding: '10px 12px' }}>Retention Risk Rate</th>
                          <th style={{ padding: '10px 12px' }}>Health Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cohortData.departments.map((dept, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {dept.department}
                            </td>
                            <td style={{ padding: '12px' }}>{dept.total_students} students</td>
                            <td style={{ padding: '12px', fontWeight: 700, color: dept.avg_score >= 70 ? '#10b981' : '#f59e0b' }}>
                              {dept.avg_score} / 100
                            </td>
                            <td style={{ padding: '12px', color: dept.at_risk_count > 0 ? 'var(--risk-high-text)' : 'inherit' }}>
                              {dept.at_risk_count} ({dept.critical_count} critical, {dept.high_risk_count} high)
                            </td>
                            <td style={{ padding: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ flex: 1, maxWidth: '100px', height: '6px', borderRadius: '3px', backgroundColor: 'var(--bg-subtle)', overflow: 'hidden' }}>
                                  <div
                                    style={{
                                      width: `${Math.min(100, dept.at_risk_pct)}%`,
                                      height: '100%',
                                      backgroundColor: dept.at_risk_pct > 30 ? '#ef4444' : dept.at_risk_pct > 15 ? '#f59e0b' : '#10b981',
                                    }}
                                  />
                                </div>
                                <span style={{ fontWeight: 600, fontSize: '12px' }}>{dept.at_risk_pct}%</span>
                              </div>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <span
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  backgroundColor:
                                    dept.health_status === 'Optimal'
                                      ? 'rgba(16, 185, 129, 0.12)'
                                      : dept.health_status === 'Warning'
                                      ? 'rgba(245, 158, 11, 0.12)'
                                      : 'rgba(239, 68, 68, 0.12)',
                                  color:
                                    dept.health_status === 'Optimal'
                                      ? '#10b981'
                                      : dept.health_status === 'Warning'
                                      ? '#f59e0b'
                                      : '#ef4444',
                                  border: '1px solid currentColor',
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
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Loading departmental breakdown metrics...
                  </div>
                )}
              </div>

              {/* Architecture Notes */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
                  Analytical Architecture Notes
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', fontSize: '13px' }}>
                  <div style={{ padding: '14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--primary-light)', marginBottom: '4px' }}>
                      Composite Scoring Engine
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      Combines Academic records, Attendance logs, LMS activities, and Skill assessments using configurable weights stored in <code>score_weight_config</code>.
                    </div>
                  </div>

                  <div style={{ padding: '14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--risk-med-text)', marginBottom: '4px' }}>
                      Early Warning Thresholds
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      High risk is automatically assigned when attendance drops below 75% or total score drops below 50.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: What-If Trajectory Forecaster */}
          {activeTab === 'simulator' && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px' }}>
                  2026 Predictive AI Risk Radar & Trajectory Forecaster
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Interactive forward-looking simulator for attendance debarment clearance, LMS study velocity, and risk migration.
                </p>
              </div>

              <TrajectorySimulator
                students={students}
                onPlanSaved={() => void refreshStudents(currentPage)}
              />
            </div>
          )}

          {/* VIEW: Policy & Regulation Copilot */}
          {activeTab === 'policy-copilot' && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px' }}>
                  Autonomous Institutional Policy Copilot
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  RAG-powered conversational advisor for university academic regulations, attendance debarment ordinances, and remedial clinics.
                </p>
              </div>

              <PolicyCopilotSection />
            </div>
          )}

          {/* VIEW: Interventions */}
          {activeTab === 'interventions' && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px' }}>
                  Interventions & Advising
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Manage action plans, tutoring referrals, and counselor notes.
                </p>
              </div>

              <InterventionsList />
            </div>
          )}

          {/* VIEW: AI Assistant Dedicated View */}
          {activeTab === 'ai-assistant' && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px' }}>
                  AI Student Success & Study Coach
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Interactive AI advisor powered by Google Gemini for study strategies, scheduling, and exam preparation.
                </p>
              </div>

              <AIAssistantSection />
            </div>
          )}

          {/* VIEW: Settings */}
          {activeTab === 'settings' && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px' }}>
                  Platform Configuration & Diagnostics
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Backend integration, authentication status, and system parameters.
                </p>
              </div>

              <div className="glass-panel" style={{ padding: '24px', maxWidth: '700px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
                  Environment & Connectivity
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Backend Base URL:</span>
                    <code style={{ color: 'var(--primary-light)' }}>
                      {import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}
                    </code>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Frontend URL:</span>
                    <code>http://localhost:5173</code>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Authentication Transport:</span>
                    <span>JWT in HttpOnly Cookies (SameSite=lax)</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Session State:</span>
                    <span style={{ fontWeight: 600 }}>
                      {isAuthenticated && user
                        ? `Logged in as ${user.email} (${user.role})`
                        : 'Guest (Unauthenticated)'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Theme Mode:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const current = document.documentElement.getAttribute('data-theme');
                        const next = current === 'light' ? 'dark' : 'light';
                        document.documentElement.setAttribute('data-theme', next);
                      }}
                      style={{
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-card)',
                        color: 'var(--text-primary)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      Toggle Light / Dark Mode
                    </button>
                  </div>
                </div>
              </div>

              {/* Firebase Cloud Infrastructure & Database Card */}
              <div className="glass-panel" style={{ padding: '24px', maxWidth: '700px', marginTop: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      Firebase Cloud Infrastructure & Database
                    </h2>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                      Google Cloud Firestore real-time sync, Web Analytics, and Hosting
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      color: '#10b981',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Connected
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Firebase Project:</span>
                    <code style={{ color: 'var(--primary-light)' }}>edus-1150d</code>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Cloud Database:</span>
                    <span style={{ fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                      Google Cloud Firestore (Real-time Active)
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Live Hosting URL:</span>
                    <a
                      href="https://edus-1150d.web.app"
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--primary-light)', textDecoration: 'underline', fontWeight: 500 }}
                    >
                      https://edus-1150d.web.app ↗
                    </a>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Google Analytics:</span>
                    <span>Active (G-0PN6CP3XNS)</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Synchronized Collections:</span>
                    <span style={{ color: 'var(--text-primary)' }}>interventions, ai_consultations, system_health</span>
                  </div>
                </div>
              </div>

              {/* Administrator User Provisioning Section */}
              {isAuthenticated && user?.role === 'ADMIN' ? (
                <AdminUserProvisioning />
              ) : (
                <div className="glass-panel" style={{ padding: '20px 24px', maxWidth: '700px', marginTop: '24px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                    User Management & Account Provisioning
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
                    User creation and credential management is restricted to system administrators.
                  </p>
                  {!isAuthenticated ? (
                    <button
                      type="button"
                      onClick={() => setIsLoginModalOpen(true)}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: 600,
                        backgroundColor: 'var(--primary)',
                        color: '#ffffff',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      Sign In as Administrator
                    </button>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Signed in as {user?.role}. User provisioning requires ADMIN role.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => void refreshStudents(1)}
      />

      <AddStudentModal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        onSuccess={handleStudentCreated}
        onRequireLogin={() => setIsLoginModalOpen(true)}
      />

      <DataUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => void refreshStudents(currentPage)}
        onRequireLogin={() => {
          setIsUploadModalOpen(false);
          setIsLoginModalOpen(true);
        }}
      />

      <StudentDetailModal
        isOpen={!!selectedStudent}
        studentSummary={selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />

      <AddMarksModal
        student={studentForMarks}
        isOpen={!!studentForMarks}
        onClose={() => setStudentForMarks(null)}
        onMarksAdded={() => void refreshStudents(currentPage)}
      />

      <DeanExecutiveReportModal
        isOpen={isDeanModalOpen}
        onClose={() => setIsDeanModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
