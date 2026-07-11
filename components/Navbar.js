// components/Navbar.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, Lock, LayoutDashboard, LogOut, Bell, User } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch unified session details
  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setSession(data);
        } else {
          setSession(null);
        }
      }
    } catch (err) {
      console.error('Failed to retrieve session:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    // Add custom event listener for session refresh if needed
    window.addEventListener('session-changed', fetchSession);
    return () => window.removeEventListener('session-changed', fetchSession);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setSession(null);
      
      // Dispatch event to update other components
      window.dispatchEvent(new Event('session-changed'));
      
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  return (
    <header className="navbar-container">
      <div className="container navbar-inner">
        <Link href="/" className="logo">
          <Calendar className="logo-icon" size={24} />
          <span>Timetable <span className="logo-accent">Notifier</span></span>
        </Link>

        <nav className="nav-links">
          {session && (
            <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
              <Bell size={18} />
              <span>Schedules</span>
            </Link>
          )}

          {!loading && (
            <>
              {session ? (
                <>
                  {session.role === 'admin' && (
                    <Link 
                      href="/admin" 
                      className={`nav-link ${pathname === '/admin' ? 'active' : ''}`}
                    >
                      <LayoutDashboard size={18} />
                      <span>Admin Panel</span>
                    </Link>
                  )}

                  {session.role === 'pre_admin' && (
                    <Link 
                      href="/pre-admin" 
                      className={`nav-link ${pathname === '/pre-admin' ? 'active' : ''}`}
                    >
                      <LayoutDashboard size={18} />
                      <span>Class Dashboard</span>
                    </Link>
                  )}

                  <div className="user-badge-nav">
                    <User size={14} />
                    <span className="badge-text" title={session.user.email || session.user.roll_number}>
                      {session.role === 'admin' 
                        ? 'Admin' 
                        : (session.user.roll_number || session.user.email || 'Pre-Admin')}
                    </span>
                  </div>

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
                  <span>Login Portal</span>
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

        .user-badge-nav {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          padding: 6px 12px;
          border-radius: var(--radius-md);
          color: var(--accent-purple);
          font-size: 0.85rem;
          font-weight: 600;
        }

        .badge-text {
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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
