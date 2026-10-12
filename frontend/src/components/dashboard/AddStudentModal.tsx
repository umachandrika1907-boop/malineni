import { useState, useEffect, type FormEvent } from 'react';
import { api, ApiRequestError } from '../../services/api';
import { useAuth } from '../../context/useAuth';
import { Modal } from '../common/Modal';
import { Spinner } from '../common/Spinner';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onRequireLogin: () => void;
}

export function AddStudentModal({
  isOpen,
  onClose,
  onSuccess,
  onRequireLogin,
}: AddStudentModalProps) {
  const { isAuthenticated, user } = useAuth();

  const [formData, setFormData] = useState({
    student_id_str: '',
    full_name: '',
    email: '',
    phone: '',
    department: 'Computer Science',
    program: 'B.Tech CSE',
    year_of_study: 1,
    current_semester: 1,
    enrollment_date: new Date().toISOString().split('T')[0],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'FACULTY' && user.department) {
      setFormData((prev) => ({ ...prev, department: user.department! }));
    }
  }, [user]);

  const canCreate = isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'FACULTY');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canCreate) {
      setError('You must be signed in as ADMIN or FACULTY to add students.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await api.students.create({
        student_id_str: formData.student_id_str.trim(),
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        department: formData.department.trim(),
        program: formData.program.trim(),
        year_of_study: Number(formData.year_of_study),
        current_semester: Number(formData.current_semester),
        enrollment_date: formData.enrollment_date,
      });

      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError('Failed to create student. Please verify the input values.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Enroll New Student" maxWidth="520px">
      {!canCreate && (
        <div
          style={{
            padding: '12px 14px',
            marginBottom: '18px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--risk-med-bg)',
            border: '1px solid var(--risk-med-border)',
            color: 'var(--risk-med-text)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <span>Adding student profiles requires an active Admin or Faculty login.</span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onRequireLogin();
            }}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              borderRadius: 'var(--radius-sm)',
              whiteSpace: 'nowrap',
            }}
          >
            Sign In Now
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '10px 12px',
            marginBottom: '16px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--risk-high-bg)',
            border: '1px solid var(--risk-high-border)',
            color: 'var(--risk-high-text)',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Student ID (e.g. 24CS001) *
            </label>
            <input
              type="text"
              required
              placeholder="24CS001"
              value={formData.student_id_str}
              onChange={(e) => setFormData({ ...formData, student_id_str: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Maya Patel"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Institutional Email *
            </label>
            <input
              type="email"
              required
              placeholder="student@univ.edu"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              placeholder="+1-555-0199"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Department *
            </label>
            <input
              type="text"
              required
              placeholder="Computer Science"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Degree Program *
            </label>
            <input
              type="text"
              required
              placeholder="B.Tech CSE"
              value={formData.program}
              onChange={(e) => setFormData({ ...formData, program: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Year (1-4) *
            </label>
            <input
              type="number"
              min={1}
              max={4}
              required
              value={formData.year_of_study}
              onChange={(e) => setFormData({ ...formData, year_of_study: Number(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Semester (1-8) *
            </label>
            <input
              type="number"
              min={1}
              max={8}
              required
              value={formData.current_semester}
              onChange={(e) => setFormData({ ...formData, current_semester: Number(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Enrollment Date *
            </label>
            <input
              type="date"
              required
              value={formData.enrollment_date}
              onChange={(e) => setFormData({ ...formData, enrollment_date: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ padding: '8px 14px', fontSize: '13px', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting || !canCreate}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: canCreate ? 'var(--primary)' : 'var(--text-muted)',
              color: '#ffffff',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)',
              cursor: canCreate ? 'pointer' : 'not-allowed',
            }}
          >
            {isSubmitting ? (
              <>
                <Spinner size={16} color="#ffffff" />
                Saving...
              </>
            ) : (
              'Save Student'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
