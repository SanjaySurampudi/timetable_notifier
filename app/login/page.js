'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Redirect to admin dashboard if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/admin');
      }
    });
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      router.push('/admin');
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container login-container fade-in">
      <div className="login-card glass-card">
        <div className="login-header">
          <div className="lock-icon-badge">
            <Lock size={24} />
          </div>
          <h2>Admin Access</h2>
          <p className="text-secondary">Sign in to manage classrooms and upload schedules.</p>
        </div>

        {error && (
          <div className="error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email-input">Email Address</label>
            <div className="input-with-icon">
              <Mail size={16} className="input-icon" />
              <input
                id="email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.value || e.target.value)}
                className="form-input"
                placeholder="admin@school.com"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password-input">Password</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                id="password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.value || e.target.value)}
                className="form-input"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary submit-btn">
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>

      <style jsx>{`
        .login-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: calc(80vh - 100px);
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          padding: 40px 30px;
        }

        .login-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .lock-icon-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 60px;
          height: 60px;
          border-radius: var(--radius-lg);
          background: var(--accent-primary-glow);
          border: 1px solid var(--accent-primary);
          color: var(--accent-secondary);
          margin-bottom: 16px;
        }

        h2 {
          font-size: 1.8rem;
          margin-bottom: 8px;
        }

        p {
          font-size: 0.9rem;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 4px;
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

        .submit-btn {
          margin-top: 15px;
          width: 100%;
          height: 48px;
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
