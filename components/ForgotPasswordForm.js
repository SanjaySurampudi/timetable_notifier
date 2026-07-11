'use client';

import { useState } from 'react';
import { Mail, Loader2, X, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordForm({ onClose }) {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!identifier.trim()) {
      setError('Please enter your email or roll number.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setMessage(data.message || 'Reset instructions sent.');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-backdrop fade-in" onClick={onClose}>
      <div className="forgot-password-modal glass-card" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="modal-header">
          <h3>Reset Password</h3>
          <p className="text-secondary text-sm">
            Enter your college email address or roll number below, and we will send you a reset link if the account exists.
          </p>
        </div>

        {message ? (
          <div className="success-state">
            <CheckCircle2 size={40} className="success-icon" />
            <p className="success-text">{message}</p>
            <button className="btn btn-secondary mt-4 w-full" onClick={onClose}>
              Close Window
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form">
            {error && <p className="error-text text-sm mb-2">{error}</p>}
            <div className="form-group">
              <label className="form-label" htmlFor="forgot-identifier">
                Email or Roll Number
              </label>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon" />
                <input
                  id="forgot-identifier"
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. 210030010 or roll@college.edu"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" size={16} /> : 'Send Reset Link'}
              </button>
            </div>
          </form>
        )}
      </div>

      <style jsx>{`
        .forgot-password-backdrop {
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

        .forgot-password-modal {
          width: 90%;
          max-width: 440px;
          padding: 30px;
          position: relative;
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--glass-border);
          background: var(--bg-secondary);
        }

        .close-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: color var(--transition-fast);
        }

        .close-btn:hover {
          color: var(--text-primary);
        }

        .modal-header {
          margin-bottom: 24px;
          text-align: center;
        }

        .modal-header h3 {
          font-size: 1.3rem;
          margin-bottom: 8px;
        }

        .modal-form {
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
          width: 100%;
          background: rgba(10, 14, 23, 0.4);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
          height: 42px;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }

        .error-text {
          color: var(--error);
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid var(--error-glow);
          padding: 8px 12px;
          border-radius: var(--radius-sm);
        }

        .success-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 10px 0;
        }

        .success-icon {
          color: var(--success);
          margin-bottom: 16px;
        }

        .success-text {
          font-size: 0.95rem;
          line-height: 1.6;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 10px;
        }

        .modal-actions button {
          flex: 1;
          height: 42px;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        .mt-4 { margin-top: 16px; }
        .w-full { width: 100%; }
      `}</style>
    </div>
  );
}
