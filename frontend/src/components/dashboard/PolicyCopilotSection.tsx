import { useState } from 'react';
import { api, ApiRequestError } from '../../services/api';
import type { PolicyQueryResponse } from '../../types';
import { Spinner } from '../common/Spinner';

export function PolicyCopilotSection() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<PolicyQueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sampleQuestions = [
    {
      icon: '⚖️',
      text: 'What are the rules and attendance percentage required to avoid examination debarment?',
    },
    {
      icon: '🎓',
      text: 'What are the remedial coaching clinic requirements for students scoring below 50%?',
    },
    {
      icon: '💻',
      text: 'What are the minimum LMS video watch hours and quiz submission requirements?',
    },
    {
      icon: '🤝',
      text: 'How can students book free peer tutoring sessions for Data Structures and core STEM courses?',
    },
    {
      icon: '🧠',
      text: 'What mental health counseling and exam anxiety accommodations are available on campus?',
    },
  ];

  const handleSearch = async (searchQuery: string) => {
    const q = searchQuery.trim();
    if (!q) return;
    setIsLoading(true);
    setError(null);
    setQuery(q);

    try {
      const res = await api.ai.queryPolicies(q, 3);
      setResponse(res);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Policy query failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Institutional Policy & Academic Regulation Copilot
            </h2>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              RAG Verified
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Authoritative institutional guidance grounded in official university regulations, attendance bylaws, and remedial statutes.
          </p>
        </div>
      </div>

      {/* Suggested Query Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
        {sampleQuestions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => void handleSearch(q.text)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 500,
              borderRadius: '999px',
              border: '1px solid var(--border-card)',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>{q.icon}</span>
            <span>{q.text}</span>
          </button>
        ))}
      </div>

      {/* Search Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSearch(query);
        }}
        style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask any question about university policies, condonation petitions, or remedial guidelines..."
          style={{
            flex: 1,
            padding: '12px 16px',
            fontSize: '14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-card)',
            backgroundColor: 'var(--bg-subtle)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            border: 'none',
            cursor: isLoading || !query.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {isLoading ? <Spinner size={16} color="#ffffff" /> : 'Search Policies'}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Search Results & LLM Synthesis */}
      {response && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fade-in">
          {/* AI Synthesized Answer Box */}
          <div
            style={{
              padding: '20px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                Official Regulatory Interpretation
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Model: {response.model_used}
              </span>
            </div>
            <div
              style={{
                fontSize: '14px',
                lineHeight: 1.6,
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {response.answer}
            </div>
          </div>

          {/* Retrieved Policy Articles */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', margin: '0 0 12px' }}>
              Referenced Institutional Documents ({response.policies.length})
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {response.policies.map((policy) => (
                <div
                  key={policy.doc_id}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(99, 102, 241, 0.15)',
                          color: 'var(--primary)',
                        }}
                      >
                        {policy.doc_id}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Relevance: {Math.round(policy.relevance_score * 100)}%
                      </span>
                    </div>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                      {policy.title}
                    </h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>
                      {policy.content}
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <div><strong>Officer Lead:</strong> {policy.contact_lead}</div>
                    <div><strong>Office:</strong> {policy.location}</div>
                    <div><strong>Hours:</strong> {policy.schedule}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
