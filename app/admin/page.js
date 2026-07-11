'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, ShieldAlert, Loader2, CalendarDays, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ClassManager from '@/components/ClassManager';
import AdminUpload from '@/components/AdminUpload';
import RequestManager from '@/components/RequestManager';

export default function AdminPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [classrooms, setClassrooms] = useState([]);
  const [activeTab, setActiveTab] = useState('timetables'); // timetables, requests
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const [error, setError] = useState(null);

  const fetchClassrooms = async () => {
    try {
      setLoadingClassrooms(true);
      setError(null);
      const res = await fetch('/api/classrooms');
      if (!res.ok) throw new Error('Failed to load classrooms');
      const data = await res.json();
      setClassrooms(data.classrooms || []);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve classrooms from the database.');
    } finally {
      setLoadingClassrooms(false);
    }
  };

  const fetchRequestsCount = async () => {
    try {
      const { data: { session: activeSession } } = await supabase.auth.getSession();
      const token = activeSession?.access_token;
      if (!token) return;

      const res = await fetch('/api/requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const pendingCount = (data.requests || []).filter(r => r.status === 'pending').length;
        setPendingRequestsCount(pendingCount);
      }
    } catch (err) {
      console.error('Error fetching requests count:', err);
    }
  };

  useEffect(() => {
    // Check session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        setSession(session);
        setCheckingAuth(false);
        fetchClassrooms();
        fetchRequestsCount();
      }
    });

    // Handle session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/login');
      } else {
        setSession(session);
        setCheckingAuth(false);
        fetchRequestsCount();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="loading-container">
        <Loader2 className="animate-spin text-secondary" size={40} />
        <p className="text-secondary">Verifying administrator session...</p>
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
    <div className="container admin-container fade-in">
      <header className="admin-header">
        <div className="title-block">
          <Settings size={28} className="settings-icon animate-spin-slow" />
          <h1>Admin Dashboard</h1>
        </div>
        <p className="text-secondary">
          Logged in as: <span className="admin-email">{session?.user?.email}</span>
        </p>
      </header>

      {error && (
        <div className="error-banner glass-card">
          <ShieldAlert size={20} className="error-icon" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tabs-navigation">
        <button
          onClick={() => setActiveTab('timetables')}
          className={`tab-btn ${activeTab === 'timetables' ? 'active' : ''}`}
        >
          <CalendarDays size={18} />
          <span>Timetables & Classes</span>
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
        >
          <MessageSquare size={18} />
          <span>User Requests</span>
          {pendingRequestsCount > 0 && (
            <span className="pending-badge animate-pulse">{pendingRequestsCount}</span>
          )}
        </button>
      </div>

      {activeTab === 'timetables' ? (
        <div className="admin-grid">
          {/* Left Side: Classrooms List Manager */}
          <section className="grid-item">
            {loadingClassrooms && classrooms.length === 0 ? (
              <div className="section-loading">
                <Loader2 className="animate-spin" size={24} />
              </div>
            ) : (
              <ClassManager 
                classrooms={classrooms} 
                onClassroomsChanged={fetchClassrooms} 
              />
            )}
          </section>

          {/* Right Side: PDF Timetable Upload Form */}
          <section className="grid-item">
            <AdminUpload classrooms={classrooms} />
          </section>
        </div>
      ) : (
        <div className="requests-section fade-in">
          <RequestManager onRequestsChanged={fetchRequestsCount} />
        </div>
      )}

      <style jsx>{`
        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-bottom: 1px solid var(--glass-border);
          padding-bottom: 20px;
          margin-bottom: 20px;
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

        .admin-email {
          color: var(--accent-purple);
          font-weight: 600;
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
          font-size: 0.92rem;
          font-weight: 600;
          padding: 10px 16px;
          cursor: pointer;
          border-radius: var(--radius-md) var(--radius-md) 0 0;
          transition: all var(--transition-fast);
          position: relative;
        }

        .tab-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.02);
        }

        .tab-btn.active {
          color: var(--accent-secondary);
          background: transparent;
        }

        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -9px;
          left: 0;
          width: 100%;
          height: 2px;
          background: var(--accent-secondary);
          box-shadow: 0 0 8px var(--accent-secondary-glow);
        }

        .pending-badge {
          background: var(--error);
          color: white;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 18px;
          text-align: center;
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.06); }
          100% { transform: scale(1); }
        }

        .animate-pulse {
          animation: pulse 2s infinite ease-in-out;
        }

        .requests-section {
          animation: fadeIn var(--transition-normal);
        }

        .admin-grid {
          display: grid;
          grid-template-columns: 1fr 1.8fr;
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
        }

        .section-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 200px;
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

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        .animate-spin-slow {
          animation: spinSlow 12s linear infinite;
        }
      `}</style>
    </div>
  );
}

