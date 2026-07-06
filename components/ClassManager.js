'use client';

import { useState } from 'react';
import { Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ClassManager({ classrooms, onClassroomsChanged }) {
  const [newClassName, setNewClassName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // Get current auth token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/classrooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newClassName.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create classroom');
      }

      setNewClassName('');
      onClassroomsChanged();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will permanently delete its timetable and all subscriber notifications.`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get current auth token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/classrooms?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete classroom');
      }

      onClassroomsChanged();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card class-manager-card">
      <h3>Manage Classrooms</h3>
      <p className="text-secondary description">Create or delete classroom channels.</p>

      {error && (
        <div className="error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Add Classroom Form */}
      <form onSubmit={handleAddClass} className="add-class-form">
        <input
          type="text"
          placeholder="e.g. CS Year 1 Sec A"
          value={newClassName}
          onChange={(e) => setNewClassName(e.value || e.target.value)}
          disabled={loading}
          className="form-input"
          required
        />
        <button type="submit" disabled={loading || !newClassName.trim()} className="btn btn-primary add-btn">
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
          <span>Add</span>
        </button>
      </form>

      {/* Classrooms List */}
      <div className="classrooms-list">
        {classrooms.length > 0 ? (
          classrooms.map((cls) => (
            <div key={cls.id} className="class-item">
              <span className="class-name">{cls.name}</span>
              <button
                onClick={() => handleDeleteClass(cls.id, cls.name)}
                disabled={loading}
                className="delete-btn"
                title="Delete classroom"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        ) : (
          <p className="text-muted empty-msg">No classrooms created yet.</p>
        )}
      </div>

      <style jsx>{`
        .class-manager-card {
          padding: 24px;
        }

        h3 {
          font-size: 1.25rem;
          margin-bottom: 4px;
        }

        .description {
          font-size: 0.85rem;
          margin-bottom: 20px;
        }

        .add-class-form {
          display: flex;
          gap: 10px;
          margin-bottom: 24px;
        }

        .add-btn {
          flex-shrink: 0;
          padding: 0 20px;
        }

        .classrooms-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 350px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .class-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(10, 14, 23, 0.4);
          border: 1px solid var(--glass-border);
          padding: 12px 16px;
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
        }

        .class-item:hover {
          border-color: var(--text-muted);
          background: rgba(10, 14, 23, 0.7);
        }

        .class-name {
          font-size: 0.92rem;
          font-weight: 600;
        }

        .delete-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 6px;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }

        .delete-btn:hover {
          color: var(--error);
          background: rgba(239, 68, 68, 0.1);
        }

        .empty-msg {
          font-size: 0.88rem;
          text-align: center;
          padding: 20px 0;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid var(--error-glow);
          color: var(--error);
          padding: 10px;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          margin-bottom: 16px;
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
