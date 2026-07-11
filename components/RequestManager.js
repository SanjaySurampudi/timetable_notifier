'use client';

import { useState, useEffect } from 'react';
import { Trash2, Check, X, Loader2, AlertCircle, RefreshCw, Mail, Phone, User, BookOpen, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function RequestManager({ onRequestsChanged }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, pending, completed, rejected

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch requests');
      }

      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      setLoadingAction(id);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id, status })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update request');
      }

      // Update state
      setRequests(prev => prev.map(req => req.id === id ? { ...req, status } : req));
      if (onRequestsChanged) onRequestsChanged();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to permanently delete this request from the database?')) {
      return;
    }

    try {
      setLoadingAction(id);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/requests?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete request');
      }

      setRequests(prev => prev.filter(req => req.id !== id));
      if (onRequestsChanged) onRequestsChanged();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true;
    return req.status === filter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="badge badge-success">Completed</span>;
      case 'rejected':
        return <span className="badge badge-error">Rejected</span>;
      case 'pending':
      default:
        return <span className="badge badge-pending">Pending</span>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="glass-card request-manager-card">
      <div className="card-header-row">
        <div>
          <h3>User Timetable Requests</h3>
          <p className="text-secondary description">Review classrooms requested by users.</p>
        </div>
        <button onClick={fetchRequests} disabled={loading} className="btn-icon" title="Refresh Requests">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="filter-row">
        {['all', 'pending', 'completed', 'rejected'].map((f) => {
          const count = requests.filter(r => f === 'all' || r.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`filter-tab ${filter === f ? 'active' : ''}`}
            >
              <span className="capitalize">{f}</span>
              <span className="tab-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Requests Content */}
      <div className="requests-container">
        {loading && requests.length === 0 ? (
          <div className="center-loader">
            <Loader2 className="animate-spin text-secondary" size={32} />
            <p className="text-secondary">Retrieving requests...</p>
          </div>
        ) : filteredRequests.length > 0 ? (
          <div className="requests-grid">
            {filteredRequests.map((req) => (
              <div key={req.id} className={`request-item-card ${req.status}`}>
                <div className="request-card-header">
                  <div className="classroom-info">
                    <BookOpen size={16} className="class-icon" />
                    <h4>{req.classroom}</h4>
                  </div>
                  {getStatusBadge(req.status)}
                </div>

                <div className="request-card-body">
                  <div className="info-grid">
                    <div className="info-item">
                      <User size={13} className="info-icon" />
                      <span>{req.name}</span>
                    </div>
                    <div className="info-item">
                      <Mail size={13} className="info-icon" />
                      <a href={`mailto:${req.email}`} className="info-link">{req.email}</a>
                    </div>
                    {req.contact_number && (
                      <div className="info-item">
                        <Phone size={13} className="info-icon" />
                        <a href={`tel:${req.contact_number}`} className="info-link">{req.contact_number}</a>
                      </div>
                    )}
                  </div>

                  {req.message && (
                    <div className="message-box">
                      <div className="message-header">
                        <FileText size={12} />
                        <span>Additional Details:</span>
                      </div>
                      <p className="message-text">{req.message}</p>
                    </div>
                  )}
                </div>

                <div className="request-card-footer">
                  <div className="time-info">
                    <Clock size={12} />
                    <span>{formatDate(req.created_at)}</span>
                  </div>

                  <div className="actions">
                    {loadingAction === req.id ? (
                      <Loader2 className="animate-spin text-secondary" size={18} />
                    ) : (
                      <>
                        {req.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(req.id, 'completed')}
                              className="action-btn btn-resolve"
                              title="Mark Completed"
                            >
                              <Check size={14} />
                              <span>Resolve</span>
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(req.id, 'rejected')}
                              className="action-btn btn-reject"
                              title="Reject"
                            >
                              <X size={14} />
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                        {req.status !== 'pending' && (
                          <button
                            onClick={() => handleUpdateStatus(req.id, 'pending')}
                            className="action-btn btn-pending"
                            title="Reopen Request"
                          >
                            <Clock size={14} />
                            <span>Reopen</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(req.id)}
                          className="action-btn btn-delete"
                          title="Delete Request"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <CheckCircle2 size={40} className="text-muted" />
            <p className="text-muted">No {filter !== 'all' ? filter : ''} requests found.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .request-manager-card {
          padding: 24px;
          min-height: 400px;
          display: flex;
          flex-direction: column;
        }

        .card-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 4px;
        }

        h3 {
          font-size: 1.25rem;
          margin-bottom: 4px;
        }

        .description {
          font-size: 0.85rem;
          margin-bottom: 12px;
        }

        .btn-icon {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 8px;
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-icon:hover {
          color: var(--text-primary);
          background: var(--glass-highlight);
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid var(--error-glow);
          color: var(--error);
          padding: 10px 14px;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          margin-bottom: 16px;
        }

        .filter-row {
          display: flex;
          gap: 8px;
          border-bottom: 1px solid var(--glass-border);
          padding-bottom: 12px;
          margin-bottom: 20px;
          overflow-x: auto;
        }

        .filter-tab {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 6px 12px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all var(--transition-fast);
        }

        .filter-tab:hover {
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-primary);
        }

        .filter-tab.active {
          background: var(--glass-highlight);
          color: var(--accent-secondary);
          border: 1px solid var(--glass-border);
        }

        .tab-count {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-muted);
          padding: 2px 6px;
          font-size: 0.72rem;
          border-radius: 20px;
          font-weight: 500;
        }

        .filter-tab.active .tab-count {
          background: rgba(56, 189, 248, 0.15);
          color: var(--accent-secondary);
        }

        .requests-container {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .center-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          padding: 40px 0;
          gap: 12px;
        }

        .requests-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        @media (max-width: 640px) {
          .requests-grid {
            grid-template-columns: 1fr;
          }
        }

        .request-item-card {
          background: rgba(10, 14, 23, 0.4);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-lg);
          padding: 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: all var(--transition-normal);
        }

        .request-item-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
          border-color: var(--text-muted);
        }

        .request-item-card.completed {
          border-left: 3px solid var(--success);
        }

        .request-item-card.rejected {
          border-left: 3px solid var(--error);
        }

        .request-item-card.pending {
          border-left: 3px solid var(--accent-secondary);
        }

        .request-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
          gap: 10px;
        }

        .classroom-info {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .class-icon {
          color: var(--accent-secondary);
          flex-shrink: 0;
        }

        .classroom-info h4 {
          font-size: 0.95rem;
          font-weight: 700;
          margin: 0;
          line-height: 1.4;
          color: var(--text-primary);
        }

        .badge {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 3px 8px;
          border-radius: 20px;
        }

        .badge-pending {
          background: rgba(56, 189, 248, 0.1);
          color: var(--accent-secondary);
          border: 1px solid rgba(56, 189, 248, 0.2);
        }

        .badge-success {
          background: rgba(16, 185, 129, 0.1);
          color: var(--success);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .badge-error {
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .request-card-body {
          margin-bottom: 16px;
        }

        .info-grid {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 10px;
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.82rem;
          color: var(--text-secondary);
        }

        .info-icon {
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .info-link {
          color: var(--text-secondary);
          text-decoration: none;
          transition: color var(--transition-fast);
        }

        .info-link:hover {
          color: var(--accent-purple);
          text-decoration: underline;
        }

        .message-box {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          padding: 10px;
          margin-top: 10px;
        }

        .message-header {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .message-text {
          font-size: 0.8rem;
          line-height: 1.5;
          margin: 0;
          color: var(--text-secondary);
          white-space: pre-wrap;
        }

        .request-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--glass-border);
          padding-top: 12px;
          margin-top: auto;
          gap: 8px;
        }

        .time-info {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        .actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: transparent;
          border: 1px solid var(--glass-border);
          color: var(--text-secondary);
          padding: 4px 8px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }

        .btn-resolve {
          background: rgba(16, 185, 129, 0.05);
          border-color: rgba(16, 185, 129, 0.2);
          color: var(--success);
        }
        .btn-resolve:hover {
          background: var(--success);
          color: white;
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
        }

        .btn-reject {
          background: rgba(239, 68, 68, 0.05);
          border-color: rgba(239, 68, 68, 0.2);
          color: var(--error);
        }
        .btn-reject:hover {
          background: var(--error);
          color: white;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
        }

        .btn-pending {
          background: rgba(255, 255, 255, 0.02);
          border-color: var(--glass-border);
          color: var(--text-secondary);
        }
        .btn-pending:hover {
          background: var(--glass-highlight);
          color: var(--text-primary);
        }

        .btn-delete {
          padding: 4px 6px;
          color: var(--text-muted);
          border-color: transparent;
        }
        .btn-delete:hover {
          color: var(--error);
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.2);
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 0;
          gap: 12px;
        }

        .empty-state p {
          font-size: 0.88rem;
        }

        .capitalize {
          text-transform: capitalize;
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
