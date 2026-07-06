'use client';

import { useState, useEffect } from 'react';
import { Clock, MapPin, User, Star } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function TimetableGrid({ schedule }) {
  const [activeTab, setActiveTab] = useState('Monday');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    // Set default tab to current local day of week
    const localDay = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
    if (DAYS.includes(localDay)) {
      setActiveTab(localDay);
    }

    return () => clearInterval(timer);
  }, []);

  // Helper to parse time HH:MM:SS into minutes from midnight
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Check if a specific class is currently active
  const isClassActive = (dayOfWeek, startTime, endTime) => {
    // Get current day of week in local timezone
    const currentDay = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(currentTime);
    if (currentDay !== dayOfWeek) return false;

    // Get current time in local timezone formatted as HH:MM
    const currentLocalTimeStr = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(currentTime);

    const currentMinutes = parseTimeToMinutes(currentLocalTimeStr);
    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  };

  // Group classes by day and sort them by start time
  const filteredSchedule = schedule
    .filter((entry) => entry.day_of_week === activeTab)
    .sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));

  return (
    <div className="timetable-wrapper">
      {/* Weekday Tabs */}
      <div className="tabs-container">
        {DAYS.map((day) => {
          const count = schedule.filter((e) => e.day_of_week === day).length;
          return (
            <button
              key={day}
              onClick={() => setActiveTab(day)}
              className={`tab-btn ${activeTab === day ? 'active' : ''}`}
            >
              <span className="tab-day">{day.substring(0, 3)}</span>
              {count > 0 && <span className="tab-badge">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Timetable Cards */}
      <div className="cards-grid">
        {filteredSchedule.length > 0 ? (
          filteredSchedule.map((entry) => {
            const active = isClassActive(entry.day_of_week, entry.start_time, entry.end_time);
            return (
              <div 
                key={entry.id} 
                className={`class-card glass-card ${active ? 'active-class pulse-notify' : ''}`}
              >
                {active && (
                  <div className="active-tag">
                    <Star size={12} fill="currentColor" />
                    <span>Active Now</span>
                  </div>
                )}
                
                <div className="card-header">
                  <h4 className="class-subject">{entry.subject}</h4>
                  <div className="class-time-block">
                    <Clock size={14} className="info-icon" />
                    <span>
                      {entry.start_time.substring(0, 5)} - {entry.end_time.substring(0, 5)}
                    </span>
                  </div>
                </div>

                <div className="card-body">
                  <div className="info-item">
                    <MapPin size={14} className="info-icon" />
                    <span>{entry.room || 'No Room Assigned'}</span>
                  </div>
                  <div className="info-item">
                    <User size={14} className="info-icon" />
                    <span>{entry.teacher || 'No Teacher Assigned'}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-state glass-card">
            <p className="text-secondary">No classes scheduled for {activeTab}.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .timetable-wrapper {
          width: 100%;
        }

        .tabs-container {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 12px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--glass-border);
          scrollbar-width: none; /* Firefox */
        }

        .tabs-container::-webkit-scrollbar {
          display: none; /* Safari/Chrome */
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-family: var(--font-title);
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          white-space: nowrap;
        }

        .tab-btn:hover {
          color: var(--text-primary);
          border-color: var(--text-muted);
          background: var(--bg-tertiary);
        }

        .tab-btn.active {
          color: var(--text-primary);
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          box-shadow: 0 4px 12px var(--accent-primary-glow);
        }

        .tab-badge {
          font-size: 0.75rem;
          background: rgba(255, 255, 255, 0.15);
          color: white;
          padding: 2px 6px;
          border-radius: var(--radius-full);
          font-weight: 600;
        }

        .tab-btn.active .tab-badge {
          background: rgba(0, 0, 0, 0.2);
        }

        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        .class-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          min-height: 150px;
          transition: all var(--transition-normal);
        }

        .class-card:hover {
          transform: translateY(-4px);
          border-color: var(--text-muted);
          box-shadow: var(--shadow-md);
        }

        .active-class {
          border-color: var(--accent-secondary) !important;
          background: linear-gradient(135deg, rgba(19, 26, 38, 0.8), rgba(6, 182, 212, 0.08));
          box-shadow: 0 10px 25px -5px rgba(6, 182, 212, 0.2), 0 0 10px var(--accent-secondary-glow);
        }

        .active-tag {
          position: absolute;
          top: 12px;
          right: 12px;
          background: var(--accent-secondary);
          color: var(--bg-primary);
          font-family: var(--font-title);
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 3px 8px;
          border-radius: var(--radius-sm);
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .class-subject {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 8px;
          padding-right: 70px; /* Space for Active Tag */
        }

        .class-time-block {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          color: var(--accent-secondary);
          font-weight: 600;
          margin-bottom: 16px;
        }

        .card-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
          border-top: 1px solid var(--glass-border);
          padding-top: 14px;
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.88rem;
          color: var(--text-secondary);
        }

        .info-icon {
          color: var(--text-muted);
        }

        .empty-state {
          grid-column: 1 / -1;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 180px;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
