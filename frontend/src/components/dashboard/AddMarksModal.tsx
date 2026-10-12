import { useState, type FormEvent } from 'react';
import type { StudentSummary } from '../../types';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';
import { Spinner } from '../common/Spinner';

interface AddMarksModalProps {
  student: StudentSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onMarksAdded: () => void;
}

export function AddMarksModal({ student, isOpen, onClose, onMarksAdded }: AddMarksModalProps) {
  const [subjectCode, setSubjectCode] = useState('CS501');
  const [subjectName, setSubjectName] = useState('Design and Analysis of Algorithms');
  const [semester, setSemester] = useState(student?.current_semester || 5);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [marksObtained, setMarksObtained] = useState('85');
  const [maxMarks, setMaxMarks] = useState('100');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const marksNum = parseFloat(marksObtained);
    const maxMarksNum = parseFloat(maxMarks);

    if (isNaN(marksNum) || isNaN(maxMarksNum) || maxMarksNum <= 0) {
      setError('Please enter valid numeric marks.');
      return;
    }

    if (marksNum > maxMarksNum) {
      setError('Marks obtained cannot exceed max marks.');
      return;
    }

    try {
      setIsLoading(true);
      await api.students.addMarks(student.id, {
        subject_code: subjectCode.trim().toUpperCase(),
        subject_name: subjectName.trim(),
        semester: Number(semester),
        academic_year: academicYear.trim(),
        marks_obtained: marksNum,
        max_marks: maxMarksNum,
      });

      setSuccess(`Marks recorded for ${subjectCode} (${Math.round((marksNum / maxMarksNum) * 100)}%)!`);
      setTimeout(() => {
        onMarksAdded();
        onClose();
      }, 1200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to record marks.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Academic Marks & Grades">
      <div style={{ padding: '4px' }}>
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {student.full_name}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {student.program} • {student.department}
            </div>
          </div>
          <span
            style={{
              fontFamily: 'monospace',
              padding: '4px 8px',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--primary)',
            }}
          >
            {student.student_id_str}
          </span>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#dc2626',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#059669',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            ✅ {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Subject Code
              </label>
              <input
                type="text"
                required
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                placeholder="e.g. CS501"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-card)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Subject Name
              </label>
              <input
                type="text"
                required
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="e.g. Database Management Systems"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-card)',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Semester
              </label>
              <input
                type="number"
                min="1"
                max="8"
                required
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-card)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Academic Year
              </label>
              <input
                type="text"
                required
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2025-26"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-card)',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Marks Obtained
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={marksObtained}
                onChange={(e) => setMarksObtained(e.target.value)}
                placeholder="85"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-card)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Max Marks
              </label>
              <input
                type="number"
                min="1"
                required
                value={maxMarks}
                onChange={(e) => setMaxMarks(e.target.value)}
                placeholder="100"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-card)',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-card)',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {isLoading ? (
                <>
                  <Spinner size={16} />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Course Marks</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
