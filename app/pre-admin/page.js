// app/pre-admin/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, CalendarDays, Loader2, Plus, Trash2, ShieldAlert, Sparkles, BookOpen } from 'lucide-react';

export default function PreAdminDashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Timetable state
  const [schedule, setSchedule] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form state
  const [dayOfWeek, setDayOfWeek] = useState('Monday');
  const [subject, setSubject] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [teacher, setTeacher] = useState('');
  const [room, setRoom] = useState('');
  const [saving, setSaving] = useState(false);

  // 1. Verify Pre-Admin Auth
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated || data.role !== 'pre_admin') {
          router.push('/login');
        } else {
          setSession(data);
          setCheckingAuth(false);
          fetchTimetable(data.user.classroom_id);
        }
      })
      .catch((err) => {
        console.error('Pre-admin session check error:', err);
        router.push('/login');
      });
  }, [router]);

  const fetchTimetable = async (classroomId) => {
    try {
      setLoadingSchedule(true);
      setError(null);
      const res = await fetch(`/api/timetable?classroom_id=${classroomId}`);
      if (!res.ok) throw new Error('Failed to load timetable');
      const data = await res.json();
      setSchedule(data.schedule || []);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve the classroom timetable.');
    } finally {
      setLoadingSchedule(false);
    }
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!subject.trim() || !startTime || !endTime) {
      setError('Subject, Start Time, and End Time are required.');
      return;
    }

    const newSlot = {
      day_of_week: dayOfWeek,
      subject: subject.trim(),
      start_time: startTime + ':00', // ensure HH:MM:SS format
      end_time: endTime + ':00',
      teacher: teacher.trim() || null,
      room: room.trim() || null,
    };

    const updatedSchedule = [...schedule, newSlot];

    await saveSchedule(updatedSchedule, 'Lecture added successfully!');
  };

  const handleDeleteSlot = async (indexToDelete) => {
    setError(null);
    setSuccessMsg(null);

    const updatedSchedule = schedule.filter((_, idx) => idx !== indexToDelete);
    
    await saveSchedule(updatedSchedule, 'Lecture deleted successfully.');
  };

  const saveSchedule = async (newScheduleArray, successMessageText) => {
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

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save timetable');
      }

      setSchedule(newScheduleArray);
      setSuccessMsg(successMessageText);
      
      // Clear form inputs except dayOfWeek
      setSubject('');
      setStartTime('');
      setEndTime('');
      setTeacher('');
      setRoom('');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not update classroom timetable.');
    } finally {
      setSaving(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="loading-container">
        <Loader2 className="animate-spin text-secondary" size={40} />
        <p className="text-secondary">Verifying dashboard permissions...</p>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: calc(70vh - 100px);
            gap: 16px;
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

  // Helper to group classes by day of week
  const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  return (
    <div className="container admin-container fade-in">
      <header className="admin-header">
        <div className="title-block">
          <Settings size={28} className="settings-icon" />
          <h1>Pre-Admin Timetable Manager</h1>
        </div>
        <div className="welcome-block">
          <p className="text-secondary text-right">
            Roll/Email: <span className="admin-email">{session?.user?.roll_number || session?.user?.email}</span>
          </p>
          <div className="classroom-badge">
            <Sparkles size={12} />
            <span>Assigned Room: {session?.user?.classroom_name}</span>
          </div>
        </div>
      </header>

      {error && (
        <div className="error-banner glass-card">
          <ShieldAlert size={20} className="error-icon" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="success-banner glass-card">
          <Sparkles size={20} className="success-icon" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="admin-grid">
        {/* Left column: Add new slot form */}
        <section className="grid-item">
          <div className="glass-card form-card">
            <div className="card-header">
              <Plus size={20} className="header-icon" />
              <h2>Add Lecture Slot</h2>
            </div>
            
            <form onSubmit={handleAddSlot} className="slot-form">
              <div className="form-group">
                <label className="form-label" htmlFor="day-select">Day of Week</label>
                <select
                  id="day-select"
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  className="form-select"
                >
                  {daysOrder.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="subject-input">Subject Name</label>
                <input
                  id="subject-input"
                  type="text"
                  required
                  placeholder="e.g. Mathematics II"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="start-time-input">Start Time</label>
                  <input
                    id="start-time-input"
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="end-time-input">End Time</label>
                  <input
                    id="end-time-input"
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="teacher-input">Teacher / Professor (Optional)</label>
                <input
                  id="teacher-input"
                  type="text"
                  placeholder="e.g. Dr. Sanjay Surampudi"
                  value={teacher}
                  onChange={(e) => setTeacher(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="room-input">Room / Classroom Location (Optional)</label>
                <input
                  id="room-input"
                  type="text"
                  placeholder="e.g. LHB-302"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  className="form-input"
                />
              </div>

              <button type="submit" disabled={saving} className="btn btn-primary submit-btn">
                {saving ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Add to Timetable</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* Right column: Current timetable listings */}
        <section className="grid-item list-section-col">
          <div className="glass-card list-card">
            <div className="card-header">
              <CalendarDays size={20} className="header-icon" />
              <h2>Current Timetable for {session?.user?.classroom_name}</h2>
            </div>

            {loadingSchedule ? (
              <div className="list-loading">
                <Loader2 className="animate-spin" size={30} />
                <span>Loading active schedule...</span>
              </div>
            ) : schedule.length === 0 ? (
              <div className="empty-timetable-state text-center">
                <BookOpen size={40} className="empty-icon text-muted" />
                <h3>No entries found</h3>
                <p className="text-secondary">Fill in the form on the left to start building your class timetable.</p>
              </div>
            ) : (
              <div className="schedule-days-list">
                {daysOrder.map((day) => {
                  const daySlots = schedule.filter(s => s.day_of_week === day);
                  if (daySlots.length === 0) return null;

                  return (
                    <div key={day} className="day-group">
                      <h3 className="day-title">{day}</h3>
                      <div className="day-slots-grid">
                        {schedule.map((slot, idx) => {
                          if (slot.day_of_week !== day) return null;
                          return (
                            <div key={idx} className="slot-item-card glass-card">
                              <div className="slot-details">
                                <span className="slot-subject">{slot.subject}</span>
                                <span className="slot-time">
                                  {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                                </span>
                                {(slot.teacher || slot.room) && (
                                  <span className="slot-meta text-muted">
                                    {slot.room ? `Room: ${slot.room}` : ''}
                                    {slot.room && slot.teacher ? ' | ' : ''}
                                    {slot.teacher ? `Prof: ${slot.teacher}` : ''}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleDeleteSlot(idx)}
                                className="delete-slot-btn"
                                title="Delete lecture slot"
                                disabled={saving}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      <style jsx>{`
        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-bottom: 1px solid var(--glass-border);
          padding-bottom: 20px;
          margin-bottom: 25px;
          flex-wrap: wrap;
          gap: 15px;
        }

        .title-block {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .settings-icon {
          color: var(--accent-secondary);
        }

        .welcome-block {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
        }

        .admin-email {
          color: var(--accent-purple);
          font-weight: 600;
        }

        .classroom-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--accent-primary-glow);
          border: 1px solid var(--accent-primary);
          color: var(--accent-secondary);
          font-size: 0.8rem;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: var(--radius-md);
        }

        .admin-grid {
          display: grid;
          grid-template-columns: 1fr 1.6fr;
          gap: 30px;
          align-items: start;
        }

        @media (max-width: 992px) {
          .admin-grid {
            grid-template-columns: 1fr;
          }
          .admin-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .welcome-block {
            align-items: flex-start;
          }
        }

        .form-card, .list-card {
          padding: 24px;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--glass-border);
          padding-bottom: 12px;
        }

        .header-icon {
          color: var(--accent-secondary);
        }

        h2 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0;
        }

        .slot-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .submit-btn {
          margin-top: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 44px;
        }

        .list-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          gap: 12px;
          color: var(--text-secondary);
        }

        .empty-timetable-state {
          padding: 40px 20px;
        }

        .empty-icon {
          margin-bottom: 12px;
        }

        .day-group {
          margin-bottom: 20px;
        }

        .day-group:last-child {
          margin-bottom: 0;
        }

        .day-title {
          font-size: 1rem;
          color: var(--accent-secondary);
          margin-bottom: 10px;
          font-weight: 700;
          border-left: 3px solid var(--accent-secondary);
          padding-left: 8px;
        }

        .day-slots-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .slot-item-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .slot-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .slot-subject {
          font-weight: 600;
          color: var(--text-primary);
        }

        .slot-time {
          font-size: 0.82rem;
          color: var(--accent-purple);
          font-weight: 600;
        }

        .slot-meta {
          font-size: 0.8rem;
        }

        .delete-slot-btn {
          background: transparent;
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: var(--error);
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .delete-slot-btn:hover {
          background: var(--error);
          color: white;
          border-color: var(--error);
          box-shadow: 0 4px 10px var(--error-glow);
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          border-color: var(--error-glow);
          background: rgba(239, 68, 68, 0.05);
          color: var(--error);
          margin-bottom: 20px;
          padding: 14px;
        }

        .success-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          border-color: var(--accent-primary);
          background: rgba(52, 211, 153, 0.05);
          color: #34d399;
          margin-bottom: 20px;
          padding: 14px;
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
