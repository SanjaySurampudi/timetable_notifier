'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, ShieldAlert, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ClassManager from '@/components/ClassManager';
import AdminUpload from '@/components/AdminUpload';

export default function AdminPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [classrooms, setClassrooms] = useState([]);
  
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        setSession(session);
        setCheckingAuth(false);
        fetchClassrooms();
      }
    });

    // Handle session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/login');
      } else {
        setSession(session);
        setCheckingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

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

      <style jsx>{`
        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-bottom: 1px solid var(--glass-border);
          padding-bottom: 20px;
          margin-bottom: 30px;
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
