'use client';

import { useState, useEffect } from 'react';
import { Settings, Loader2, Save, CheckCircle2 } from 'lucide-react';

export default function AppSettingsForm() {
  const [expirySeconds, setExpirySeconds] = useState(604800); // default 7 days
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  // Expiry preset mapping
  const presets = [
    { label: '1 Hour', value: 3600 },
    { label: '6 Hours', value: 21600 },
    { label: '12 Hours', value: 43200 },
    { label: '24 Hours', value: 86400 },
    { label: '7 Days', value: 604800 },
    { label: '30 Days', value: 2592000 }
  ];

  const [selectedPreset, setSelectedPreset] = useState(604800);
  const [customMinutes, setCustomMinutes] = useState(10080); // 7 days in minutes

  useEffect(() => {
    fetch('/api/admin/app-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          const expiryObj = data.settings.find(s => s.key === 'session_expiry_seconds');
          if (expiryObj) {
            const val = parseInt(expiryObj.value, 10);
            if (!isNaN(val)) {
              setExpirySeconds(val);
              setCustomMinutes(Math.round(val / 60));
              
              // Find matching preset
              const matchingPreset = presets.find(p => p.value === val);
              if (matchingPreset) {
                setSelectedPreset(val);
              } else {
                setSelectedPreset('custom');
              }
            }
          }
        }
      })
      .catch((err) => {
        console.error('Failed to fetch settings:', err);
        setError('Could not retrieve application settings.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePresetChange = (e) => {
    const val = e.target.value;
    setSelectedPreset(val);
    if (val !== 'custom') {
      const numVal = parseInt(val, 10);
      setExpirySeconds(numVal);
      setCustomMinutes(Math.round(numVal / 60));
    }
  };

  const handleCustomMinutesChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val > 0) {
      setCustomMinutes(val);
      setExpirySeconds(val * 60);
    } else {
      setCustomMinutes('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    if (!expirySeconds || expirySeconds <= 0) {
      setError('Please provide a valid session expiry duration.');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/app-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'session_expiry_seconds',
          value: expirySeconds.toString()
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      setSuccess('Settings updated successfully. Session expiration is now set.');
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
        <span>Loading settings configuration...</span>
      </div>
    );
  }

  return (
    <div className="glass-card settings-card">
      <div className="card-header">
        <Settings size={20} className="header-icon animate-spin-slow" />
        <h2>Global App Settings</h2>
      </div>
      <p className="text-secondary text-sm">
        Configure the duration of user, pre-admin, and admin sessions. After this period, users will be logged out automatically and prompted to sign in again.
      </p>

      {success && (
        <div className="success-banner">
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      {error && <div className="error-banner"><span>{error}</span></div>}

      <form onSubmit={handleSubmit} className="settings-form">
        <div className="form-group">
          <label className="form-label" htmlFor="preset-select">Session Expiry Time</label>
          <select
            id="preset-select"
            className="form-select"
            value={selectedPreset}
            onChange={handlePresetChange}
            disabled={saving}
          >
            {presets.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
            <option value="custom">Custom Duration...</option>
          </select>
        </div>

        {selectedPreset === 'custom' && (
          <div className="form-group slide-down">
            <label className="form-label" htmlFor="custom-duration">Custom Duration (in minutes)</label>
            <input
              id="custom-duration"
              type="number"
              min="1"
              required
              className="form-input"
              placeholder="e.g. 60 for 1 hour"
              value={customMinutes}
              onChange={handleCustomMinutesChange}
              disabled={saving}
            />
            <span className="text-muted text-xs mt-1 block">
              Equates to {Math.round((expirySeconds / 3600) * 100) / 100} hours or {Math.round((expirySeconds / 86400) * 100) / 100} days.
            </span>
          </div>
        )}

        <button type="submit" className="btn btn-primary submit-btn" disabled={saving}>
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          <span>{saving ? 'Saving changes...' : 'Save Settings'}</span>
        </button>
      </form>

      <style jsx>{`
        .settings-card {
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

        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-top: 8px;
        }

        .form-select {
          width: 100%;
          background: rgba(10, 14, 23, 0.4);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
          padding: 10px 14px;
          height: 42px;
          outline: none;
          font-family: inherit;
        }
        
        .form-select option {
          background-color: var(--bg-secondary);
          color: var(--text-primary);
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

        .block { display: block; }
        .mt-1 { margin-top: 4px; }

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
