'use client';

import { useState } from 'react';
import { Lock, Loader2, CheckCircle2 } from 'lucide-react';

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');
      setSuccess(data.message || 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card change-password-card">
      <div className="card-header">
        <Lock size={20} className="header-icon" />
        <h2>Change Password</h2>
      </div>

      {success && (
        <div className="success-banner">
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      {error && <div className="error-banner"><span>{error}</span></div>}

      <form onSubmit={handleSubmit} className="change-password-form">
        <div className="form-group">
          <label className="form-label" htmlFor="current-password">Current Password</label>
          <input
            id="current-password"
            type="password"
            className="form-input"
            placeholder="Enter current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="new-password">New Password</label>
          <input
            id="new-password"
            type="password"
            className="form-input"
            placeholder="Enter new password (min 4 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="confirm-password">Confirm New Password</label>
          <input
            id="confirm-password"
            type="password"
            className="form-input"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary submit-btn" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={16} /> : 'Update Password'}
        </button>
      </form>

      <style jsx>{`
        .change-password-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid var(--glass-border);
          padding-bottom: 10px;
        }

        .header-icon {
          color: var(--accent-secondary);
        }

        h2 {
          font-size: 1.2rem;
          font-weight: 700;
          margin: 0;
        }

        .change-password-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .submit-btn {
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 6px;
        }

        .success-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid var(--success-glow);
          color: var(--success);
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
        }

        .error-banner {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid var(--error-glow);
          color: var(--error);
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
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
