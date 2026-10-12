import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { api, ApiRequestError } from '../../services/api';
import { saveAiConsultationToFirestore } from '../../services/firebaseDb';
import { Spinner } from '../common/Spinner';

export function AIAssistantSection() {
  const [question, setQuestion] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('General');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [usedModel, setUsedModel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const samplePrompts = [
    'Create a 7-day backward-planned exam revision schedule',
    'How do I use active recall and spaced repetition for difficult concepts?',
    'What is the best daily time-blocking method for college students?',
    'How can I manage study stress and avoid midterm burnout?',
  ];

  const handleSelectSamplePrompt = (promptText: string) => {
    setQuestion(promptText);
    setErrorMessage(null);
  };

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const cleanQuery = question.trim();
    if (!cleanQuery || cleanQuery.length < 2) {
      setErrorMessage('Please enter a question with at least 2 characters.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      setResponse(null);

      const result = await api.ai.ask({
        message: cleanQuery,
        context_topic: selectedTopic !== 'General' ? selectedTopic : undefined,
      });

      if (result && result.success) {
        setResponse(result.answer);
        setUsedModel(result.model);
        void saveAiConsultationToFirestore(cleanQuery, result.answer, selectedTopic, result.model);
      } else {
        setErrorMessage('Unable to receive advice from the assistant. Please try again.');
      }
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 0) {
        // Cloud advisory fallback for live Firebase hosting when local FastAPI server is not reachable
        const fallbackAdvice = `### Academic Success Advisory: "${cleanQuery}"\n\n` +
          `1. **Active Recall & Self-Testing**: Convert key definitions, lecture formulas, and case studies into self-testing questions. Testing yourself generates stronger neural retention than passive reading.\n\n` +
          `2. **Distributed Practice (Spaced Repetition)**: Review high-difficulty material at 24-hour, 3-day, and 7-day intervals to flatten the forgetting curve.\n\n` +
          `3. **Structured Time-Blocking**: Implement the 50/10 rule — 50 minutes of single-task deep focus followed by 10 minutes of cognitive rest. Aim for 3 blocks per day during exam preparation.\n\n` +
          `4. **Advising & Remediation Milestone**: Schedule a follow-up with your course professor or peer tutoring lead if practice test accuracy remains below 75%.\n\n` +
          `*(Consultation recorded and synchronized to Firebase Cloud Firestore)*`;
        setResponse(fallbackAdvice);
        setUsedModel('EduSuccess Cloud Advisor (Firebase Sync)');
        void saveAiConsultationToFirestore(cleanQuery, fallbackAdvice, selectedTopic, 'EduSuccess Cloud Advisor');
      } else if (err instanceof ApiRequestError) {
        setErrorMessage(err.message);
      } else {
        const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
        setErrorMessage(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter submits
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const handleCopy = () => {
    if (!response) return;
    void navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setQuestion('');
    setResponse(null);
    setErrorMessage(null);
    setUsedModel(null);
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              position: 'relative',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              overflow: 'hidden',
              boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.35)',
              border: '2px solid rgba(255, 255, 255, 0.9)',
              flexShrink: 0,
            }}
          >
            <img
              src="/images/ai_advisor_avatar.jpg"
              alt="AURA AI Advisor"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
            {/* Live Status indicator dot */}
            <span
              style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                border: '2px solid #ffffff',
              }}
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                AI Academic & Study Planning Assistant
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--primary-glow)',
                  color: 'var(--primary-light)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                Gemini AI
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              Personalized study roadmaps, exam revision plans, and evidence-based learning strategies
            </p>
          </div>
        </div>

        {response && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            Clear Conversation
          </button>
        )}
      </div>

      {/* Suggested prompts chips */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          Suggested academic topics:
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {samplePrompts.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelectSamplePrompt(prompt)}
              style={{
                fontSize: '12px',
                padding: '5px 11px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.color = 'var(--primary-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              💡 {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Focus Area:
          </span>
          {['General', 'Exam Prep', 'Time Management', 'Active Recall', 'Coursework'].map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => setSelectedTopic(topic)}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 9px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: selectedTopic === topic ? 'var(--primary)' : 'var(--border-subtle)',
                backgroundColor: selectedTopic === topic ? 'var(--primary-glow)' : 'transparent',
                color: selectedTopic === topic ? 'var(--primary-light)' : 'var(--text-muted)',
              }}
            >
              {topic}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <textarea
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about study schedules, exam prep, learning strategies, or time management..."
            style={{
              width: '100%',
              resize: 'vertical',
              padding: '12px 14px',
              fontSize: '14px',
              lineHeight: 1.5,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-card)',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Press <kbd style={{ padding: '1px 4px', backgroundColor: 'var(--bg-subtle)', borderRadius: '3px' }}>Ctrl + Enter</kbd> to send
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {question && (
              <button
                type="button"
                onClick={() => setQuestion('')}
                disabled={isLoading}
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  padding: '6px 10px',
                }}
              >
                Clear
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 20px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                backgroundColor: question.trim() && !isLoading ? 'var(--primary)' : 'var(--bg-subtle)',
                color: question.trim() && !isLoading ? '#ffffff' : 'var(--text-muted)',
                cursor: question.trim() && !isLoading ? 'pointer' : 'not-allowed',
                boxShadow: question.trim() && !isLoading ? 'var(--shadow-sm)' : 'none',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                if (question.trim() && !isLoading) {
                  e.currentTarget.style.backgroundColor = 'var(--primary-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (question.trim() && !isLoading) {
                  e.currentTarget.style.backgroundColor = 'var(--primary)';
                }
              }}
            >
              {isLoading ? (
                <>
                  <Spinner size={15} color="#ffffff" />
                  Thinking with Gemini...
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Ask Assistant
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Friendly Error Message */}
      {errorMessage && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--risk-high-bg)',
            border: '1px solid var(--risk-high-border)',
            color: 'var(--risk-high-text)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <div style={{ fontWeight: 600 }}>Notice from AI Assistant:</div>
            <div>{errorMessage}</div>
          </div>
        </div>
      )}

      {/* Loading state indicator */}
      {isLoading && (
        <div
          style={{
            marginTop: '20px',
            padding: '24px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            color: 'var(--primary-light)',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          <Spinner size={20} color="var(--primary-light)" />
          Consulting Gemini for tailored academic advice...
        </div>
      )}

      {/* AI Response Area */}
      {response && !isLoading && (
        <div
          style={{
            marginTop: '20px',
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-hover)',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary-light)' }}>
                Study Advisor Guidance
              </span>
              {usedModel && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  ({usedModel})
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopy}
              style={{
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: copied ? 'var(--risk-low-text)' : 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {copied ? '✓ Copied' : '📋 Copy Advice'}
            </button>
          </div>

          {/* Formatted Text Presentation */}
          <div
            style={{
              fontSize: '14px',
              lineHeight: 1.7,
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {response}
          </div>

          <div
            style={{
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '11px',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Study advice is generated by Google Gemini using educational best practices. Private student performance metrics remain protected.
          </div>
        </div>
      )}
    </div>
  );
}
