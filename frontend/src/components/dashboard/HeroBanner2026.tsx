import { useState } from 'react';

interface HeroBanner2026Props {
  onOpenUploadModal: () => void;
  onOpenDeanModal: () => void;
  onSeedBenchmark: () => void;
  isSeeding: boolean;
  totalStudents: number;
  atRiskCount: number;
  avgScore: string | null;
}

export function HeroBanner2026({
  onOpenUploadModal,
  onOpenDeanModal,
  onSeedBenchmark,
  isSeeding,
  totalStudents,
  atRiskCount,
  avgScore,
}: HeroBanner2026Props) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="hero-banner-container glass-panel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(99, 102, 241, 0.22)',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.90) 50%, rgba(238, 242, 255, 0.85) 100%)',
        boxShadow: isHovered
          ? '0 20px 40px -15px rgba(79, 70, 229, 0.22), 0 0 20px rgba(99, 102, 241, 0.12)'
          : 'var(--shadow-lg)',
        transition: 'all 350ms cubic-bezier(0.16, 1, 0.3, 1)',
        marginBottom: '28px',
        padding: '32px 36px',
      }}
    >
      {/* Background Animated Gradient Orbs */}
      <div
        style={{
          position: 'absolute',
          top: '-60px',
          right: '-40px',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, rgba(236, 72, 153, 0.10) 60%, transparent 80%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
          animation: 'pulseGlow 6s ease-in-out infinite alternate',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-50px',
          left: '20%',
          width: '240px',
          height: '240px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, rgba(16, 185, 129, 0.08) 60%, transparent 80%)',
          filter: 'blur(35px)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Grid Content */}
      <div
        className="hero-banner-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: '32px',
          alignItems: 'center',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Left Column: Headlines & CTA Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>
          {/* 2026 Live Badge Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span
              className="hero-banner-badge-pill"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(236, 72, 153, 0.12))',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--primary)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 10px #10b981',
                  animation: 'pulseGlow 2s infinite',
                }}
              />
              2026/2027 AI Early Intervention Engine
            </span>

            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#475569',
                backgroundColor: 'rgba(241, 245, 249, 0.8)',
                padding: '5px 12px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid rgba(203, 213, 225, 0.8)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span>🏆</span> KPMG Campus Challenge
            </span>
          </div>

          {/* Heading */}
          <div>
            <h1
              style={{
                fontSize: 'clamp(26px, 3.2vw, 36px)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.2,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Empowering Student Success with{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Predictive AI Intelligence
              </span>
            </h1>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                marginTop: '10px',
                maxWidth: '620px',
              }}
            >
              Synthesizing 4 core dimensions—Academic Milestones, Attendance Trajectories, LMS Digital Footprints, and Extracurricular Engagement—into proactive recovery plans before critical dropouts occur.
            </p>
          </div>

          {/* Live Platform Quick KPI Strips */}
          <div
            className="hero-banner-kpi-strip"
            style={{
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Enrolled Cohort
              </span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {totalStudents} Students
              </span>
            </div>

            <div className="hero-banner-kpi-divider" style={{ width: '1px', backgroundColor: 'var(--border-subtle)' }} />

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                At-Risk Flagged
              </span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: atRiskCount > 0 ? 'var(--risk-high-text)' : '#10b981' }}>
                {atRiskCount} Flagged
              </span>
            </div>

            <div className="hero-banner-kpi-divider" style={{ width: '1px', backgroundColor: 'var(--border-subtle)' }} />

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Cohort Avg Score
              </span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>
                {avgScore ? `${avgScore}%` : '--'}
              </span>
            </div>

            <div className="hero-banner-kpi-divider" style={{ width: '1px', backgroundColor: 'var(--border-subtle)' }} />

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Inference Latency
              </span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#0ea5e9' }}>
                ⚡ &lt;15ms
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="hero-banner-btn-group" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* 1. Seed Benchmark Button */}
            <button
              type="button"
              onClick={onSeedBenchmark}
              disabled={isSeeding}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 20px',
                fontSize: '13px',
                fontWeight: 700,
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: '#ffffff',
                boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.35)',
                transition: 'all 200ms ease',
                cursor: isSeeding ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!isSeeding) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px 0 rgba(79, 70, 229, 0.45)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(79, 70, 229, 0.35)';
              }}
            >
              <span style={{ fontSize: '15px' }}>{isSeeding ? '⏳' : '⚡'}</span>
              {isSeeding ? 'Seeding 50 Students...' : 'Seed 50 Benchmark Students'}
            </button>

            {/* 2. Ingest Custom Dataset */}
            <button
              type="button"
              onClick={onOpenUploadModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 18px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#ffffff',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-card)',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 200ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.color = 'var(--primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-card)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload Custom Dataset
            </button>

            {/* 3. Dean's Executive Briefing Dossier */}
            <button
              type="button"
              onClick={onOpenDeanModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '11px 16px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(236, 72, 153, 0.08)',
                color: '#db2777',
                border: '1px solid rgba(236, 72, 153, 0.3)',
                transition: 'all 200ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(236, 72, 153, 0.16)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(236, 72, 153, 0.08)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span>🏛️</span>
              Dean's Executive Dossier
            </button>
          </div>
        </div>

        {/* Right Column: 3D Isometric Hologram Hero Image & Floating Interactive Badges */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Main Visual Image Card with Iridescent Frame */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '480px',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(99, 102, 241, 0.28), 0 0 0 1px rgba(255, 255, 255, 0.8)',
              border: '2px solid rgba(255, 255, 255, 0.7)',
              transition: 'transform 300ms ease',
              transform: isHovered ? 'scale(1.02)' : 'scale(1)',
            }}
          >
            <img
              src="/images/hero_analytics_3d.jpg"
              alt="EduSuccess AI 3D Analytics Control Center"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                objectFit: 'cover',
                aspectRatio: '16/9',
              }}
            />

            {/* Subtle Gradient Overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, transparent 60%, rgba(15, 23, 42, 0.35) 100%)',
                pointerEvents: 'none',
              }}
            />

            {/* Card Label Bottom */}
            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                left: '14px',
                right: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#ffffff',
                textShadow: '0 2px 4px rgba(0,0,0,0.4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700 }}>
                <span style={{ color: '#06b6d4' }}>●</span> MULTI-DIMENSIONAL RETENTION MATRIX
              </div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                AUTONOMOUS V2.6
              </span>
            </div>
          </div>

          {/* Floating Pill: Gemini AI Active */}
          <div
            className="animate-float hero-banner-floating-pill"
            style={{
              position: 'absolute',
              top: '-12px',
              left: '-10px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              zIndex: 3,
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              ✨
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)' }}>Gemini AI Engine</div>
              <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>Active & Grounded</div>
            </div>
          </div>

          {/* Floating Pill: Live Real-Time Ingestion */}
          <div
            className="hero-banner-floating-pill"
            style={{
              position: 'absolute',
              bottom: '-14px',
              right: '-10px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              zIndex: 3,
              animation: 'floatGentle 4s ease-in-out infinite',
            }}
          >
            <span style={{ fontSize: '14px' }}>🛡️</span>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)' }}>RAG Recovery Advisor</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Institutional Bylaws Vector Store</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
