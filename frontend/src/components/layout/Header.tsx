import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { HealthResponse } from '../../types';
import { useAuth } from '../../context/useAuth';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenLoginModal: () => void;
  onOpenAddStudentModal: () => void;
  onOpenUploadModal?: () => void;
  onBenchmarkSeeded?: () => void;
}

export function Header({
  onOpenMobileMenu,
  onOpenLoginModal,
  onOpenAddStudentModal,
  onOpenUploadModal,
  onBenchmarkSeeded,
}: HeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(true);
  const [healthError, setHealthError] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  // 2026 Light & Colorful theme toggle (default: light)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('edusuccess_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('edusuccess_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleSeedBenchmark = async () => {
    try {
      setIsSeeding(true);
      await api.data.seedBenchmark(50);
      if (onBenchmarkSeeded) {
        onBenchmarkSeeded();
      }
    } catch (err) {
      console.error('Failed to seed benchmark cohort:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const performHealthCheck = () => {
      api.checkHealth()
        .then((res) => {
          if (isMounted) {
            setHealth(res);
            setHealthError(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setHealth(null);
            setHealthError(true);
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsCheckingHealth(false);
          }
        });
    };

    performHealthCheck();
    const interval = setInterval(performHealthCheck, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="app-header">
      {/* Left: Mobile hamburger & Page Title & KPMG Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open sidebar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
            color: 'var(--text-secondary)',
            borderRadius: 'var(--radius-sm)',
            flexShrink: 0,
          }}
          className="mobile-hamburger-btn"
        >
          <style>{`
            .mobile-hamburger-btn { display: inline-flex; }
            @media (min-width: 1024px) {
              .mobile-hamburger-btn { display: none !important; }
            }
          `}</style>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div
            style={{
              position: 'relative',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              padding: '2px',
              background: 'linear-gradient(135deg, #4f46e5, #06b6d4, #ec4899)',
              boxShadow: '0 0 10px rgba(99, 102, 241, 0.35)',
              flexShrink: 0,
            }}
          >
            <img
              src="/images/ai_advisor_avatar.jpg"
              alt="EduSuccess AI Assistant"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover',
                display: 'block',
              }}
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: '1px',
                right: '1px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                border: '2px solid #ffffff',
              }}
            />
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <h1
                className="header-title-text"
                style={{
                  fontSize: '17px',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}
              >
                {user?.role === 'STUDENT'
                  ? 'Student Portal'
                  : user?.role === 'FACULTY'
                  ? `${user.department || 'Faculty'} Portal`
                  : 'EduSuccess AI'}
              </h1>
              <span
                className="header-role-badge"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(99, 102, 241, 0.12)',
                  border: '1px solid rgba(99, 102, 241, 0.28)',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  letterSpacing: '0.02em',
                  flexShrink: 0,
                }}
              >
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#ec4899' }} />
                {user?.role === 'STUDENT'
                  ? 'Student'
                  : user?.role === 'FACULTY'
                  ? 'Faculty'
                  : 'Admin'}
              </span>
            </div>
            <p className="header-subtitle" style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.3 }}>
              {user?.role === 'STUDENT'
                ? 'Personal Academic Telemetry, Course Grades & AI Study Assistant'
                : user?.role === 'FACULTY'
                ? 'Departmental Student Success Tracking & Mark Record Entry'
                : 'Multi-Dimensional Predictive Performance & Early Intervention Platform'}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Actions, Theme Switcher & Auth */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {/* Backend health status badge */}
        <div
          className="header-health-badge"
          title="Backend server connectivity status"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 9px',
            borderRadius: 'var(--radius-full)',
            fontSize: '11px',
            fontWeight: 500,
            backgroundColor: healthError ? 'var(--risk-high-bg)' : 'var(--risk-low-bg)',
            border: `1px solid ${healthError ? 'var(--risk-high-border)' : 'var(--risk-low-border)'}`,
            color: healthError ? 'var(--risk-high-text)' : 'var(--risk-low-text)',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'currentColor',
              animation: isCheckingHealth ? 'pulseGlow 1s infinite' : 'none',
            }}
          />
          {healthError
            ? 'Offline'
            : health
            ? `API (${health.version})`
            : '...'}
        </div>

        {/* 1-Click KPMG 50 Benchmark Cohort Quick Seeder (Admin Only) */}
        {user?.role === 'ADMIN' && (
          <button
            type="button"
            className="header-desktop-action"
            onClick={handleSeedBenchmark}
            disabled={isSeeding}
            title="1-Click Seed: Generates 50 realistic benchmark students across 4 dimensions"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.12), rgba(99, 102, 241, 0.12))',
              border: '1px solid rgba(236, 72, 153, 0.35)',
              color: '#db2777',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {isSeeding ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite' }}>⚡</span>
                Seeding...
              </>
            ) : (
              <>
                <span>⚡</span>
                Seed 50 Cohort
              </>
            )}
          </button>
        )}

        {/* Batch Data Ingestion CTA (Admin Only) */}
        {user?.role === 'ADMIN' && onOpenUploadModal && (
          <button
            type="button"
            className="header-desktop-action"
            onClick={onOpenUploadModal}
            title="Batch import student records (CSV, Excel, JSON)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 13px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-card)',
              color: 'var(--text-primary)',
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.color = 'var(--primary-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-card)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload Data
          </button>
        )}

        {/* Add Student CTA (Admin & Faculty) */}
        {(user?.role === 'ADMIN' || user?.role === 'FACULTY') && (
          <button
            type="button"
            className="header-desktop-action"
            onClick={onOpenAddStudentModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 13px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              boxShadow: '0 2px 8px var(--primary-glow)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary)')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Student
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-card)',
            backgroundColor: 'var(--bg-subtle)',
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {theme === 'light' ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>

        {/* User / Login Trigger */}
        {isAuthenticated && user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                color: 'var(--primary)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
              }}
            >
              {user.role}
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-card)',
                backgroundColor: 'var(--bg-subtle)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--risk-high)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenLoginModal}
            style={{
              padding: '7px 14px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-card)',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-primary)',
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-card)')}
          >
            Log In
          </button>
        )}
      </div>
    </header>
  );
}

