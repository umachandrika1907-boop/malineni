import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '../../context/useAuth';
import { api, ApiRequestError } from '../../services/api';
import type { AuthSetupStatus } from '../../types';
import { Modal } from '../common/Modal';
import { Spinner } from '../common/Spinner';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const { login, error, clearError } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [setupStatus, setSetupStatus] = useState<AuthSetupStatus | null>(null);

  const [role, setRole] = useState<'ADMIN' | 'FACULTY' | 'COUNSELOR' | 'STUDENT'>('ADMIN');

  useEffect(() => {
    if (isOpen) {
      api.auth.getSetupStatus()
        .then(setSetupStatus)
        .catch(() => setSetupStatus(null));
    }
  }, [isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessNotice(null);
    clearError();

    if (!email || !password) {
      setLocalError('Please fill in all required fields.');
      return;
    }

    if (isRegisterMode) {
      if (password.length < 8) {
        setLocalError('Password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        return;
      }

      try {
        setIsSubmitting(true);
        // Call register endpoint
        await api.auth.register({
          email: email.trim(),
          password,
          role: role || 'ADMIN',
          department: department.trim() || undefined,
        });

        setSuccessNotice('Account registered successfully! Signing in...');

        // Automatically log in
        const ok = await login(email.trim(), password);
        setIsSubmitting(false);

        if (ok) {
          onClose();
          if (onSuccess) onSuccess();
        }
      } catch (err) {
        setIsSubmitting(false);
        if (err instanceof ApiRequestError) {
          setLocalError(err.message);
        } else {
          setLocalError('Failed to register account. Please check your connection.');
        }
      }
    } else {
      // Normal Login Mode
      setIsSubmitting(true);
      const ok = await login(email.trim(), password);
      setIsSubmitting(false);

      if (ok) {
        onClose();
        if (onSuccess) onSuccess();
      }
    }
  };

  const handleClose = () => {
    clearError();
    setLocalError(null);
    setSuccessNotice(null);
    setIsRegisterMode(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isRegisterMode ? 'Create EduSuccessAI Account' : 'Sign In to EduSuccessAI'}
      maxWidth="440px"
    >
      {/* Mode toggle tabs */}
      <div
        style={{
          display: 'flex',
          backgroundColor: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '3px',
          marginBottom: '16px',
        }}
      >
        <button
          type="button"
          onClick={() => {
            setIsRegisterMode(false);
            setLocalError(null);
            clearError();
          }}
          style={{
            flex: 1,
            padding: '7px',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: !isRegisterMode ? 'var(--primary)' : 'transparent',
            color: !isRegisterMode ? '#ffffff' : 'var(--text-secondary)',
            transition: 'all var(--transition-fast)',
          }}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setIsRegisterMode(true);
            setLocalError(null);
            clearError();
          }}
          style={{
            flex: 1,
            padding: '7px',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: isRegisterMode ? 'var(--primary)' : 'transparent',
            color: isRegisterMode ? '#ffffff' : 'var(--text-secondary)',
            transition: 'all var(--transition-fast)',
          }}
        >
          {setupStatus?.needs_bootstrap ? 'Initial Setup' : 'Create Account'}
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
          {isRegisterMode
            ? 'Create an account to access student analytics and interventions.'
            : 'Enter your credentials to access protected student records and administrative features.'}
        </p>

          {successNotice && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--risk-low-bg)',
                border: '1px solid var(--risk-low-border)',
                color: 'var(--risk-low-text)',
                fontSize: '13px',
              }}
            >
              {successNotice}
            </div>
          )}

          {(localError || error) && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--risk-high-bg)',
                border: '1px solid var(--risk-high-border)',
                color: 'var(--risk-high-text)',
                fontSize: '13px',
              }}
            >
              {localError || error}
              <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.9 }}>
                Admin login: <strong style={{ color: '#fff' }}>admin@edusuccess.edu</strong> (Password: <strong style={{ color: '#fff' }}>Admin123!</strong>), or click the <strong style={{ color: 'var(--primary-light)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setIsRegisterMode(true); setLocalError(null); clearError(); }}>Create Account</strong> tab to register.
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="login-email"
              style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}
            >
              Email Address *
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              placeholder={isRegisterMode ? "e.g. name@university.edu" : "admin@edusuccess.edu"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          {isRegisterMode && (
            <div>
              <label
                htmlFor="register-role"
                style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}
              >
                Account Role *
              </label>
              <select
                id="register-role"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                style={{ width: '100%' }}
              >
                <option value="ADMIN">Administrator (Full System Access)</option>
                <option value="FACULTY">Faculty / Academic Advisor</option>
                <option value="COUNSELOR">Student Counselor</option>
                <option value="STUDENT">Student</option>
              </select>
            </div>
          )}

          {isRegisterMode && (
            <div>
              <label
                htmlFor="register-dept"
                style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}
              >
                Department (Optional)
              </label>
              <input
                id="register-dept"
                type="text"
                placeholder="e.g. Computer Science"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          )}

          <div>
            <label
              htmlFor="login-password"
              style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}
            >
              Password * {isRegisterMode && <span style={{ color: 'var(--text-muted)' }}>(min 8 chars)</span>}
            </label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          {isRegisterMode && (
            <div>
              <label
                htmlFor="confirm-password"
                style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}
              >
                Confirm Password *
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              style={{
                padding: '8px 14px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 20px',
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
                  {isRegisterMode ? 'Creating account...' : 'Signing in...'}
                </>
              ) : (
                isRegisterMode ? 'Create Account' : 'Sign In'
              )}
            </button>
          </div>
        </form>
    </Modal>
  );
}
