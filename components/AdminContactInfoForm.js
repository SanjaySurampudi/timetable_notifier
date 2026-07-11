'use client';

import { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Loader2, Save, CheckCircle2 } from 'lucide-react';

export default function AdminContactInfoForm() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/contact-info')
      .then((res) => res.json())
      .then((data) => {
        if (data.contact) {
          setEmail(data.contact.email || '');
          setPhone(data.contact.phone || '');
          setAddress(data.contact.address || '');
        }
      })
      .catch((err) => {
        console.error('Failed to fetch contact info:', err);
        setError('Could not retrieve contact information.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch('/api/admin/contact-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone, address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save contact info');
      setSuccess('Contact information updated successfully.');
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <Loader2 className="animate-spin" size={24} />
        <span>Loading contact configuration...</span>
      </div>
    );
  }

  return (
    <div className="glass-card contact-config-card">
      <div className="card-header">
        <Mail size={20} className="header-icon" />
        <h2>Public Contact Information</h2>
      </div>
      <p className="text-secondary text-sm">
        This information is shown to standard users and guests on the login page if they need to reach out or request a timetable.
      </p>

      {success && (
        <div className="success-banner">
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      {error && <div className="error-banner"><span>{error}</span></div>}

      <form onSubmit={handleSubmit} className="contact-config-form">
        <div className="form-group">
          <label className="form-label" htmlFor="contact-email">Contact Email</label>
          <div className="input-with-icon">
            <Mail size={16} className="input-icon" />
            <input
              id="contact-email"
              type="email"
              required
              className="form-input"
              placeholder="e.g. support@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="contact-phone">Contact Phone Number</label>
          <div className="input-with-icon">
            <Phone size={16} className="input-icon" />
            <input
              id="contact-phone"
              type="text"
              className="form-input"
              placeholder="e.g. +91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="contact-address">Contact Address / Office Location</label>
          <div className="input-with-icon">
            <MapPin size={16} className="input-icon" />
            <input
              id="contact-address"
              type="text"
              className="form-input"
              placeholder="e.g. Block A, Room 102, College Campus"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary submit-btn" disabled={saving}>
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          <span>{saving ? 'Saving changes...' : 'Save Contact Info'}</span>
        </button>
      </form>

      <style jsx>{`
        .contact-config-card {
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

        .contact-config-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-top: 8px;
        }

        .input-with-icon {
          position: relative;
          width: 100%;
        }

        .input-with-icon :global(.form-input) {
          padding-left: 44px;
          width: 100%;
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
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 6px;
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 40px;
          color: var(--text-secondary);
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
