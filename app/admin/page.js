// app/admin/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings, 
  ShieldAlert, 
  Loader2, 
  CalendarDays, 
  MessageSquare, 
  Users, 
  Database,
  Plus,
  Trash2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import ClassManager from '@/components/ClassManager';
import AdminUpload from '@/components/AdminUpload';
import RequestManager from '@/components/RequestManager';

export default function AdminPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('timetables'); // timetables, requests, logins, database
  const [classrooms, setClassrooms] = useState([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const [error, setError] = useState(null);

  // Logins Management State
  const [preAdmins, setPreAdmins] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loadingLogins, setLoadingLogins] = useState(false);
  
  // Add Pre-Admin Form State
  const [paRoll, setPaRoll] = useState('');
  const [paEmail, setPaEmail] = useState('');
  const [paClassroom, setPaClassroom] = useState('');
  const [addingPa, setAddingPa] = useState(false);

  // Add User Form State
  const [uRoll, setURoll] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [addingU, setAddingU] = useState(false);

  // Database Explorer State
  const [selectedTable, setSelectedTable] = useState('classrooms');
  const [tableData, setTableData] = useState([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [tableError, setTableError] = useState(null);

  // Verify Admin Session
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated || data.role !== 'admin') {
          router.push('/login');
        } else {
          setSession(data);
          setCheckingAuth(false);
          fetchClassrooms();
          fetchRequestsCount();
        }
      })
      .catch((err) => {
        console.error('Admin session verify error:', err);
        router.push('/login');
      });
  }, [router]);

  // Fetch lists based on active tab
  useEffect(() => {
    if (checkingAuth) return;
    if (activeTab === 'logins') {
      fetchLoginsData();
    } else if (activeTab === 'database') {
      fetchTableData(selectedTable);
    }
  }, [activeTab, checkingAuth, selectedTable]);

  const fetchClassrooms = async () => {
    try {
      setLoadingClassrooms(true);
      setError(null);
      const res = await fetch('/api/classrooms');
      if (!res.ok) throw new Error('Failed to load classrooms');
      const data = await res.json();
      setClassrooms(data.classrooms || []);
      if (data.classrooms && data.classrooms.length > 0) {
        setPaClassroom(data.classrooms[0].id);
      }
    } catch (err) {
      console.error(err);
      setError('Could not retrieve classrooms from the database.');
    } finally {
      setLoadingClassrooms(false);
    }
  };

  const fetchRequestsCount = async () => {
    try {
      const res = await fetch('/api/requests');
      if (res.ok) {
        const data = await res.json();
        const pendingCount = (data.requests || []).filter(r => r.status === 'pending').length;
        setPendingRequestsCount(pendingCount);
      }
    } catch (err) {
      console.error('Error fetching requests count:', err);
    }
  };

  const fetchLoginsData = async () => {
    setLoadingLogins(true);
    setError(null);
    try {
      // 1. Fetch pre-admins
      const resPa = await fetch('/api/admin/pre-admins');
      const dataPa = await resPa.json();
      if (!resPa.ok) throw new Error(dataPa.error || 'Failed to load pre-admins');
      setPreAdmins(dataPa.preAdmins || []);

      // 2. Fetch users
      const resU = await fetch('/api/admin/users');
      const dataU = await resU.json();
      if (!resU.ok) throw new Error(dataU.error || 'Failed to load users');
      setUsersList(dataU.users || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load login lists. Make sure table schema migrations are set up.');
    } finally {
      setLoadingLogins(false);
    }
  };

  const fetchTableData = async (tableName) => {
    setLoadingTable(true);
    setTableError(null);
    try {
      const res = await fetch(`/api/admin/db?table=${tableName}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to retrieve table data');
      setTableData(data.data || []);
    } catch (err) {
      console.error(err);
      setTableError(err.message || 'Could not query database table.');
      setTableData([]);
    } finally {
      setLoadingTable(false);
    }
  };

  // Add Pre-Admin
  const handleAddPreAdmin = async (e) => {
    e.preventDefault();
    if (!paClassroom) {
      setError('Please select a classroom first.');
      return;
    }
    if (!paRoll.trim() && !paEmail.trim()) {
      setError('Please provide at least a Roll Number or an Email for the pre-admin.');
      return;
    }

    setAddingPa(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/pre-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roll_number: paRoll.trim() || null,
          email: paEmail.trim() || null,
          classroom_id: paClassroom
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add pre-admin');
      
      setPaRoll('');
      setPaEmail('');
      fetchLoginsData();
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingPa(false);
    }
  };

  // Delete Pre-Admin
  const handleDeletePreAdmin = async (id) => {
    if (!confirm('Are you sure you want to delete this pre-admin mapping?')) return;
    try {
      const res = await fetch(`/api/admin/pre-admins?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete pre-admin');
      }
      fetchLoginsData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Add User
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!uPassword.trim()) {
      setError('Password is required.');
      return;
    }
    if (!uRoll.trim() && !uEmail.trim()) {
      setError('Please provide at least a Roll Number or an Email for the user.');
      return;
    }

    setAddingU(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roll_number: uRoll.trim() || null,
          email: uEmail.trim() || null,
          password: uPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add user');
      
      setURoll('');
      setUEmail('');
      setUPassword('');
      fetchLoginsData();
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingU(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user');
      }
      fetchLoginsData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (checkingAuth) {
    return (
      <div className="loading-container">
        <Loader2 className="animate-spin text-secondary" size={40} />
        <p className="text-secondary">Verifying administrator session...</p>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: calc(70vh - 100px);
            gap: 16px;
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

  return (
    <div className="container admin-container fade-in">
      <header className="admin-header">
        <div className="title-block">
          <Settings size={28} className="settings-icon animate-spin-slow" />
          <h1>Admin Dashboard</h1>
        </div>
        <p className="text-secondary">
          Logged in as: <span className="admin-email">{session?.user?.email}</span>
        </p>
      </header>

      {error && (
        <div className="error-banner glass-card">
          <ShieldAlert size={20} className="error-icon" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tabs-navigation">
        <button
          onClick={() => setActiveTab('timetables')}
          className={`tab-btn ${activeTab === 'timetables' ? 'active' : ''}`}
        >
          <CalendarDays size={18} />
          <span>Timetables & Classes</span>
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
        >
          <MessageSquare size={18} />
          <span>User Requests</span>
          {pendingRequestsCount > 0 && (
            <span className="pending-badge">{pendingRequestsCount}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('logins')}
          className={`tab-btn ${activeTab === 'logins' ? 'active' : ''}`}
        >
          <Users size={18} />
          <span>Login Credentials</span>
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={`tab-btn ${activeTab === 'database' ? 'active' : ''}`}
        >
          <Database size={18} />
          <span>Database Explorer</span>
        </button>
      </div>

      {/* 1. Timetables Tab */}
      {activeTab === 'timetables' && (
        <div className="admin-grid">
          <section className="grid-item">
            {loadingClassrooms && classrooms.length === 0 ? (
              <div className="section-loading">
                <Loader2 className="animate-spin" size={24} />
              </div>
            ) : (
              <ClassManager 
                classrooms={classrooms} 
                onClassroomsChanged={fetchClassrooms} 
              />
            )}
          </section>
          <section className="grid-item">
            <AdminUpload classrooms={classrooms} />
          </section>
        </div>
      )}

      {/* 2. Requests Tab */}
      {activeTab === 'requests' && (
        <div className="requests-section fade-in">
          <RequestManager onRequestsChanged={fetchRequestsCount} />
        </div>
      )}

      {/* 3. Logins Tab */}
      {activeTab === 'logins' && (
        <div className="logins-section fade-in">
          <div className="admin-grid">
            {/* Left side: Pre-Admin credentials */}
            <div className="grid-item">
              <div className="glass-card panel-card">
                <div className="card-header">
                  <Users size={20} className="header-icon" />
                  <h2>Pre-Admin Timetable Accounts</h2>
                </div>

                <form onSubmit={handleAddPreAdmin} className="add-login-form">
                  <h3>Add Pre-Admin Classroom Editor</h3>
                  <div className="form-group">
                    <label className="form-label">College Roll Number</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 210030010" 
                      value={paRoll} 
                      onChange={e => setPaRoll(e.target.value)} 
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">College Email Address</label>
                    <input 
                      type="email" 
                      placeholder="e.g. editor@college.edu" 
                      value={paEmail} 
                      onChange={e => setPaEmail(e.target.value)} 
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assign Classroom Section</label>
                    {classrooms.length > 0 ? (
                      <select 
                        value={paClassroom} 
                        onChange={e => setPaClassroom(e.target.value)} 
                        className="form-select"
                      >
                        {classrooms.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-muted text-sm">Please create a classroom section first.</div>
                    )}
                  </div>
                  <button type="submit" disabled={addingPa} className="btn btn-primary submit-btn-sm">
                    {addingPa ? <Loader2 className="animate-spin" size={14} /> : <><Plus size={14} /> Add Pre-Admin</>}
                  </button>
                </form>

                <div className="logins-list-wrapper">
                  <h3>Existing Pre-Admins</h3>
                  {loadingLogins ? (
                    <div className="list-loading-spinner"><Loader2 className="animate-spin" /></div>
                  ) : preAdmins.length === 0 ? (
                    <p className="text-secondary text-sm">No pre-admins configured yet.</p>
                  ) : (
                    <div className="credentials-list">
                      {preAdmins.map(pa => (
                        <div key={pa.id} className="cred-item glass-card">
                          <div className="cred-details">
                            <div className="cred-identifiers">
                              {pa.roll_number && <span className="identifier-badge">Roll: {pa.roll_number}</span>}
                              {pa.email && <span className="identifier-badge">Email: {pa.email}</span>}
                            </div>
                            <span className="assigned-classroom-name">Room: {pa.classrooms?.name}</span>
                          </div>
                          <button onClick={() => handleDeletePreAdmin(pa.id)} className="delete-cred-btn"><Trash2 size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right side: User credentials */}
            <div className="grid-item">
              <div className="glass-card panel-card">
                <div className="card-header">
                  <Users size={20} className="header-icon" />
                  <h2>Standard User Accounts</h2>
                </div>

                <form onSubmit={handleAddUser} className="add-login-form">
                  <h3>Create User Login Profile</h3>
                  <div className="form-group">
                    <label className="form-label">College Roll Number</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 210030099" 
                      value={uRoll} 
                      onChange={e => setURoll(e.target.value)} 
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">College Email Address</label>
                    <input 
                      type="email" 
                      placeholder="e.g. student@college.edu" 
                      value={uEmail} 
                      onChange={e => setUEmail(e.target.value)} 
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Login Password</label>
                    <input 
                      type="text" 
                      placeholder="Plain text login password" 
                      value={uPassword} 
                      onChange={e => setUPassword(e.target.value)} 
                      className="form-input"
                    />
                  </div>
                  <button type="submit" disabled={addingU} className="btn btn-primary submit-btn-sm">
                    {addingU ? <Loader2 className="animate-spin" size={14} /> : <><Plus size={14} /> Create User Account</>}
                  </button>
                </form>

                <div className="logins-list-wrapper">
                  <h3>Existing Users</h3>
                  {loadingLogins ? (
                    <div className="list-loading-spinner"><Loader2 className="animate-spin" /></div>
                  ) : usersList.length === 0 ? (
                    <p className="text-secondary text-sm">No user credentials created yet.</p>
                  ) : (
                    <div className="credentials-list">
                      {usersList.map(u => (
                        <div key={u.id} className="cred-item glass-card">
                          <div className="cred-details">
                            <div className="cred-identifiers">
                              {u.roll_number && <span className="identifier-badge">Roll: {u.roll_number}</span>}
                              {u.email && <span className="identifier-badge">Email: {u.email}</span>}
                            </div>
                            <span className="plain-pwd text-muted">Password: <code className="pwd-text">{u.password}</code></span>
                          </div>
                          <button onClick={() => handleDeleteUser(u.id)} className="delete-cred-btn"><Trash2 size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Database Tab */}
      {activeTab === 'database' && (
        <div className="database-section fade-in">
          <div className="glass-card db-card">
            <div className="db-controls">
              <div className="db-header-title">
                <Database size={20} className="header-icon" />
                <h2>Raw Database Explorer</h2>
              </div>
              <div className="db-selector-group">
                <label className="form-label-inline" htmlFor="table-select">Table:</label>
                <select
                  id="table-select"
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="form-select db-select"
                >
                  <option value="classrooms">Classrooms (classrooms)</option>
                  <option value="timetable">Timetable Slots (timetable)</option>
                  <option value="push_subscriptions">Web Push Subscriptions</option>
                  <option value="telegram_subscriptions">Telegram Subscriptions</option>
                  <option value="pre_admins">Pre-Admins Credentials</option>
                  <option value="users">Users Credentials</option>
                  <option value="requests">User Help Requests</option>
                </select>
                <button 
                  onClick={() => fetchTableData(selectedTable)} 
                  disabled={loadingTable}
                  className="btn btn-secondary refresh-btn"
                  title="Reload table records"
                >
                  <RefreshCw className={loadingTable ? 'animate-spin' : ''} size={14} />
                </button>
              </div>
            </div>

            {tableError && (
              <div className="db-migration-warning glass-card">
                <AlertTriangle size={24} className="warning-icon" />
                <div className="warning-text">
                  <h4>Table Read Failed</h4>
                  <p>{tableError}</p>
                  <p className="migration-hint">
                    If this is a new table, make sure to execute the appended SQL queries in [schema.sql](file:///a:/timetable_notifier/schema.sql) in your Supabase SQL Editor.
                  </p>
                </div>
              </div>
            )}

            {loadingTable ? (
              <div className="db-table-loading">
                <Loader2 className="animate-spin" size={36} />
                <span>Fetching table rows from Supabase...</span>
              </div>
            ) : tableData.length === 0 ? (
              <div className="db-empty-state text-center text-secondary">
                No rows present in table "{selectedTable}".
              </div>
            ) : (
              <div className="db-table-scroll-container">
                <table className="db-data-table">
                  <thead>
                    <tr>
                      {Object.keys(tableData[0]).map((colName) => (
                        <th key={colName}>{colName}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, index) => (
                      <tr key={index}>
                        {Object.entries(row).map(([key, val]) => (
                          <td key={key}>
                            {val === null || val === undefined 
                              ? <span className="cell-null">null</span> 
                              : typeof val === 'object' 
                                ? JSON.stringify(val) 
                                : String(val)
                            }
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-bottom: 1px solid var(--glass-border);
          padding-bottom: 20px;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 15px;
        }

        .title-block {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .settings-icon {
          color: var(--accent-secondary);
        }

        .admin-email {
          color: var(--accent-purple);
          font-weight: 600;
        }

        .tabs-navigation {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--glass-border);
          padding-bottom: 8px;
          overflow-x: auto;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 0.92rem;
          font-weight: 600;
          padding: 10px 16px;
          cursor: pointer;
          border-radius: var(--radius-md) var(--radius-md) 0 0;
          transition: all var(--transition-fast);
          position: relative;
          white-space: nowrap;
        }

        .tab-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.02);
        }

        .tab-btn.active {
          color: var(--accent-secondary);
          background: transparent;
        }

        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -9px;
          left: 0;
          width: 100%;
          height: 2px;
          background: var(--accent-secondary);
          box-shadow: 0 0 8px var(--accent-secondary-glow);
        }

        .pending-badge {
          background: var(--error);
          color: white;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 18px;
          text-align: center;
        }

        .admin-grid {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 30px;
          align-items: start;
        }

        @media (max-width: 992px) {
          .admin-grid {
            grid-template-columns: 1fr;
          }
          .admin-header {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        .panel-card, .db-card {
          padding: 24px;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
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

        h3 {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .add-login-form {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          padding: 16px;
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .submit-btn-sm {
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 0.85rem;
          margin-top: 5px;
        }

        .list-loading-spinner {
          display: flex;
          justify-content: center;
          padding: 30px;
        }

        .credentials-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 300px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .cred-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .cred-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .cred-identifiers {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .identifier-badge {
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.3);
          color: var(--accent-purple);
          font-size: 0.72rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
        }

        .assigned-classroom-name {
          font-size: 0.8rem;
          color: var(--accent-secondary);
          font-weight: 600;
        }

        .pwd-text {
          color: var(--text-primary);
          font-family: monospace;
          background: rgba(255, 255, 255, 0.05);
          padding: 1px 4px;
          border-radius: var(--radius-sm);
        }

        .plain-pwd {
          font-size: 0.8rem;
        }

        .delete-cred-btn {
          background: transparent;
          border: 1px solid rgba(239, 68, 68, 0.1);
          color: var(--error);
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .delete-cred-btn:hover {
          background: var(--error);
          color: white;
          border-color: var(--error);
        }

        /* Database Explorer */
        .db-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--glass-border);
          padding-bottom: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 15px;
        }

        .db-header-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .db-selector-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .form-label-inline {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .db-select {
          width: 240px;
          background: var(--bg-tertiary);
          font-weight: 600;
        }

        .refresh-btn {
          width: 36px;
          height: 36px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .db-table-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 250px;
          gap: 12px;
          color: var(--text-secondary);
        }

        .db-empty-state {
          padding: 60px;
          font-size: 0.95rem;
        }

        .db-table-scroll-container {
          width: 100%;
          overflow-x: auto;
          border-radius: var(--radius-md);
          border: 1px solid var(--glass-border);
          background: rgba(10, 14, 23, 0.4);
        }

        .db-data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
          text-align: left;
        }

        .db-data-table th {
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid var(--glass-border);
          padding: 12px 16px;
          font-weight: 700;
          color: var(--text-primary);
          font-family: var(--font-title);
          letter-spacing: 0.02em;
        }

        .db-data-table td {
          padding: 10px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          color: var(--text-secondary);
          max-width: 250px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .db-data-table tr:hover td {
          background: rgba(255, 255, 255, 0.01);
          color: var(--text-primary);
        }

        .cell-null {
          color: var(--text-muted);
          font-style: italic;
          opacity: 0.5;
        }

        .db-migration-warning {
          display: flex;
          gap: 16px;
          border-color: rgba(245, 158, 11, 0.2);
          background: rgba(245, 158, 11, 0.04);
          color: #f59e0b;
          padding: 20px;
          margin-bottom: 20px;
          align-items: flex-start;
        }

        .warning-icon {
          flex-shrink: 0;
          color: #f59e0b;
        }

        .warning-text h4 {
          margin: 0 0 6px 0;
          font-size: 1.05rem;
          font-weight: 700;
        }

        .warning-text p {
          margin: 0 0 8px 0;
          font-size: 0.88rem;
          color: rgba(245, 158, 11, 0.85);
        }

        .migration-hint {
          font-weight: 600;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          border-color: var(--error-glow);
          background: rgba(239, 68, 68, 0.05);
          color: var(--error);
          margin-bottom: 24px;
          padding: 16px;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        .animate-spin-slow {
          animation: spinSlow 12s linear infinite;
        }
      `}</style>
    </div>
  );
}
