// app/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, AlertCircle, Loader2, Search, BellRing, Sparkles, KeyRound, X } from 'lucide-react';
import PushRegister from '@/components/PushRegister';
import TimetableGrid from '@/components/TimetableGrid';
import ChatBot from '@/components/ChatBot';
import ContactSection from '@/components/ContactSection';
import ChangePasswordForm from '@/components/ChangePasswordForm';

export default function HomePage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [selectedClassroomName, setSelectedClassroomName] = useState('');
  const [schedule, setSchedule] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [error, setError] = useState(null);
  const [showChangePwd, setShowChangePwd] = useState(false);

  // 1. Verify User/Role Session first
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push('/login');
        } else {
          setSession(data);
          setCheckingAuth(false);
          fetchClassrooms();
        }
      })
      .catch((err) => {
        console.error('Session check error:', err);
        router.push('/login');
      });
  }, [router]);

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

  // Fetch timetable when classroom selection changes
  useEffect(() => {
    if (selectedClassroomId) {
      fetchTimetable(selectedClassroomId);
      localStorage.setItem('preferred_classroom_id', selectedClassroomId);
    } else {
      setSchedule([]);
    }
  }, [selectedClassroomId]);

  // Filter classrooms based on search query
  const filteredClassrooms = classrooms.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (checkingAuth) {
    return (
      <div className="loading-container">
        <Loader2 className="animate-spin text-secondary" size={40} />
        <p className="text-secondary">Checking portal credentials...</p>
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

  return (
    <div className="container fade-in">
      {/* Hero Welcome Header */}
      <section className="hero-section">
        <div className="welcome-tag" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} />
            <span>Logged in as {session?.user?.roll_number || session?.user?.email || 'User'}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setShowChangePwd(true)} 
            className="btn-change-pwd"
          >
            <KeyRound size={12} />
            <span>Change Password</span>
          </button>
        </div>
        <h1 className="hero-title">Never Miss a Lecture.</h1>
        <p className="hero-subtitle text-secondary">
          Search your classroom section, view your daily timetable, and enable push notifications to receive real-time alerts.
        </p>
      </section>

      {error && (
        <div className="error-banner glass-card">
          <AlertCircle size={20} className="error-icon" />
          <span>{error}</span>
        </div>
      )}

      {/* Classroom Selection Controls & Search */}
      <div className="controls-grid">
        <div className="glass-card selection-card">
          <label className="form-label" htmlFor="classroom-search">Search Section / Classroom</label>
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon-inside" />
            <input
              id="classroom-search"
              type="text"
              placeholder="Type section (e.g. CS-A, Mechanical...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input search-input"
            />
          </div>

          {/* Search Dropdown / Filtering Results */}
          {searchQuery && (
            <div className="search-results-overlay">
              {filteredClassrooms.length > 0 ? (
                filteredClassrooms.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => {
                      setSelectedClassroomId(cls.id);
                      setSelectedClassroomName(cls.name);
                      setSearchQuery(''); // clear query on select
                    }}
                    className={`search-result-btn ${selectedClassroomId === cls.id ? 'active-item' : ''}`}
                  >
                    {cls.name}
                  </button>
                ))
              ) : (
                <div className="search-no-results text-muted">No sections match "{searchQuery}"</div>
              )}
            </div>
          )}

          {/* Fallback Selector when not searching */}
          {!searchQuery && (
            <div className="dropdown-fallback-section">
              <span className="text-secondary select-hint-label">Or choose from list:</span>
              {loadingClassrooms ? (
                <div className="dropdown-loading">
                  <Loader2 className="animate-spin text-secondary" size={16} />
                  <span>Loading classes...</span>
                </div>
              ) : classrooms.length > 0 ? (
                <select
                  value={selectedClassroomId}
                  onChange={(e) => {
                    setSelectedClassroomId(e.target.value);
                    const cls = classrooms.find((c) => c.id === e.target.value);
                    setSelectedClassroomName(cls ? cls.name : '');
                  }}
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
            <p className="text-secondary">Please search or select a classroom above to view the schedule.</p>
          </div>
        )
      )}

      {/* Contact section for requesting timetable additions */}
      <ContactSection />

      {/* Floating AI Timetable Chatbot */}
      <ChatBot schedule={schedule} classroomName={selectedClassroomName} />

      <style jsx>{`
        .welcome-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--accent-primary-glow);
          border: 1px solid var(--accent-primary);
          color: var(--accent-secondary);
          font-size: 0.82rem;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: var(--radius-lg);
          margin-bottom: 16px;
        }

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
          position: relative;
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon-inside {
          position: absolute;
          left: 14px;
          color: var(--text-muted);
          pointer-events: none;
        }

        .search-input {
          padding-left: 42px;
          width: 100%;
        }

        .search-results-overlay {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: var(--bg-tertiary);
          border: 1px solid var(--glass-border);
          border-radius: 0 0 var(--radius-md) var(--radius-md);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
          z-index: 50;
          max-height: 200px;
          overflow-y: auto;
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .search-result-btn {
          width: 100%;
          text-align: left;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 8px 12px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }

        .search-result-btn:hover {
          background: var(--glass-highlight);
          color: var(--text-primary);
        }

        .search-result-btn.active-item {
          background: var(--accent-primary-glow);
          color: var(--accent-secondary);
          font-weight: 600;
        }

        .search-no-results {
          padding: 12px;
          text-align: center;
          font-size: 0.88rem;
        }

        .dropdown-fallback-section {
          margin-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .select-hint-label {
          font-size: 0.78rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .dropdown-loading {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          background: rgba(10, 14, 23, 0.4);
          border-radius: var(--radius-md);
          font-size: 0.88rem;
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

        .change-password-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(10, 14, 23, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .change-password-modal {
          width: 90%;
          max-width: 440px;
          position: relative;
        }

        .change-password-modal :global(.close-btn) {
          position: absolute;
          top: 24px;
          right: 24px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: color var(--transition-fast);
          z-index: 10;
        }

        .change-password-modal :global(.close-btn):hover {
          color: var(--text-primary);
        }

        .btn-change-pwd {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-weight: 500;
          font-size: 0.8rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }

        .btn-change-pwd:hover {
          color: var(--accent-secondary);
          background: var(--glass-highlight);
        }
      `}</style>
      {showChangePwd && (
        <div className="change-password-backdrop" onClick={() => setShowChangePwd(false)}>
          <div className="change-password-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowChangePwd(false)} aria-label="Close modal">
              <X size={18} />
            </button>
            <ChangePasswordForm />
          </div>
        </div>
      )}
    </div>
  );
}
