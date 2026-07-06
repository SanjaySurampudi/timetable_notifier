'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, Lock, LayoutDashboard, LogOut, Bell } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="navbar-container">
      <div className="container navbar-inner">
        <Link href="/" className="logo">
          <Calendar className="logo-icon" size={24} />
          <span>Timetable <span className="logo-accent">Notifier</span></span>
        </Link>

        <nav className="nav-links">
          <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
            <Bell size={18} />
            <span>Schedules</span>
          </Link>

          {!loading && (
            <>
              {session ? (
                <>
                  <Link 
                    href="/admin" 
                    className={`nav-link ${pathname === '/admin' ? 'active' : ''}`}
                  >
                    <LayoutDashboard size={18} />
                    <span>Dashboard</span>
                  </Link>
                  <button onClick={handleLogout} className="logout-btn">
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <Link 
                  href="/login" 
                  className={`login-link-btn ${pathname === '/login' ? 'active' : ''}`}
                >
                  <Lock size={16} />
                  <span>Admin Login</span>
                </Link>
              )}
            </>
          )}
        </nav>
      </div>
      
      <style jsx>{`
        .navbar-container {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(10, 14, 23, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--glass-border);
          padding: 16px 0;
        }
        
        .navbar-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-title);
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .logo-icon {
          color: var(--accent-secondary);
        }

        .logo-accent {
          background: linear-gradient(135deg, var(--accent-secondary), var(--accent-purple));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
          font-size: 0.95rem;
          font-weight: 500;
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }

        .nav-link:hover, .nav-link.active {
          color: var(--text-primary);
          background: var(--glass-highlight);
        }

        .nav-link.active {
          border-bottom: 2px solid var(--accent-secondary);
          border-radius: var(--radius-sm) var(--radius-sm) 0 0;
          background: transparent;
        }

        .login-link-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-tertiary);
          border: 1px solid var(--glass-border);
          color: var(--text-primary);
          padding: 8px 16px;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          font-weight: 600;
          transition: all var(--transition-normal);
        }

        .login-link-btn:hover, .login-link-btn.active {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          box-shadow: 0 4px 12px var(--accent-primary-glow);
        }

        .logout-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: 1px solid var(--error-glow);
          color: var(--error);
          padding: 8px 16px;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-normal);
        }

        .logout-btn:hover {
          background: var(--error);
          color: white;
          box-shadow: 0 4px 12px var(--error-glow);
        }
      `}</style>
    </header>
  );
}
