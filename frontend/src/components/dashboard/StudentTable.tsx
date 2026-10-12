import { useState, useMemo } from 'react';
import type { StudentSummary } from '../../types';
import { Badge } from '../common/Badge';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { EmptyState } from '../common/EmptyState';

interface StudentTableProps {
  students: StudentSummary[];
  totalCount: number;
  currentPage: number;
  perPage: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onSelectStudent: (student: StudentSummary) => void;
  onOpenAddModal: () => void;
  onOpenAddMarksModal?: (student: StudentSummary) => void;
  facultyDepartment?: string | null;
}

function getStudentAvatarGradient(name: string): string {
  const gradients = [
    'linear-gradient(135deg, #4f46e5, #7c3aed)',
    'linear-gradient(135deg, #0284c7, #06b6d4)',
    'linear-gradient(135deg, #db2777, #f43f5e)',
    'linear-gradient(135deg, #059669, #10b981)',
    'linear-gradient(135deg, #d97706, #f59e0b)',
    'linear-gradient(135deg, #8b5cf6, #ec4899)',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return gradients[Math.abs(hash) % gradients.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function StudentTable({
  students,
  totalCount,
  currentPage,
  perPage,
  isLoading,
  onPageChange,
  onSelectStudent,
  onOpenAddModal,
  onOpenAddMarksModal,
  facultyDepartment,
}: StudentTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState(facultyDepartment || 'ALL');
  const [selectedRisk, setSelectedRisk] = useState('ALL');

  // Available departments in the current student dataset
  const departments = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.department) set.add(s.department);
    });
    return Array.from(set);
  }, [students]);

  // Client-side filtering on current page or query
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        !searchTerm ||
        s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.student_id_str.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDept = selectedDept === 'ALL' || s.department === selectedDept;

      const matchesRisk =
        selectedRisk === 'ALL' ||
        (selectedRisk === 'UNASSESSED' ? !s.risk_segment : s.risk_segment === selectedRisk);

      return matchesSearch && matchesDept && matchesRisk;
    });
  }, [students, searchTerm, selectedDept, selectedRisk]);

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
      {/* Table Header: Title & Filters */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Student Performance & Risk Directory
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              Live student metrics from backend database ({totalCount} total)
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenAddModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-card)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius-md)',
              transition: 'all var(--transition-fast)',
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
            + New Student
          </button>
        </div>

        {/* Filter controls row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px' }}>
            <input
              type="text"
              placeholder="Search by student name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', paddingLeft: '34px' }}
            />
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="2"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          {/* Department filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{ minWidth: '150px' }}
          >
            <option value="ALL">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* Risk Level filter */}
          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            style={{ minWidth: '140px' }}
          >
            <option value="ALL">All Risk Tiers</option>
            <option value="SAFE">Safe (&gt;= 80%)</option>
            <option value="LOW_RISK">Low Risk (70-79%)</option>
            <option value="MEDIUM_RISK">Medium Risk (55-69%)</option>
            <option value="HIGH_RISK">High Risk (40-54%)</option>
            <option value="CRITICAL">Critical (&lt; 40%)</option>
            <option value="UNASSESSED">Unassessed</option>
          </select>

          {/* Clear filters button */}
          {(searchTerm || selectedDept !== 'ALL' || selectedRisk !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedDept('ALL');
                setSelectedRisk('ALL');
              }}
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                padding: '6px 10px',
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)' }}>
        <table style={{ minWidth: '700px' }}>
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-subtle)',
                textAlign: 'left',
              }}

            >
              <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Reg ID
              </th>
              <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Student Name
              </th>
              <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Program / Dept
              </th>
              <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Year / Sem
              </th>
              <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Score
              </th>
              <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Risk Tier
              </th>
              <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Status
              </th>
              <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Loading Skeleton Rows
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px' }}><LoadingSkeleton width="70px" /></td>
                  <td style={{ padding: '14px' }}><LoadingSkeleton width="130px" /></td>
                  <td style={{ padding: '14px' }}><LoadingSkeleton width="110px" /></td>
                  <td style={{ padding: '14px' }}><LoadingSkeleton width="60px" /></td>
                  <td style={{ padding: '14px' }}><LoadingSkeleton width="80px" /></td>
                  <td style={{ padding: '14px' }}><LoadingSkeleton width="85px" /></td>
                  <td style={{ padding: '14px' }}><LoadingSkeleton width="50px" /></td>
                  <td style={{ padding: '14px', textAlign: 'right' }}><LoadingSkeleton width="45px" /></td>
                </tr>
              ))
            ) : filteredStudents.length > 0 ? (
              filteredStudents.map((student) => {
                const score = student.total_score;
                return (
                  <tr
                    key={student.id}
                    onClick={() => onSelectStudent(student)}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background-color var(--transition-fast)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '14px', fontSize: '13px', fontWeight: 600, color: 'var(--primary-light)' }}>
                      <span style={{ 
                        fontFamily: 'monospace', 
                        padding: '3px 8px', 
                        background: 'rgba(79, 70, 229, 0.08)', 
                        borderRadius: '6px',
                        border: '1px solid rgba(79, 70, 229, 0.15)',
                        fontSize: '12px'
                      }}>
                        {student.student_id_str}
                      </span>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          className="avatar-badge-circle"
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: getStudentAvatarGradient(student.full_name),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '12px',
                            letterSpacing: '0.5px',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
                            flexShrink: 0
                          }}
                        >
                          {getInitials(student.full_name)}
                        </div>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {student.full_name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {`${student.student_id_str.toLowerCase()}@university.edu`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <div>{student.program}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{student.department}</div>
                    </td>
                    <td style={{ padding: '14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Yr {student.year_of_study} • Sem {student.current_semester}
                    </td>
                    <td style={{ padding: '14px', fontSize: '13px' }}>
                      {score !== null && score !== undefined ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {Math.round(score)}%
                          </span>
                          <div
                            style={{
                              width: '45px',
                              height: '5px',
                              borderRadius: 'var(--radius-full)',
                              backgroundColor: 'var(--bg-subtle)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, Math.max(0, score))}%`,
                                height: '100%',
                                backgroundColor:
                                  score >= 70 ? 'var(--risk-low)' : score >= 50 ? 'var(--risk-med)' : 'var(--risk-high)',
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>--</span>
                      )}
                    </td>
                    <td style={{ padding: '14px' }}>
                      <Badge variant="risk" riskSegment={student.risk_segment} size="sm" />
                    </td>
                    <td style={{ padding: '14px' }}>
                      <Badge variant="status" active={student.is_active} size="sm" />
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        {onOpenAddMarksModal && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenAddMarksModal(student);
                            }}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(99, 102, 241, 0.12)',
                              color: 'var(--primary)',
                              border: '1px solid rgba(99, 102, 241, 0.25)',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            + Marks
                          </button>
                        )}
                        <span
                          style={{
                            fontSize: '12px',
                            color: 'var(--primary-light)',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Details →
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Empty State inside table */}
      {!isLoading && filteredStudents.length === 0 && (
        <div style={{ marginTop: '16px' }}>
          {totalCount === 0 ? (
            <EmptyState
              badge="Database Ready"
              title="No students enrolled yet"
              description="The backend database has zero student records. Create your first student profile to test data fetching, risk calculation, and profile storage."
              actionText="+ Create Student Record"
              onAction={onOpenAddModal}
            />
          ) : (
            <EmptyState
              title="No matching students found"
              description={`No student matches "${searchTerm || selectedDept || selectedRisk}". Try adjusting or clearing your filters.`}
              actionText="Reset All Filters"
              onAction={() => {
                setSearchTerm('');
                setSelectedDept('ALL');
                setSelectedRisk('ALL');
              }}
            />
          )}
        </div>
      )}

      {/* Pagination Bar */}
      {!isLoading && totalCount > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '13px',
            color: 'var(--text-secondary)',
          }}
        >
          <div>
            Showing {(currentPage - 1) * perPage + 1} to{' '}
            {Math.min(currentPage * perPage, totalCount)} of {totalCount} students
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-card)',
                backgroundColor: 'var(--bg-subtle)',
                color: currentPage <= 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Previous
            </button>
            <span style={{ padding: '0 8px' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-card)',
                backgroundColor: 'var(--bg-subtle)',
                color: currentPage >= totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
