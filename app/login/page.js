// app/login/page.js
'use client';

import { useState, useEffect } from 'react';
import ForgotPasswordForm from '@/components/ForgotPasswordForm';
import { useRouter } from 'next/navigation';
import { Lock, User, UserCheck, Shield, AlertCircle, Mail, Loader2 } from 'lucide-react';
import ContactSection from '@/components/ContactSection';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('user'); // user, pre_admin, admin
  const [identifier, setIdentifier] = useState(''); // Email or Roll number
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForgot, setShowForgot] = useState(false);
  const [contactInfo, setContactInfo] = useState({ email: '', phone: '', address: '' });

  // Check session on load and redirect accordingly
  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          if (data.role === 'admin') {
            router.push('/admin');
          } else if (data.role === 'pre_admin') {
            router.push('/pre-admin');
          } else {
            router.push('/');
          }
        }
      })
      .catch(err => console.error('Error fetching session:', err));

    // Fetch contact info
    fetch('/api/admin/contact-info')
      .then((res) => res.json())
      .then((data) => {
        if (data.contact) setContactInfo(data.contact);
      })
      .catch((err) => console.error('Failed to load contact info', err));
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: activeTab,
          identifier: identifier,
          password: password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store a lightweight session hint in localStorage so Navbar renders instantly
      localStorage.setItem('session_hint', JSON.stringify({
        role: data.role,
        username: data.user?.roll_number || data.user?.email || data.user?.username || '',
      }));

      // Redirect depending on logged in role
      if (data.role === 'admin') {
        router.push('/admin');
      } else if (data.role === 'pre_admin') {
        router.push('/pre-admin');
      } else {
        router.push('/');
      }

      router.refresh();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIdentifier('');
    setPassword('');
    setError(null);
  };

  return (
    <div className="container login-container fade-in">
      <div className="login-card glass-card">
        { }
        <div className="login-header">
          <div className="lock-icon-badge">
            <Lock size={24} />
          </div>
          <h2>Timetable Portal</h2>
          <p className="text-secondary">
            Sign in to access your dashboard or view schedules.
          </p>
          {showForgot && <ForgotPasswordForm onClose={() => setShowForgot(false)} />}
        </div>

        {/* Tab Controls */}
        <div className="role-tabs">
          <button
            type="button"
            onClick={() => handleTabChange('user')}
            className={`tab-btn ${activeTab === 'user' ? 'active' : ''}`}
          >
            <User size={16} />
            <span>User</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('pre_admin')}
            className={`tab-btn ${activeTab === 'pre_admin' ? 'active' : ''}`}
          >
            <UserCheck size={16} />
            <span>Pre-Admin</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('admin')}
            className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
          >
            <Shield size={16} />
            <span>Admin</span>
          </button>
        </div>

        {error && (
          <div className="error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        { }
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="username-input">
              {activeTab === 'admin'
                ? 'Admin Email Address'
                : 'College Roll Number / College Email'}
            </label>
            <div className="input-with-icon">
              {activeTab === 'admin' ? (
                <Mail size={16} className="input-icon" />
              ) : (
                <User size={16} className="input-icon" />
              )}
              <input
                id="username-input"
                type={activeTab === 'admin' ? 'email' : 'text'}
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="form-input"
                placeholder={activeTab === 'admin' ? 'admin@college.edu' : 'e.g. 210030010 or roll@college.edu'}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password-input">
              Password
            </label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                id="password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading} className="btn btn-primary submit-btn">
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                `Sign In`
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="btn btn-link forgot-btn"
            >
              Forgot Password?
            </button>
          </div>
        </form>
        <ContactSection />
      </div>

      { }
      <style jsx>{`
        .login-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: calc(80vh - 100px);
        }

        .login-card {
          width: 100%;
          max-width: 450px;
          padding: 35px 25px;
        }

        .login-header {
          text-align: center;
          margin-bottom: 25px;
        }

        .lock-icon-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 54px;
          height: 54px;
          border-radius: var(--radius-lg);
          background: var(--accent-primary-glow);
          border: 1px solid var(--accent-primary);
          color: var(--accent-secondary);
          margin-bottom: 12px;
        }

        h2 {
          font-size: 1.6rem;
          margin-bottom: 6px;
        }

        p {
          font-size: 0.88rem;
        }

        .role-tabs {
          display: flex;
          background: rgba(10, 14, 23, 0.5);
          border: 1px solid var(--glass-border);
          padding: 4px;
          border-radius: var(--radius-md);
          margin-bottom: 25px;
          gap: 4px;
        }

        .role-tabs .tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 8px 0;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }

        .role-tabs .tab-btn:hover {
          color: var(--text-primary);
        }

        .role-tabs .tab-btn.active {
          background: var(--accent-primary-glow);
          color: var(--accent-secondary);
          border: 1px solid var(--accent-primary);
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .input-with-icon {
          position: relative;
          width: 100%;
        }

        .input-with-icon :global(.form-input) {
          padding-left: 44px;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }

        .form-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 10px;
          width: 100%;
        }

        .submit-btn {
          flex: 1;
          height: 48px;
        }

        .forgot-btn {
          background: transparent;
          border: none;
          color: var(--accent-secondary, #3b82f6);
          font-size: 0.88rem;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          padding: 8px 12px;
          transition: opacity 0.2s;
        }

        .forgot-btn:hover {
          text-decoration: underline;
          opacity: 0.85;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid var(--error-glow);
          color: var(--error);
          padding: 12px;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          margin-bottom: 20px;
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