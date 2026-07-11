'use client';

import { useState, useEffect } from 'react';
import { BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import PushRegister from '@/components/PushRegister';
import TimetableGrid from '@/components/TimetableGrid';
import ChatBot from '@/components/ChatBot';
import ContactSection from '@/components/ContactSection';

export default function HomePage() {
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [selectedClassroomName, setSelectedClassroomName] = useState('');
  const [schedule, setSchedule] = useState([]);
  
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [error, setError] = useState(null);

  const fetchClassrooms = async () => {
    try {
      setLoadingClassrooms(true);
      const res = await fetch('/api/classrooms');
      if (!res.ok) throw new Error('Failed to load classrooms');
      const data = await res.json();
      
      setClassrooms(data.classrooms || []);

      // Restore cached classroom if it still exists
      const cachedId = localStorage.getItem('preferred_classroom_id');
      if (cachedId && data.classrooms.some(c => c.id === cachedId)) {
        setSelectedClassroomId(cachedId);
        const classroom = data.classrooms.find(c => c.id === cachedId);
        setSelectedClassroomName(classroom?.name || '');
      } else if (data.classrooms.length > 0) {
        // Fallback to first classroom
        setSelectedClassroomId(data.classrooms[0].id);
        setSelectedClassroomName(data.classrooms[0].name);
      }
    } catch (err) {
      console.error(err);
      setError('Could not connect to the database. Make sure environment variables are configured.');
    } finally {
      setLoadingClassrooms(false);
    }
  };

  const fetchTimetable = async (classroomId) => {
    try {
      setLoadingSchedule(true);
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

  // 1. Fetch classrooms on load
  useEffect(() => {
    setTimeout(() => {
      fetchClassrooms();
    }, 0);
  }, []);

  // 2. Fetch timetable when classroom selection changes
  useEffect(() => {
    if (selectedClassroomId) {
      setTimeout(() => {
        fetchTimetable(selectedClassroomId);
      }, 0);
      // Cache selected classroom
      localStorage.setItem('preferred_classroom_id', selectedClassroomId);
    } else {
      setTimeout(() => {
        setSchedule([]);
      }, 0);
    }
  }, [selectedClassroomId]);

  const handleClassroomChange = (e) => {
    const id = e.target.value;
    setSelectedClassroomId(id);
    const cls = classrooms.find((c) => c.id === id);
    setSelectedClassroomName(cls ? cls.name : '');
  };

  return (
    <div className="container fade-in">
      {/* Hero Welcome Header */}
      <section className="hero-section">
        <h1 className="hero-title">Never Miss a Lecture.</h1>
        <p className="hero-subtitle text-secondary">
          Select your class, view your daily timetable, and enable push notifications to receive real-time alerts 10 minutes before every class.
        </p>
      </section>

      {error && (
        <div className="error-banner glass-card">
          <AlertCircle size={20} className="error-icon" />
          <span>{error}</span>
        </div>
      )}

      {/* Classroom Selection Controls */}
      <div className="controls-grid">
        <div className="glass-card selection-card">
          <label className="form-label" htmlFor="classroom-select">Select Classroom</label>
          {loadingClassrooms ? (
            <div className="dropdown-loading">
              <Loader2 className="animate-spin text-secondary" size={20} />
              <span>Loading classes...</span>
            </div>
          ) : classrooms.length > 0 ? (
            <select
              id="classroom-select"
              value={selectedClassroomId}
              onChange={handleClassroomChange}
              className="form-select classroom-dropdown"
            >
              {classrooms.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="no-classrooms-info text-muted">
              No classrooms available. Please ask the administrator to create one.
            </div>
          )}
        </div>

        {/* Web Push Subscription Component */}
        {selectedClassroomId && (
          <PushRegister 
            classroomId={selectedClassroomId} 
            classroomName={selectedClassroomName} 
          />
        )}
      </div>

      {/* Timetable Section */}
      {selectedClassroomId ? (
        <div className="timetable-section slide-up">
          <div className="section-header">
            <BookOpen size={20} className="section-icon" />
            <h2>Timetable for {selectedClassroomName}</h2>
          </div>

          {loadingSchedule ? (
            <div className="schedule-loading">
              <Loader2 className="animate-spin text-secondary" size={32} />
              <p className="text-secondary">Retrieving schedule details...</p>
            </div>
          ) : (
            <TimetableGrid schedule={schedule} />
          )}
        </div>
      ) : (
        !loadingClassrooms && (
          <div className="welcome-placeholder glass-card text-center">
            <BookOpen size={48} className="placeholder-icon" />
            <h3>No Classroom Selected</h3>
            <p className="text-secondary">Please select or add a classroom above to view the schedule.</p>
          </div>
        )
      )}

      {/* Contact section for requesting timetable additions */}
      <ContactSection />

      {/* Floating AI Timetable Chatbot */}
      <ChatBot schedule={schedule} classroomName={selectedClassroomName} />

      <style jsx>{`
        .hero-section {
          text-align: center;
          margin-bottom: 40px;
        }

        .hero-title {
          font-size: 2.8rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--text-primary) 30%, var(--accent-secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 12px;
        }

        .hero-subtitle {
          font-size: 1.1rem;
          max-width: 650px;
          margin: 0 auto;
        }

        .controls-grid {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 24px;
          margin-bottom: 36px;
        }

        @media (max-width: 768px) {
          .controls-grid {
            grid-template-columns: 1fr;
          }
          .hero-title {
            font-size: 2.2rem;
          }
        }

        .selection-card {
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .dropdown-loading {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          background: rgba(10, 14, 23, 0.4);
          border-radius: var(--radius-md);
        }

        .classroom-dropdown {
          background: var(--bg-tertiary);
          font-weight: 600;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          border-color: var(--error-glow);
          background: rgba(239, 68, 68, 0.05);
          color: var(--error);
          margin-bottom: 24px;
          padding: 16px;
        }

        .error-icon {
          flex-shrink: 0;
        }

        .timetable-section {
          margin-top: 20px;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .section-icon {
          color: var(--accent-secondary);
        }

        .schedule-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 250px;
          gap: 16px;
        }

        .welcome-placeholder {
          padding: 60px 20px;
        }

        .placeholder-icon {
          color: var(--text-muted);
          margin-bottom: 16px;
        }

        .no-classrooms-info {
          font-size: 0.9rem;
          padding: 12px;
          text-align: center;
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
