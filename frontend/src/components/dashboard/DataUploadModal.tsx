import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { api, ApiRequestError } from '../../services/api';
import type { UploadDatasetResponse } from '../../types';
import { Modal } from '../common/Modal';
import { Spinner } from '../common/Spinner';

interface DataUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onRequireLogin?: () => void;
}

export function DataUploadModal({ isOpen, onClose, onSuccess, onRequireLogin }: DataUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dimension, setDimension] = useState<string>('COMPREHENSIVE');
  const [semester, setSemester] = useState<number>(3);
  const [academicYear, setAcademicYear] = useState<string>('2025-26');
  const [autoRecompute, setAutoRecompute] = useState<boolean>(true);

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [result, setResult] = useState<UploadDatasetResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFile(null);
    setResult(null);
    setErrorMessage(null);
    setUploadProgress(0);
    setIsUploading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const selected = e.dataTransfer.files[0];
      validateAndSetFile(selected);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (f: File) => {
    const validExtensions = ['.csv', '.xlsx', '.xls', '.json'];
    const hasValidExt = validExtensions.some((ext) => f.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setErrorMessage('Unsupported file format. Please upload a CSV, Excel (.xlsx/.xls), or JSON file.');
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 15MB limit.');
      return;
    }
    setFile(f);
    setErrorMessage(null);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMessage('Please select a file to ingest.');
      return;
    }

    try {
      setIsUploading(true);
      setErrorMessage(null);
      setResult(null);
      setUploadProgress(20);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev < 85 ? prev + 15 : prev));
      }, 250);

      const res = await api.data.upload(file, {
        dimension: dimension === 'AUTO' ? undefined : dimension,
        semester,
        academic_year: academicYear,
        auto_recompute: autoRecompute,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      setResult(res);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErrorMessage(err.message);
      } else {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setErrorMessage(`Ingestion failure: ${msg}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleSeedBenchmark = async () => {
    try {
      setIsUploading(true);
      setErrorMessage(null);
      setUploadProgress(40);
      const res = await api.data.seedBenchmark(50);
      setUploadProgress(100);
      setResult({
        success: true,
        message: res.message,
        detected_format: 'SYNTHETIC_BENCHMARK',
        detected_dimension: 'COMPREHENSIVE (4 DIMENSIONS)',
        inserted_records: res.records_created * 4,
        superseded_records: 0,
        skipped_records: 0,
        total_records_in_payload: res.records_created * 4,
        scores_recalculated: res.records_created,
        upload_batch_id: Math.floor(Math.random() * 9000) + 1000,
        errors: [],
      });
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErrorMessage(err.message);
      } else {
        const msg = err instanceof Error ? err.message : 'Benchmark generation failed';
        setErrorMessage(`Benchmark error: ${msg}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="High-Volume Batch Data Ingestion Engine"
      maxWidth="680px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 1-Click KPMG Benchmark Shortcut */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(236, 72, 153, 0.08))',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚡</span> KPMG Campus Challenge Benchmark Generator
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Instantly seed 50 multi-dimensional student records across Engineering, Management & Science without preparing a file.
            </div>
          </div>
          <button
            type="button"
            onClick={handleSeedBenchmark}
            disabled={isUploading}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              boxShadow: 'var(--shadow-sm)',
              whiteSpace: 'nowrap',
            }}
          >
            {isUploading ? 'Generating...' : '⚡ Seed 50 Students'}
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
          Or upload custom institutional records (CSV, Excel, or JSON). Supports batch sizes up to 70,000+ records with bulk ingestion.
        </p>

        {errorMessage && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--risk-high-bg)',
              border: '1px solid var(--risk-high-border)',
              color: 'var(--risk-high-text)',
              fontSize: '12px',
              lineHeight: 1.5,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div>
              <strong>Upload Error:</strong> {errorMessage}
            </div>
            {onRequireLogin && (errorMessage.toLowerCase().includes('authenticated') || errorMessage.toLowerCase().includes('log in')) && (
              <button
                type="button"
                onClick={onRequireLogin}
                style={{
                  alignSelf: 'flex-start',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--risk-high-text)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Log In to Admin Account
              </button>
            )}
          </div>
        )}

        {/* Success Banner */}
        {result && (
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                  }}
                />
                <strong style={{ fontSize: '14px', color: '#10b981' }}>
                  Ingestion Successful
                </strong>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Batch ID #{result.upload_batch_id}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '8px',
                fontSize: '12px',
              }}
            >
              <div style={{ padding: '8px', backgroundColor: 'var(--bg-surface)', borderRadius: '4px' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px' }}>Dimension</span>
                <strong style={{ color: 'var(--text-primary)' }}>{result.detected_dimension}</strong>
              </div>
              <div style={{ padding: '8px', backgroundColor: 'var(--bg-surface)', borderRadius: '4px' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px' }}>Inserted</span>
                <strong style={{ color: '#10b981' }}>{result.inserted_records.toLocaleString()} rows</strong>
              </div>
              <div style={{ padding: '8px', backgroundColor: 'var(--bg-surface)', borderRadius: '4px' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px' }}>Superseded</span>
                <strong style={{ color: 'var(--primary-light)' }}>{result.superseded_records.toLocaleString()} rows</strong>
              </div>
              <div style={{ padding: '8px', backgroundColor: 'var(--bg-surface)', borderRadius: '4px' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px' }}>Scores Updated</span>
                <strong style={{ color: '#f59e0b' }}>{result.scores_recalculated.toLocaleString()} students</strong>
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px' }}>
                Note: {result.errors.length} rows had warnings during processing.
              </div>
            )}
          </div>
        )}

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragOver ? 'var(--primary)' : 'var(--border-card)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '28px 20px',
            textAlign: 'center',
            backgroundColor: isDragOver ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-subtle)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,.xlsx,.xls,.json"
            style={{ display: 'none' }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke={file ? 'var(--primary-light)' : 'var(--text-muted)'}
              strokeWidth="1.8"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>

            {file ? (
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                  {file.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {(file.size / 1024).toFixed(1)} KB • Click to choose a different dataset
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                  Click to browse or drag & drop dataset file here
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Accepts CSV, Excel (.xlsx, .xls), or JSON (Max 15MB)
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {isUploading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span>Streaming & inserting records into database...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div
              style={{
                width: '100%',
                height: '6px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  backgroundColor: 'var(--primary)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Configuration Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Target Dimension
            </label>
            <select
              value={dimension}
              onChange={(e) => setDimension(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-card)',
                fontSize: '13px',
              }}
            >
              <option value="COMPREHENSIVE">Auto-Detect / Multi-Dimension</option>
              <option value="ACADEMIC">Academic Records (GPA & Marks)</option>
              <option value="ATTENDANCE">Attendance Logs</option>
              <option value="LMS">LMS Digital Activity</option>
              <option value="ENGAGEMENT">Engagement & Extracurriculars</option>
              <option value="STUDENTS">Student Master Profiles</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Semester
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-card)',
                fontSize: '13px',
              }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Academic Year
            </label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="e.g. 2025-26"
              style={{ width: '100%', fontSize: '13px' }}
            />
          </div>
        </div>

        {/* Auto Recompute Checkbox */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={autoRecompute}
            onChange={(e) => setAutoRecompute(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          Automatically recompute composite success & risk scores after batch ingestion
        </label>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            {result ? 'Done' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || isUploading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: !file || isUploading ? 'var(--bg-subtle)' : 'var(--primary)',
              color: !file || isUploading ? 'var(--text-muted)' : '#ffffff',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)',
              cursor: !file || isUploading ? 'not-allowed' : 'pointer',
            }}
          >
            {isUploading ? (
              <>
                <Spinner size={15} color="#ffffff" />
                Ingesting Dataset...
              </>
            ) : (
              'Ingest Dataset'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
