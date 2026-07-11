'use client';

import { useState } from 'react';
import { Upload, Plus, Trash2, Save, FileText, CheckCircle2, Loader2, AlertCircle, FileSpreadsheet, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ──────────────────────────────────────────────────────────
// CSV Parser — pure client-side, no library required
// Supports: classroom, day_of_week, subject, start_time, end_time, teacher, room
// ──────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.');

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));

  const required = ['day_of_week', 'subject', 'start_time', 'end_time'];
  for (const col of required) {
    if (!headers.includes(col)) {
      throw new Error(`Missing required column: "${col}". Required columns: ${required.join(', ')}`);
    }
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted values properly
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
      else { current += char; }
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }

  if (rows.length === 0) throw new Error('No data rows found in the CSV file.');
  return { headers, rows };
}

function normalizeTime(t) {
  if (!t) return '00:00:00';
  const parts = t.split(':');
  if (parts.length === 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
  if (parts.length === 3) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
  return t;
}

// ──────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────
export default function AdminUpload({ classrooms }) {
  const [activeTab, setActiveTab] = useState('pdf'); // 'pdf' | 'csv'

  // Shared state
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [previewSchedule, setPreviewSchedule] = useState(null);

  // PDF-specific
  const [pdfFile, setPdfFile] = useState(null);
  const [parsing, setParsing] = useState(false);

  // CSV-specific
  const [csvFile, setCsvFile] = useState(null);
  const [csvClassroomGroups, setCsvClassroomGroups] = useState(null); // { classroomName -> [rows] }

  // ── Tab switch ──
  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setError(null);
    setSuccess(null);
    setPreviewSchedule(null);
    setCsvClassroomGroups(null);
    setPdfFile(null);
    setCsvFile(null);
  };

  // ── PDF handlers ──
  const handlePdfChange = (e) => {
    setError(null); setSuccess(null);
    const f = e.target.files[0];
    if (f && f.type === 'application/pdf') { setPdfFile(f); }
    else { setError('Please select a valid PDF file.'); setPdfFile(null); }
  };

  const handleUploadAndParse = async (e) => {
    e.preventDefault();
    if (!pdfFile || !selectedClassroomId) return;
    setParsing(true); setError(null); setSuccess(null); setPreviewSchedule(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const formData = new FormData();
      formData.append('file', pdfFile);
      const res = await fetch('/api/timetable/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to parse PDF.'); }
      const data = await res.json();
      if (data.schedule && data.schedule.length > 0) {
        setPreviewSchedule(data.schedule);
        setSuccess(`Parsed ${data.schedule.length} classes from PDF. Verify and save below.`);
      } else {
        setPreviewSchedule([{ day_of_week: 'Monday', subject: '', start_time: '09:00:00', end_time: '10:00:00', teacher: '', room: '' }]);
        setError('Could not auto-detect structure. An editable grid was created for manual entry.');
      }
    } catch (err) { setError(err.message); }
    finally { setParsing(false); }
  };

  // ── CSV handlers ──
  const handleCsvChange = (e) => {
    setError(null); setSuccess(null); setCsvClassroomGroups(null); setPreviewSchedule(null);
    const f = e.target.files[0];
    if (!f) return;
    if (!f.name.endsWith('.csv')) { setError('Please select a valid .csv file.'); setCsvFile(null); return; }
    setCsvFile(f);
  };

  const handleParseCSV = async () => {
    if (!csvFile) return;
    setError(null); setSuccess(null); setPreviewSchedule(null); setCsvClassroomGroups(null);
    try {
      const text = await csvFile.text();
      const { headers, rows } = parseCSV(text);
      const hasClassroomCol = headers.includes('classroom');

      if (hasClassroomCol) {
        // Group rows by classroom name
        const groups = {};
        const unknownClassrooms = new Set();

        for (const row of rows) {
          const name = row.classroom?.trim();
          if (!name) { setError('Some rows are missing the "classroom" value.'); return; }

          // Try to find matching classroom by name (case-insensitive)
          const matched = classrooms.find((c) => c.name.toLowerCase() === name.toLowerCase());
          if (!matched) { unknownClassrooms.add(name); }

          const key = matched ? matched.id : `__unknown__${name}`;
          if (!groups[key]) groups[key] = { classroomName: name, classroomId: matched?.id || null, rows: [] };

          groups[key].rows.push({
            day_of_week: capitalize(row.day_of_week?.trim() || 'Monday'),
            subject: row.subject?.trim() || '',
            start_time: normalizeTime(row.start_time?.trim()),
            end_time: normalizeTime(row.end_time?.trim()),
            teacher: row.teacher?.trim() || '',
            room: row.room?.trim() || '',
          });
        }

        if (unknownClassrooms.size > 0) {
          setError(`These classrooms in your CSV don't exist yet: ${[...unknownClassrooms].join(', ')}. Please create them in the Classroom Manager first, then re-upload.`);
          return;
        }

        // If only 1 group, go directly to preview table (flat mode)
        const groupList = Object.values(groups);
        if (groupList.length === 1) {
          setSelectedClassroomId(groupList[0].classroomId);
          setPreviewSchedule(groupList[0].rows);
          setSuccess(`Parsed ${groupList[0].rows.length} classes for "${groupList[0].classroomName}". Review and save.`);
        } else {
          setCsvClassroomGroups(groupList);
          setSuccess(`Found ${rows.length} total classes across ${groupList.length} classrooms. Review and save each group below.`);
        }
      } else {
        // No classroom column — use selected classroom
        if (!selectedClassroomId) { setError('No "classroom" column found in CSV. Please select a classroom from the dropdown.'); return; }
        const schedule = rows.map((row) => ({
          day_of_week: capitalize(row.day_of_week?.trim() || 'Monday'),
          subject: row.subject?.trim() || '',
          start_time: normalizeTime(row.start_time?.trim()),
          end_time: normalizeTime(row.end_time?.trim()),
          teacher: row.teacher?.trim() || '',
          room: row.room?.trim() || '',
        }));
        setPreviewSchedule(schedule);
        setSuccess(`Parsed ${schedule.length} classes from CSV. Review and save.`);
      }
    } catch (err) { setError(err.message); }
  };

  // ── Shared grid editing ──
  const handleCellChange = (index, field, value) => {
    const updated = [...previewSchedule];
    updated[index][field] = value;
    setPreviewSchedule(updated);
  };
  const handleAddRow = () => setPreviewSchedule([...previewSchedule, { day_of_week: 'Monday', subject: '', start_time: '09:00:00', end_time: '10:00:00', teacher: '', room: '' }]);
  const handleDeleteRow = (index) => setPreviewSchedule(previewSchedule.filter((_, i) => i !== index));

  // ── Save single schedule (PDF or single-classroom CSV) ──
  const handleSaveSchedule = async () => {
    if (!selectedClassroomId || !previewSchedule) return;
    setSaving(true); setError(null); setSuccess(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ classroom_id: selectedClassroomId, schedule: previewSchedule }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to save timetable.'); }
      setSuccess('Timetable successfully saved and published!');
      setPreviewSchedule(null);
      setPdfFile(null); setCsvFile(null);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  // ── Save all multi-classroom CSV groups ──
  const handleSaveAllGroups = async () => {
    if (!csvClassroomGroups) return;
    setSaving(true); setError(null); setSuccess(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      let totalSaved = 0;
      for (const group of csvClassroomGroups) {
        const res = await fetch('/api/timetable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ classroom_id: group.classroomId, schedule: group.rows }),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(`Failed for "${group.classroomName}": ${e.error}`); }
        totalSaved += group.rows.length;
      }
      setSuccess(`All ${totalSaved} classes saved across ${csvClassroomGroups.length} classrooms!`);
      setCsvClassroomGroups(null); setCsvFile(null);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="glass-card upload-card">
      <h3>Upload Classroom Timetable</h3>

      {/* Tab Switcher */}
      <div className="tab-switcher">
        <button
          className={`tab-btn ${activeTab === 'pdf' ? 'active' : ''}`}
          onClick={() => handleTabSwitch('pdf')}
        >
          <FileText size={16} />
          PDF Upload
        </button>
        <button
          className={`tab-btn ${activeTab === 'csv' ? 'active' : ''}`}
          onClick={() => handleTabSwitch('csv')}
        >
          <FileSpreadsheet size={16} />
          CSV Upload
        </button>
      </div>

      {/* Status Banners */}
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

      {/* ───── PDF TAB ───── */}
      {activeTab === 'pdf' && !previewSchedule && (
        <form onSubmit={handleUploadAndParse} className="upload-form">
          <div className="form-group">
            <label className="form-label" htmlFor="upload-class-select-pdf">Target Classroom</label>
            <select
              id="upload-class-select-pdf"
              value={selectedClassroomId}
              onChange={(e) => setSelectedClassroomId(e.target.value)}
              className="form-select"
              required
            >
              <option value="">-- Choose Classroom --</option>
              {classrooms.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Timetable PDF File</label>
            <div className="file-dropzone">
              <input type="file" id="pdf-file-upload" accept=".pdf" onChange={handlePdfChange} className="file-input" required />
              <label htmlFor="pdf-file-upload" className="dropzone-label">
                <Upload size={32} className="upload-icon text-secondary" />
                {pdfFile ? (
                  <div className="selected-file-info">
                    <FileText size={16} />
                    <span className="file-name">{pdfFile.name}</span>
                    <span className="file-size">({(pdfFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ) : (
                  <span>Drag and drop or click to choose a timetable PDF</span>
                )}
              </label>
            </div>
          </div>
          <button
            type="submit"
            disabled={parsing || !pdfFile || !selectedClassroomId}
            className={`btn btn-primary parse-btn ${parsing || !pdfFile || !selectedClassroomId ? 'btn-disabled' : ''}`}
          >
            {parsing ? (
              <><Loader2 className="animate-spin" size={18} /><span>Reading PDF Text...</span></>
            ) : (
              <><FileText size={18} /><span>Parse PDF Timetable</span></>
            )}
          </button>
        </form>
      )}

      {/* ───── CSV TAB ───── */}
      {activeTab === 'csv' && !previewSchedule && !csvClassroomGroups && (
        <div className="upload-form">
          {/* Template download */}
          <div className="csv-info-bar">
            <div className="csv-columns-badge">
              <span className="badge-label">Required columns:</span>
              {['classroom', 'day_of_week', 'subject', 'start_time', 'end_time'].map((col) => (
                <span key={col} className="col-chip required">{col}</span>
              ))}
              {['teacher', 'room'].map((col) => (
                <span key={col} className="col-chip optional">{col}</span>
              ))}
            </div>
            <a href="/timetable_template.csv" download className="template-download-btn">
              <Download size={14} />
              Download Template
            </a>
          </div>

          <div className="form-group">
            <label className="form-label">Timetable CSV File</label>
            <div className="file-dropzone">
              <input type="file" id="csv-file-upload" accept=".csv" onChange={handleCsvChange} className="file-input" />
              <label htmlFor="csv-file-upload" className="dropzone-label">
                <FileSpreadsheet size={32} className="upload-icon text-secondary" />
                {csvFile ? (
                  <div className="selected-file-info">
                    <FileSpreadsheet size={16} />
                    <span className="file-name">{csvFile.name}</span>
                    <span className="file-size">({(csvFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ) : (
                  <span>Drag and drop or click to choose a .csv file</span>
                )}
              </label>
            </div>
          </div>

          <button
            onClick={handleParseCSV}
            disabled={!csvFile}
            className={`btn btn-primary parse-btn ${!csvFile ? 'btn-disabled' : ''}`}
          >
            <FileSpreadsheet size={18} />
            <span>Parse CSV Timetable</span>
          </button>
        </div>
      )}

      {/* ───── MULTI-CLASSROOM CSV GROUPS ───── */}
      {csvClassroomGroups && (
        <div className="groups-container slide-up">
          <div className="preview-header">
            <h4>Multi-Classroom Schedule</h4>
            <p className="text-secondary">Review the grouped schedule below before saving all at once.</p>
          </div>

          {csvClassroomGroups.map((group, gi) => (
            <div key={gi} className="classroom-group">
              <div className="group-header">
                <span className="group-name">{group.classroomName}</span>
                <span className="group-count">{group.rows.length} classes</span>
              </div>
              <div className="table-responsive">
                <table className="preview-table">
                  <thead>
                    <tr><th>Day</th><th>Subject</th><th>Start</th><th>End</th><th>Teacher</th><th>Room</th></tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row, ri) => (
                      <tr key={ri}>
                        <td>{row.day_of_week}</td>
                        <td>{row.subject}</td>
                        <td>{row.start_time.substring(0, 5)}</td>
                        <td>{row.end_time.substring(0, 5)}</td>
                        <td>{row.teacher || '—'}</td>
                        <td>{row.room || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div className="preview-actions">
            <button onClick={() => { setCsvClassroomGroups(null); setCsvFile(null); setError(null); setSuccess(null); }} disabled={saving} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={handleSaveAllGroups} disabled={saving} className="btn btn-primary save-btn">
              {saving ? <Loader2 className="animate-spin" size={18} /> : <><Save size={16} /><span>Save All Classrooms</span></>}
            </button>
          </div>
        </div>
      )}

      {/* ───── SHARED PREVIEW / EDIT TABLE ───── */}
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
                  <th>Day</th><th>Subject</th><th>Start Time</th><th>End Time</th><th>Teacher</th><th>Room</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {previewSchedule.map((entry, index) => (
                  <tr key={index}>
                    <td>
                      <select value={entry.day_of_week} onChange={(e) => handleCellChange(index, 'day_of_week', e.target.value)} className="form-select cell-select">
                        {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </td>
                    <td>
                      <input type="text" value={entry.subject} onChange={(e) => handleCellChange(index, 'subject', e.target.value)} className="form-input cell-input" placeholder="Math" required />
                    </td>
                    <td>
                      <input type="time" value={entry.start_time.substring(0, 5)} onChange={(e) => handleCellChange(index, 'start_time', e.target.value + ':00')} className="form-input cell-input" required />
                    </td>
                    <td>
                      <input type="time" value={entry.end_time.substring(0, 5)} onChange={(e) => handleCellChange(index, 'end_time', e.target.value + ':00')} className="form-input cell-input" required />
                    </td>
                    <td>
                      <input type="text" value={entry.teacher || ''} onChange={(e) => handleCellChange(index, 'teacher', e.target.value)} className="form-input cell-input" placeholder="Dr. Smith" />
                    </td>
                    <td>
                      <input type="text" value={entry.room || ''} onChange={(e) => handleCellChange(index, 'room', e.target.value)} className="form-input cell-input" placeholder="Room 101" />
                    </td>
                    <td>
                      <button onClick={() => handleDeleteRow(index)} className="delete-row-btn" title="Delete slot"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="preview-actions">
            <button onClick={handleAddRow} className="btn btn-secondary"><Plus size={16} /><span>Add Time Slot</span></button>
            <div className="action-group">
              <button onClick={() => { setPreviewSchedule(null); setError(null); setSuccess(null); }} disabled={saving} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSaveSchedule} disabled={saving} className="btn btn-primary save-btn">
                {saving ? <Loader2 className="animate-spin" size={18} /> : <><Save size={16} /><span>Save & Publish</span></>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .upload-card { padding: 24px; }
        h3 { font-size: 1.25rem; margin-bottom: 16px; }

        /* Tab Switcher */
        .tab-switcher {
          display: flex;
          gap: 6px;
          background: rgba(10, 14, 23, 0.6);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          padding: 4px;
          margin-bottom: 20px;
        }
        .tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 9px 16px;
          border-radius: calc(var(--radius-md) - 4px);
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .tab-btn.active {
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-purple));
          color: white;
          box-shadow: 0 2px 10px -2px var(--accent-primary-glow);
        }
        .tab-btn:not(.active):hover {
          color: var(--text-secondary);
          background: rgba(255,255,255,0.04);
        }

        /* CSV Info Bar */
        .csv-info-bar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          background: rgba(79, 70, 229, 0.06);
          border: 1px solid rgba(79, 70, 229, 0.2);
          border-radius: var(--radius-md);
          padding: 12px 14px;
          margin-bottom: 18px;
        }
        .csv-columns-badge {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
        }
        .badge-label {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-right: 2px;
        }
        .col-chip {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: var(--radius-full);
          font-family: monospace;
        }
        .col-chip.required {
          background: rgba(6, 182, 212, 0.12);
          color: var(--accent-secondary);
          border: 1px solid rgba(6, 182, 212, 0.25);
        }
        .col-chip.optional {
          background: rgba(100, 116, 139, 0.1);
          color: var(--text-muted);
          border: 1px solid var(--glass-border);
        }
        .template-download-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: var(--radius-md);
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--accent-secondary);
          background: rgba(6, 182, 212, 0.08);
          border: 1px solid rgba(6, 182, 212, 0.2);
          text-decoration: none;
          transition: all var(--transition-fast);
          white-space: nowrap;
        }
        .template-download-btn:hover {
          background: rgba(6, 182, 212, 0.15);
          transform: translateY(-1px);
        }

        /* Multi-classroom groups */
        .groups-container { margin-top: 10px; border-top: 1px dashed var(--glass-border); padding-top: 20px; }
        .classroom-group { margin-bottom: 24px; }
        .group-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .group-name {
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--accent-secondary);
        }
        .group-count {
          font-size: 0.78rem;
          color: var(--text-muted);
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }

        /* Form & dropzone */
        .upload-form { display: flex; flex-direction: column; gap: 15px; }
        .file-dropzone {
          position: relative; width: 100%;
          border: 2px dashed var(--glass-border);
          border-radius: var(--radius-md);
          background: rgba(10, 14, 23, 0.4);
          transition: all var(--transition-fast); cursor: pointer;
        }
        .file-dropzone:hover { border-color: var(--accent-secondary); background: rgba(6,182,212,0.03); }
        .file-input { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
        .dropzone-label {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 30px 20px; text-align: center;
          font-size: 0.9rem; color: var(--text-secondary); cursor: pointer; gap: 10px;
        }
        .selected-file-info { display: flex; align-items: center; gap: 6px; color: var(--accent-secondary); font-weight: 600; }
        .file-size { color: var(--text-muted); font-weight: 400; font-size: 0.8rem; }
        .parse-btn { width: 100%; height: 48px; }

        /* Status banners */
        .error-banner {
          display: flex; align-items: flex-start; gap: 10px;
          background: rgba(239,68,68,0.08); border: 1px solid var(--error-glow);
          color: var(--error); padding: 12px; border-radius: var(--radius-md);
          font-size: 0.88rem; margin-bottom: 20px;
        }
        .success-banner {
          display: flex; align-items: center; gap: 10px;
          background: rgba(16,185,129,0.08); border: 1px solid var(--success-glow);
          color: var(--success); padding: 12px; border-radius: var(--radius-md);
          font-size: 0.88rem; margin-bottom: 20px;
        }
        .banner-icon { flex-shrink: 0; }

        /* Preview table */
        .preview-container { margin-top: 10px; border-top: 1px dashed var(--glass-border); padding-top: 20px; }
        .preview-header { margin-bottom: 16px; }
        .preview-header h4 { font-size: 1.1rem; margin-bottom: 4px; }
        .table-responsive {
          width: 100%; overflow-x: auto; margin-bottom: 20px;
          border: 1px solid var(--glass-border); border-radius: var(--radius-md);
        }
        .preview-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem; }
        .preview-table th {
          background: rgba(10,14,23,0.8); color: var(--text-secondary);
          font-weight: 600; padding: 12px 10px; border-bottom: 1px solid var(--glass-border);
        }
        .preview-table td { padding: 8px 10px; border-bottom: 1px solid var(--glass-border); background: rgba(19,26,38,0.3); }
        .cell-input, .cell-select { padding: 6px 10px; font-size: 0.85rem; background: rgba(10,14,23,0.6); }
        .cell-input:focus, .cell-select:focus { background: var(--bg-primary); }
        .delete-row-btn {
          background: transparent; border: none; color: var(--text-muted);
          cursor: pointer; padding: 6px; border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }
        .delete-row-btn:hover { color: var(--error); background: rgba(239,68,68,0.1); }
        .preview-actions { display: flex; justify-content: space-between; align-items: center; gap: 15px; flex-wrap: wrap; }
        .action-group { display: flex; gap: 10px; }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

// Helper
function capitalize(str) {
  if (!str) return str;
  const lower = str.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
