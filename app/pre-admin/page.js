// app/pre-admin/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings, CalendarDays, Loader2, Plus, Trash2, ShieldAlert, Sparkles, BookOpen,
  Lock, Upload, Download, CheckCircle, X, KeyRound, FileText
} from 'lucide-react';

export default function PreAdminDashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState('timetable'); // timetable | import | password

  // Timetable state
  const [schedule, setSchedule] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Add slot form state
  const [dayOfWeek, setDayOfWeek] = useState('Monday');
  const [subject, setSubject] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [teacher, setTeacher] = useState('');
  const [room, setRoom] = useState('');
  const [saving, setSaving] = useState(false);

  // Password change state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  // CSV import state
  const [csvFile, setCsvFile] = useState(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvErrors, setCsvErrors] = useState([]);
  const fileInputRef = useRef(null);

  // Auth check
  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (!data.authenticated || data.role !== 'pre_admin') {
          router.push('/login');
        } else {
          setSession(data);
          setCheckingAuth(false);
          fetchTimetable(data.user.classroom_id);
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const showSuccess = (msg) => {
    setError(null);
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const fetchTimetable = async (classroomId) => {
    try {
      setLoadingSchedule(true);
      setError(null);
      const res = await fetch(`/api/timetable?classroom_id=${classroomId}`);
      if (!res.ok) throw new Error('Failed to load timetable');
      const data = await res.json();
      setSchedule(data.schedule || []);
    } catch (err) {
      setError('Could not retrieve the classroom timetable.');
    } finally {
      setLoadingSchedule(false);
    }
  };

  const saveSchedule = async (newScheduleArray, msg) => {
    setSaving(true);
    try {
      const res = await fetch('/api/pre-admin/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: session.user.classroom_id,
          schedule: newScheduleArray,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setSchedule(newScheduleArray);
      showSuccess(msg);
      setSubject(''); setStartTime(''); setEndTime(''); setTeacher(''); setRoom('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !startTime || !endTime) {
      setError('Subject, Start Time, and End Time are required.');
      return;
    }
    const newSlot = {
      day_of_week: dayOfWeek,
      subject: subject.trim(),
      start_time: startTime + ':00',
      end_time: endTime + ':00',
      teacher: teacher.trim() || null,
      room: room.trim() || null,
    };
    await saveSchedule([...schedule, newSlot], 'Lecture added successfully!');
  };

  const handleDeleteSlot = async (indexToDelete) => {
    await saveSchedule(schedule.filter((_, i) => i !== indexToDelete), 'Lecture deleted.');
  };

  // Password change handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(null);
    if (newPwd !== confirmPwd) {
      setError('New passwords do not match.');
      return;
    }
    if (newPwd.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    setPwdSaving(true);
    try {
      const res = await fetch('/api/pre-admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPwd, new_password: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      showSuccess('Password changed successfully! Please log in again with your new password.');
    } catch (err) {
      setError(err.message);
    } finally {
      setPwdSaving(false);
    }
  };

  // CSV import handler
  const handleCsvImport = async (e) => {
    e.preventDefault();
    if (!csvFile) { setError('Please select a CSV file first.'); return; }
    setCsvImporting(true);
    setCsvErrors([]);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      const res = await fetch('/api/pre-admin/import-csv', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        if (data.details) { setCsvErrors(data.details); throw new Error(data.error); }
        throw new Error(data.error || 'Import failed');
      }
      setCsvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      showSuccess(`CSV imported! ${data.count} timetable entries loaded.`);
      await fetchTimetable(session.user.classroom_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setCsvImporting(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="loading-container">
        <Loader2 className="animate-spin text-secondary" size={40} />
        <p className="text-secondary">Verifying dashboard permissions...</p>
        <style jsx>{`
          .loading-container { display:flex; flex-direction:column; align-items:center; justify-content:center; height:calc(70vh - 100px); gap:16px; }
          @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          .animate-spin { animation: spin 1s linear infinite; }
        `}</style>
      </div>
    );
  }

  const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="container admin-container fade-in">
      {/* Header */}
      <header className="admin-header">
        <div className="title-block">
          <Settings size={28} className="settings-icon" />
          <div>
            <h1>Pre-Admin Dashboard</h1>
            <p className="text-secondary" style={{ margin: 0, fontSize: '0.85rem' }}>
              {session?.user?.roll_number || session?.user?.email}
            </p>
          </div>
        </div>
        <div className="classroom-badge">
          <Sparkles size={12} />
          <span>{session?.user?.classroom_name}</span>
        </div>
      </header>

      {/* Alerts */}
      {error && (
        <div className="alert-banner error-banner glass-card">
          <ShieldAlert size={18} />
          <span>{error}</span>
          <button className="close-alert" onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}
      {successMsg && (
        <div className="alert-banner success-banner glass-card">
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tab Nav */}
      <div className="tabs-navigation">
        <button onClick={() => setActiveTab('timetable')} className={`tab-btn ${activeTab === 'timetable' ? 'active' : ''}`}>
          <CalendarDays size={16} /><span>Manage Timetable</span>
        </button>
        <button onClick={() => setActiveTab('import')} className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`}>
          <Upload size={16} /><span>Import CSV</span>
        </button>
        <button onClick={() => setActiveTab('password')} className={`tab-btn ${activeTab === 'password' ? 'active' : ''}`}>
          <KeyRound size={16} /><span>Change Password</span>
        </button>
      </div>

      {/* ─── Tab 1: Manage Timetable ─── */}
      {activeTab === 'timetable' && (
        <div className="admin-grid">
          {/* Add Slot Form */}
          <section className="grid-item">
            <div className="glass-card form-card">
              <div className="card-header">
                <Plus size={20} className="header-icon" />
                <h2>Add Lecture Slot</h2>
              </div>
              <form onSubmit={handleAddSlot} className="slot-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="day-select">Day of Week</label>
                  <select id="day-select" value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)} className="form-select">
                    {daysOrder.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="subject-input">Subject Name</label>
                  <input id="subject-input" type="text" required placeholder="e.g. Mathematics II" value={subject} onChange={e => setSubject(e.target.value)} className="form-input" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="start-time">Start Time</label>
                    <input id="start-time" type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="end-time">End Time</label>
                    <input id="end-time" type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} className="form-input" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="teacher-input">Teacher (Optional)</label>
                  <input id="teacher-input" type="text" placeholder="e.g. Dr. Sanjay Kumar" value={teacher} onChange={e => setTeacher(e.target.value)} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="room-input">Room / Location (Optional)</label>
                  <input id="room-input" type="text" placeholder="e.g. LH-302" value={room} onChange={e => setRoom(e.target.value)} className="form-input" />
                </div>
                <button type="submit" disabled={saving} className="btn btn-primary submit-btn">
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <><Plus size={15} /> Add to Timetable</>}
                </button>
              </form>
            </div>
          </section>

          {/* Schedule List */}
          <section className="grid-item">
            <div className="glass-card list-card">
              <div className="card-header">
                <CalendarDays size={20} className="header-icon" />
                <h2>Current Schedule — {session?.user?.classroom_name}</h2>
              </div>
              {loadingSchedule ? (
                <div className="list-loading"><Loader2 className="animate-spin" size={30} /><span>Loading...</span></div>
              ) : schedule.length === 0 ? (
                <div className="empty-state text-center">
                  <BookOpen size={40} className="text-muted" style={{ marginBottom: 12 }} />
                  <h3>No entries yet</h3>
                  <p className="text-secondary">Use the form or import a CSV to add lectures.</p>
                </div>
              ) : (
                <div className="schedule-days-list">
                  {daysOrder.map(day => {
                    const slots = schedule.map((s, idx) => ({ ...s, idx })).filter(s => s.day_of_week === day);
                    if (!slots.length) return null;
                    return (
                      <div key={day} className="day-group">
                        <h3 className="day-title">{day}</h3>
                        <div className="day-slots-grid">
                          {slots.map(slot => (
                            <div key={slot.idx} className="slot-item-card glass-card">
                              <div className="slot-details">
                                <span className="slot-subject">{slot.subject}</span>
                                <span className="slot-time">{slot.start_time?.substring(0, 5)} – {slot.end_time?.substring(0, 5)}</span>
                                {(slot.teacher || slot.room) && (
                                  <span className="slot-meta text-muted">
                                    {slot.room ? `Room: ${slot.room}` : ''}{slot.room && slot.teacher ? ' | ' : ''}{slot.teacher ? `Prof: ${slot.teacher}` : ''}
                                  </span>
                                )}
                              </div>
                              <button onClick={() => handleDeleteSlot(slot.idx)} className="delete-slot-btn" disabled={saving}>
                                <Trash2 size={15} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ─── Tab 2: Import CSV ─── */}
      {activeTab === 'import' && (
        <div className="single-col-section fade-in">
          <div className="glass-card form-card wide-card">
            <div className="card-header">
              <Upload size={20} className="header-icon" />
              <h2>Import Timetable from CSV</h2>
            </div>

            {/* Example download */}
            <div className="example-info-block">
              <FileText size={18} className="info-icon" />
              <div>
                <p><strong>Not sure how to format your CSV?</strong> Download the example template below. It shows the correct column order and naming.</p>
                <a href="/example-timetable.csv" download className="btn btn-secondary download-btn">
                  <Download size={15} /> Download Example CSV
                </a>
              </div>
            </div>

            {/* CSV columns reference */}
            <div className="csv-columns-reference">
              <h3>Required CSV Columns</h3>
              <div className="columns-grid">
                {[
                  { col: 'day_of_week', note: 'Monday, Tuesday, ... Sunday' },
                  { col: 'subject', note: 'Name of the subject' },
                  { col: 'start_time', note: 'e.g. 09:00 (24-hour)' },
                  { col: 'end_time', note: 'e.g. 10:00 (24-hour)' },
                  { col: 'teacher', note: 'Optional — professor name' },
                  { col: 'room', note: 'Optional — room/location' },
                ].map(({ col, note }) => (
                  <div key={col} className="col-row">
                    <code className="col-name">{col}</code>
                    <span className="col-note text-muted">{note}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload form */}
            <form onSubmit={handleCsvImport} className="csv-upload-form">
              <div className="file-drop-zone" onClick={() => fileInputRef.current?.click()}>
                <Upload size={32} className="drop-icon" />
                <p>{csvFile ? csvFile.name : 'Click to select a .csv file'}</p>
                <span className="text-muted">Your CSV will replace the entire current timetable</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={e => { setCsvFile(e.target.files[0]); setCsvErrors([]); setError(null); }}
                  style={{ display: 'none' }}
                />
              </div>

              {csvFile && (
                <div className="selected-file-info">
                  <FileText size={14} />
                  <span>{csvFile.name}</span>
                  <button type="button" className="remove-file-btn" onClick={() => { setCsvFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                    <X size={13} />
                  </button>
                </div>
              )}

              {csvErrors.length > 0 && (
                <div className="csv-errors-list">
                  <h4>Validation Errors:</h4>
                  {csvErrors.map((e, i) => <p key={i} className="csv-error-row">⚠ {e}</p>)}
                </div>
              )}

              <button type="submit" disabled={csvImporting || !csvFile} className="btn btn-primary submit-btn">
                {csvImporting ? <><Loader2 className="animate-spin" size={16} /> Importing...</> : <><Upload size={15} /> Import & Replace Timetable</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── Tab 3: Change Password ─── */}
      {activeTab === 'password' && (
        <div className="single-col-section fade-in">
          <div className="glass-card form-card wide-card">
            <div className="card-header">
              <KeyRound size={20} className="header-icon" />
              <h2>Change Login Password</h2>
            </div>
            <p className="text-secondary" style={{ marginBottom: 24 }}>Enter your current password and choose a new one. Your new password must be at least 6 characters.</p>
            <form onSubmit={handleChangePassword} className="slot-form">
              <div className="form-group">
                <label className="form-label" htmlFor="current-pwd">Current Password</label>
                <div className="input-with-icon">
                  <Lock size={15} className="input-icon" />
                  <input id="current-pwd" type="password" required placeholder="••••••••" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} className="form-input pl-icon" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="new-pwd">New Password</label>
                <div className="input-with-icon">
                  <Lock size={15} className="input-icon" />
                  <input id="new-pwd" type="password" required placeholder="At least 6 characters" value={newPwd} onChange={e => setNewPwd(e.target.value)} className="form-input pl-icon" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="confirm-pwd">Confirm New Password</label>
                <div className="input-with-icon">
                  <Lock size={15} className="input-icon" />
                  <input id="confirm-pwd" type="password" required placeholder="Re-enter new password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} className="form-input pl-icon" />
                </div>
              </div>
              <button type="submit" disabled={pwdSaving} className="btn btn-primary submit-btn">
                {pwdSaving ? <><Loader2 className="animate-spin" size={16} /> Saving...</> : <><CheckCircle size={15} /> Update Password</>}
              </button>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--glass-border);
          padding-bottom: 20px;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 15px;
        }
        .title-block { display: flex; align-items: center; gap: 14px; }
        .settings-icon { color: var(--accent-secondary); }
        .classroom-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--accent-primary-glow);
          border: 1px solid var(--accent-primary);
          color: var(--accent-secondary);
          font-size: 0.82rem;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: var(--radius-md);
        }
        .tabs-navigation {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--glass-border);
          padding-bottom: 8px;
        }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-weight: 600;
          padding: 10px 16px;
          cursor: pointer;
          border-radius: var(--radius-md) var(--radius-md) 0 0;
          transition: all var(--transition-fast);
          position: relative;
        }
        .tab-btn:hover { color: var(--text-primary); }
        .tab-btn.active { color: var(--accent-secondary); }
        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -9px; left: 0;
          width: 100%; height: 2px;
          background: var(--accent-secondary);
          box-shadow: 0 0 8px var(--accent-secondary-glow);
        }
        .admin-grid {
          display: grid;
          grid-template-columns: 1fr 1.6fr;
          gap: 30px;
          align-items: start;
        }
        @media (max-width: 992px) {
          .admin-grid { grid-template-columns: 1fr; }
          .admin-header { flex-direction: column; align-items: flex-start; }
        }
        .form-card, .list-card { padding: 24px; }
        .wide-card { max-width: 640px; }
        .single-col-section { display: flex; justify-content: center; }
        .card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--glass-border);
          padding-bottom: 12px;
        }
        .header-icon { color: var(--accent-secondary); }
        h2 { font-size: 1.2rem; font-weight: 700; margin: 0; }
        .slot-form { display: flex; flex-direction: column; gap: 14px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .submit-btn {
          display: flex; align-items: center; justify-content: center;
          gap: 8px; height: 44px; margin-top: 6px;
        }
        .input-with-icon { position: relative; }
        .input-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
        .pl-icon { padding-left: 40px; }
        .list-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; gap: 12px; color: var(--text-secondary); }
        .empty-state { padding: 50px 20px; }
        .day-group { margin-bottom: 20px; }
        .day-title { font-size: 0.95rem; color: var(--accent-secondary); margin-bottom: 10px; font-weight: 700; border-left: 3px solid var(--accent-secondary); padding-left: 8px; }
        .day-slots-grid { display: flex; flex-direction: column; gap: 8px; }
        .slot-item-card { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.04); }
        .slot-details { display: flex; flex-direction: column; gap: 2px; }
        .slot-subject { font-weight: 600; color: var(--text-primary); }
        .slot-time { font-size: 0.82rem; color: var(--accent-purple); font-weight: 600; }
        .slot-meta { font-size: 0.78rem; }
        .delete-slot-btn { background: transparent; border: 1px solid rgba(239,68,68,0.2); color: var(--error); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-md); cursor: pointer; transition: all var(--transition-fast); flex-shrink: 0; }
        .delete-slot-btn:hover { background: var(--error); color: white; border-color: var(--error); }
        /* CSV import */
        .example-info-block {
          display: flex; gap: 14px; align-items: flex-start;
          background: rgba(139,92,246,0.05);
          border: 1px solid rgba(139,92,246,0.2);
          border-radius: var(--radius-md);
          padding: 16px; margin-bottom: 20px;
        }
        .info-icon { color: var(--accent-purple); flex-shrink: 0; margin-top: 2px; }
        .example-info-block p { margin: 0 0 10px 0; font-size: 0.9rem; }
        .download-btn { display: inline-flex; align-items: center; gap: 6px; font-size: 0.85rem; padding: 8px 14px; height: auto; }
        .csv-columns-reference { margin-bottom: 22px; }
        .csv-columns-reference h3 { font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); margin-bottom: 10px; }
        .columns-grid { display: flex; flex-direction: column; gap: 6px; }
        .col-row { display: flex; align-items: center; gap: 12px; }
        .col-name { background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); padding: 3px 8px; border-radius: var(--radius-sm); font-size: 0.82rem; color: var(--accent-secondary); min-width: 130px; }
        .col-note { font-size: 0.82rem; }
        .csv-upload-form { display: flex; flex-direction: column; gap: 16px; }
        .file-drop-zone {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 8px; padding: 32px;
          border: 2px dashed var(--glass-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: center;
        }
        .file-drop-zone:hover { border-color: var(--accent-secondary); background: rgba(52,211,153,0.03); }
        .drop-icon { color: var(--text-muted); margin-bottom: 4px; }
        .file-drop-zone p { margin: 0; font-weight: 600; color: var(--text-secondary); }
        .file-drop-zone span { font-size: 0.8rem; }
        .selected-file-info { display: flex; align-items: center; gap: 8px; background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.2); padding: 8px 12px; border-radius: var(--radius-md); font-size: 0.88rem; color: #34d399; }
        .remove-file-btn { background: transparent; border: none; color: #34d399; cursor: pointer; margin-left: auto; display: flex; align-items: center; }
        .csv-errors-list { background: rgba(239,68,68,0.05); border: 1px solid var(--error-glow); border-radius: var(--radius-md); padding: 14px 16px; }
        .csv-errors-list h4 { margin: 0 0 8px 0; font-size: 0.9rem; color: var(--error); }
        .csv-error-row { margin: 4px 0; font-size: 0.82rem; color: var(--error); }
        /* Alerts */
        .alert-banner { display: flex; align-items: center; gap: 12px; padding: 14px 16px; margin-bottom: 20px; }
        .error-banner { border-color: var(--error-glow); background: rgba(239,68,68,0.05); color: var(--error); }
        .success-banner { border-color: rgba(52,211,153,0.3); background: rgba(52,211,153,0.05); color: #34d399; }
        .close-alert { background: none; border: none; cursor: pointer; color: inherit; margin-left: auto; display: flex; align-items: center; }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
