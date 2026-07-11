// components/Navbar.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, Lock, LayoutDashboard, LogOut, Bell, User } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  // Initialise immediately from localStorage hint — no async needed, no flash
  const [sessionHint, setSessionHint] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('session_hint');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Confirm with the server in the background and sync if the hint is stale
  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          const hint = {
            role: data.role,
            username: data.user?.roll_number || data.user?.email || data.user?.username || '',
          };
          localStorage.setItem('session_hint', JSON.stringify(hint));
          setSessionHint(hint);
        } else {
          // Server says no valid session — clear stale hint
          localStorage.removeItem('session_hint');
          setSessionHint(null);
        }
      })
      .catch(() => {
        // Network error — keep showing whatever the hint says
      });

    const onSessionChanged = () => {
      try {
        const raw = localStorage.getItem('session_hint');
        setSessionHint(raw ? JSON.parse(raw) : null);
      } catch {
        setSessionHint(null);
      }
    };
    window.addEventListener('session-changed', onSessionChanged);
    return () => window.removeEventListener('session-changed', onSessionChanged);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // best effort
    }
    localStorage.removeItem('session_hint');
    setSessionHint(null);
    window.dispatchEvent(new Event('session-changed'));
    router.push('/login');
    router.refresh();
  };

  const isLoggedIn = !!sessionHint;
  const role = sessionHint?.role;
  const username = sessionHint?.username;

  return (
    <header className="navbar-container">
      <div className="container navbar-inner">
        <Link href={isLoggedIn ? (role === 'admin' ? '/admin' : role === 'pre_admin' ? '/pre-admin' : '/') : '/login'} className="logo">
          <Calendar className="logo-icon" size={24} />
          <span>Timetable <span className="logo-accent">Notifier</span></span>
        </Link>

        <nav className="nav-links">
          {isLoggedIn && (
            <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
              <Bell size={18} />
              <span>Schedules</span>
            </Link>
          )}

          {isLoggedIn ? (
            <>
              {role === 'admin' && (
                <Link href="/admin" className={`nav-link ${pathname === '/admin' ? 'active' : ''}`}>
                  <LayoutDashboard size={18} />
                  <span>Admin Panel</span>
                </Link>
              )}

              {role === 'pre_admin' && (
                <Link href="/pre-admin" className={`nav-link ${pathname === '/pre-admin' ? 'active' : ''}`}>
                  <LayoutDashboard size={18} />
                  <span>Class Dashboard</span>
                </Link>
              )}

              <div className="user-badge-nav">
                <User size={14} />
                <span className="badge-text" title={username}>
                  {role === 'admin' ? 'Admin' : username || 'User'}
                </span>
              </div>

              <button onClick={handleLogout} className="logout-btn">
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <Link href="/login" className={`login-link-btn ${pathname === '/login' ? 'active' : ''}`}>
              <Lock size={16} />
              <span>Login Portal</span>
            </Link>
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

        .logo-icon { color: var(--accent-secondary); }

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
          max-width: 140px;
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
