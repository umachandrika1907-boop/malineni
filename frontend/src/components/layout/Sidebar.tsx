import type { ActiveTab } from '../../types';
import { useAuth } from '../../context/useAuth';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  activeTab,
  onTabChange,
  isOpenMobile,
  onCloseMobile,
}: SidebarProps) {
  const { user, isAuthenticated, logout } = useAuth();

  const navItems: Array<{ id: ActiveTab; label: string; icon: string }> = (() => {
    if (user?.role === 'STUDENT') {
      return [
        { id: 'dashboard', label: 'My Performance', icon: 'grid' },
        { id: 'ai-assistant', label: 'AI Study Coach', icon: 'sparkles' },
        { id: 'simulator', label: 'What-If Forecaster', icon: 'zap' },
        { id: 'policy-copilot', label: 'Academic Policies', icon: 'book' },
      ];
    }
    if (user?.role === 'FACULTY') {
      return [
        { id: 'dashboard', label: 'Dept Dashboard', icon: 'grid' },
        { id: 'students', label: 'Dept Students', icon: 'users' },
        { id: 'analytics', label: 'Cohort Analytics', icon: 'bar-chart' },
        { id: 'interventions', label: 'Interventions', icon: 'shield-alert' },
        { id: 'ai-assistant', label: 'AI Study Coach', icon: 'sparkles' },
        { id: 'policy-copilot', label: 'Policy Copilot', icon: 'book' },
      ];
    }
    return [
      { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
      { id: 'students', label: 'Students', icon: 'users' },
      { id: 'analytics', label: 'Analytics', icon: 'bar-chart' },
      { id: 'simulator', label: 'AI Forecaster', icon: 'zap' },
      { id: 'policy-copilot', label: 'Policy Copilot', icon: 'book' },
      { id: 'ai-assistant', label: 'AI Study Coach', icon: 'sparkles' },
      { id: 'interventions', label: 'Interventions', icon: 'shield-alert' },
      { id: 'settings', label: 'Settings', icon: 'settings' },
    ];
  })();

  const handleSelectTab = (tab: ActiveTab) => {
    onTabChange(tab);
    onCloseMobile();
  };

  const renderIcon = (icon: string) => {
    switch (icon) {
      case 'grid':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
        );
      case 'users':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        );
      case 'bar-chart':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        );
      case 'zap':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        );
      case 'book':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        );
      case 'shield-alert':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
      case 'sparkles':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        );
      case 'settings':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 40,
          }}
        />
      )}

      <aside
        style={{
          width: '260px',
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 45,
          transform: isOpenMobile ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform var(--transition-normal)',
        }}
        className="sidebar-container"
      >
        <style>{`
          @media (min-width: 1024px) {
            .sidebar-container {
              transform: translateX(0) !important;
              position: sticky !important;
              height: 100vh;
              flex-shrink: 0;
            }
          }
        `}</style>

        {/* Top: Logo & Navigation */}
        <div style={{ padding: '24px 16px' }}>
          {/* Logo Brand */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '0 8px',
              marginBottom: '32px',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '18px',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              E
            </div>
            <div>
              <div
                style={{
                  fontSize: '17px',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                EduSuccess
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--primary-glow)',
                    color: 'var(--primary-light)',
                  }}
                >
                  AI
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Success Analytics
              </div>
            </div>
          </div>

          {/* Navigation links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                    boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                    transition: 'all var(--transition-fast)',
                    textAlign: 'left',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-subtle)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  <span style={{ opacity: isActive ? 1 : 0.7 }}>
                    {renderIcon(item.icon)}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: User Card / Logout */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-subtle)',
          }}
        >

          {isAuthenticated && user ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--primary-light)',
                    flexShrink: 0,
                  }}
                >
                  {user.email.substring(0, 2).toUpperCase()}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {user.email}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {user.role} {user.department ? `• ${user.department}` : ''}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void logout()}
                title="Log Out"
                aria-label="Log Out"
                style={{
                  padding: '6px',
                  color: 'var(--text-muted)',
                  borderRadius: 'var(--radius-sm)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--risk-high-text)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Signed in as Guest
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Log in to create or edit students
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
