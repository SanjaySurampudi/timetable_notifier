'use client';

import { useState } from 'react';
import { Upload, Plus, Trash2, Save, FileText, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AdminUpload({ classrooms }) {
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // The editable parsed schedule list
  const [previewSchedule, setPreviewSchedule] = useState(null);

  const handleFileChange = (e) => {
    setError(null);
    setSuccess(null);
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      setError('Please select a valid PDF file.');
      setFile(null);
    }
  };

  const handleUploadAndParse = async (e) => {
    e.preventDefault();
    if (!file || !selectedClassroomId) return;

    setParsing(true);
    setError(null);
    setSuccess(null);
    setPreviewSchedule(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/timetable/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to parse timetable PDF.');
      }

      const data = await res.json();
      
      if (data.schedule && data.schedule.length > 0) {
        setPreviewSchedule(data.schedule);
        setSuccess(`Successfully parsed ${data.schedule.length} classes from PDF. Please verify and save below.`);
      } else {
        // Fallback: create one empty row if parsing extracted nothing, so they don't get stuck
        setPreviewSchedule([{
          day_of_week: 'Monday',
          subject: '',
          start_time: '09:00:00',
          end_time: '10:00:00',
          teacher: '',
          room: '',
        }]);
        setError('We could not automatically detect structure in the PDF text. We created an editable grid so you can input it manually.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setParsing(false);
    }
  };

  // Grid editing functions
  const handleCellChange = (index, field, value) => {
    const updated = [...previewSchedule];
    updated[index][field] = value;
    setPreviewSchedule(updated);
  };

  const handleAddRow = () => {
    setPreviewSchedule([
      ...previewSchedule,
      {
        day_of_week: 'Monday',
        subject: '',
        start_time: '09:00:00',
        end_time: '10:00:00',
        teacher: '',
        room: '',
      },
    ]);
  };

  const handleDeleteRow = (index) => {
    const updated = previewSchedule.filter((_, i) => i !== index);
    setPreviewSchedule(updated.length > 0 ? updated : []);
  };

  const handleSaveSchedule = async () => {
    if (!selectedClassroomId || !previewSchedule) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Save schedule
      const res = await fetch('/api/timetable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          classroom_id: selectedClassroomId,
          schedule: previewSchedule,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save timetable.');
      }

      setSuccess('Timetable successfully saved and published!');
      setPreviewSchedule(null);
      setFile(null);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-card upload-card">
      <h3>Upload Classroom Timetable</h3>
      <p className="text-secondary description">Select a classroom, upload its schedule in PDF format, then review and publish it.</p>

      {error && (
        <div className="error-banner">
          <AlertCircle size={18} className="banner-icon" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="success-banner">
          <CheckCircle2 size={18} className="banner-icon" />
          <span>{success}</span>
        </div>
      )}

      {/* Upload and Configuration Form */}
      {!previewSchedule && (
        <form onSubmit={handleUploadAndParse} className="upload-form">
          <div className="form-group">
            <label className="form-label" htmlFor="upload-class-select">Target Classroom</label>
            <select
              id="upload-class-select"
              value={selectedClassroomId}
              onChange={(e) => setSelectedClassroomId(e.target.value)}
              className="form-select"
              required
            >
              <option value="">-- Choose Classroom --</option>
              {classrooms.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Timetable PDF File</label>
            <div className="file-dropzone">
              <input
                type="file"
                id="file-upload"
                accept=".pdf"
                onChange={handleFileChange}
                className="file-input"
                required
              />
              <label htmlFor="file-upload" className="dropzone-label">
                <Upload size={32} className="upload-icon text-secondary" />
                {file ? (
                  <div className="selected-file-info">
                    <FileText size={16} />
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ) : (
                  <span>Drag and drop or click to choose a timetable PDF</span>
                )}
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={parsing || !file || !selectedClassroomId}
            className={`btn btn-primary parse-btn ${parsing || !file || !selectedClassroomId ? 'btn-disabled' : ''}`}
          >
            {parsing ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Reading PDF Text...</span>
              </>
            ) : (
              <>
                <FileText size={18} />
                <span>Parse PDF Timetable</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Interactive Verification Preview Table */}
      {previewSchedule && (
        <div className="preview-container slide-up">
          <div className="preview-header">
            <h4>Review Schedule Details</h4>
            <p className="text-secondary">Verify and tweak times or subject details before saving.</p>
          </div>

          <div className="table-responsive">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Subject</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Teacher</th>
                  <th>Room</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {previewSchedule.map((entry, index) => (
                  <tr key={index}>
                    <td>
                      <select
                        value={entry.day_of_week}
                        onChange={(e) => handleCellChange(index, 'day_of_week', e.target.value)}
                        className="form-select cell-select"
                      >
                        {DAYS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={entry.subject}
                        onChange={(e) => handleCellChange(index, 'subject', e.target.value)}
                        className="form-input cell-input"
                        placeholder="Math"
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        value={entry.start_time.substring(0, 5)}
                        onChange={(e) => handleCellChange(index, 'start_time', e.target.value + ':00')}
                        className="form-input cell-input"
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        value={entry.end_time.substring(0, 5)}
                        onChange={(e) => handleCellChange(index, 'end_time', e.target.value + ':00')}
                        className="form-input cell-input"
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={entry.teacher || ''}
                        onChange={(e) => handleCellChange(index, 'teacher', e.target.value)}
                        className="form-input cell-input"
                        placeholder="Dr. Smith"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={entry.room || ''}
                        onChange={(e) => handleCellChange(index, 'room', e.target.value)}
                        className="form-input cell-input"
                        placeholder="Room 101"
                      />
                    </td>
                    <td>
                      <button
                        onClick={() => handleDeleteRow(index)}
                        className="delete-row-btn"
                        title="Delete slot"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="preview-actions">
            <button onClick={handleAddRow} className="btn btn-secondary">
              <Plus size={16} />
              <span>Add Time Slot</span>
            </button>

            <div className="action-group">
              <button
                onClick={() => setPreviewSchedule(null)}
                disabled={saving}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSchedule}
                disabled={saving}
                className="btn btn-primary save-btn"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save & Publish</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .upload-card {
          padding: 24px;
        }

        h3 {
          font-size: 1.25rem;
          margin-bottom: 4px;
        }

        .description {
          font-size: 0.85rem;
          margin-bottom: 20px;
        }

        .upload-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .file-dropzone {
          position: relative;
          width: 100%;
          border: 2px dashed var(--glass-border);
          border-radius: var(--radius-md);
          background: rgba(10, 14, 23, 0.4);
          transition: all var(--transition-fast);
          cursor: pointer;
        }

        .file-dropzone:hover {
          border-color: var(--accent-secondary);
          background: rgba(6, 182, 212, 0.03);
        }

        .file-input {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }

        .dropzone-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 30px 20px;
          text-align: center;
          font-size: 0.9rem;
          color: var(--text-secondary);
          cursor: pointer;
          gap: 10px;
        }

        .selected-file-info {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--accent-secondary);
          font-weight: 600;
        }

        .file-size {
          color: var(--text-muted);
          font-weight: 400;
          font-size: 0.8rem;
        }

        .parse-btn {
          width: 100%;
          height: 48px;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid var(--error-glow);
          color: var(--error);
          padding: 12px;
          border-radius: var(--radius-md);
          font-size: 0.88rem;
          margin-bottom: 20px;
        }

        .success-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid var(--success-glow);
          color: var(--success);
          padding: 12px;
          border-radius: var(--radius-md);
          font-size: 0.88rem;
          margin-bottom: 20px;
        }

        .banner-icon {
          flex-shrink: 0;
        }

        /* Preview table styling */
        .preview-container {
          margin-top: 10px;
          border-top: 1px dashed var(--glass-border);
          padding-top: 20px;
        }

        .preview-header {
          margin-bottom: 16px;
        }

        .preview-header h4 {
          font-size: 1.1rem;
          margin-bottom: 4px;
        }

        .table-responsive {
          width: 100%;
          overflow-x: auto;
          margin-bottom: 20px;
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
        }

        .preview-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.88rem;
        }

        .preview-table th {
          background: rgba(10, 14, 23, 0.8);
          color: var(--text-secondary);
          font-weight: 600;
          padding: 12px 10px;
          border-bottom: 1px solid var(--glass-border);
        }

        .preview-table td {
          padding: 8px 10px;
          border-bottom: 1px solid var(--glass-border);
          background: rgba(19, 26, 38, 0.3);
        }

        .cell-input, .cell-select {
          padding: 6px 10px;
          font-size: 0.85rem;
          background: rgba(10, 14, 23, 0.6);
        }

        .cell-input:focus, .cell-select:focus {
          background: var(--bg-primary);
        }

        .delete-row-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 6px;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }

        .delete-row-btn:hover {
          color: var(--error);
          background: rgba(239, 68, 68, 0.1);
        }

        .preview-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
        }

        .action-group {
          display: flex;
          gap: 10px;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
