import { useState, type FormEvent } from 'react';
import { api, ApiRequestError } from '../../services/api';
import type { UserRole } from '../../types';
import { Spinner } from '../common/Spinner';

export function AdminUserProvisioning() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('FACULTY');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!email || !password || !confirmPassword) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password.length > 72) {
      setErrorMessage('Password cannot exceed 72 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      const newUser = await api.auth.register({
        email: email.trim(),
        password,
        role,
        department: department.trim() || undefined,
      });

      setSuccessMessage(
        `User account successfully created! ID: #${newUser.id} | Email: ${newUser.email} | Role: ${newUser.role}`
      );

      // Reset form
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setDepartment('');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to create user account. Please check your network connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', maxWidth: '700px', marginTop: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>
            User Account Provisioning
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Create and manage university user accounts with role-based access control.
          </p>
        </div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--primary-subtle)',
            color: 'var(--primary-light)',
            border: '1px solid var(--border-subtle)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Admin Only
        </span>
      </div>

      {successMessage && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--risk-low-bg)',
            border: '1px solid var(--risk-low-border)',
            color: 'var(--risk-low-text)',
            fontSize: '13px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--risk-high-bg)',
            border: '1px solid var(--risk-high-border)',
            color: 'var(--risk-high-text)',
            fontSize: '13px',
            marginBottom: '16px',
          }}
        >
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          <div>
            <label
              htmlFor="prov-email"
              style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}
            >
              Email Address *
            </label>
            <input
              id="prov-email"
              type="email"
              required
              placeholder="faculty.member@univ.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label
              htmlFor="prov-role"
              style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}
            >
              Assigned Role *
            </label>
            <select
              id="prov-role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-card)',
                fontSize: '13px',
              }}
            >
              <option value="FACULTY">FACULTY — Academic monitoring & student management</option>
              <option value="COUNSELOR">COUNSELOR — Interventions & advising workflows</option>
              <option value="STUDENT">STUDENT — Personal portal & AI study coaching</option>
              <option value="ADMIN">ADMIN — Full system governance & settings</option>
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="prov-dept"
            style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}
          >
            Department (Optional)
          </label>
          <input
            id="prov-dept"
            type="text"
            placeholder="e.g. Computer Science, Mathematics, Mechanical"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          <div>
            <label
              htmlFor="prov-password"
              style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}
            >
              Temporary / Initial Password * <span style={{ color: 'var(--text-muted)' }}>(min 8 chars)</span>
            </label>
            <input
              id="prov-password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label
              htmlFor="prov-confirm"
              style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}
            >
              Confirm Password *
            </label>
            <input
              id="prov-confirm"
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 20px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {isSubmitting ? (
              <>
                <Spinner size={16} color="#ffffff" />
                Provisioning User...
              </>
            ) : (
              'Create User Account'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
