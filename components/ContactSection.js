'use client';

import { useState } from 'react';
import { Mail, Send, CheckCircle2, AlertCircle, MessageSquarePlus, User, BookOpen, ChevronDown, Phone, Loader2 } from 'lucide-react';

export default function ContactSection() {
  const [form, setForm] = useState({ name: '', email: '', contact_number: '', classroom: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.classroom.trim()) {
      setError('Please fill in your name, email, and classroom name.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit request');
      }

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="contact-section glass-card">
      {/* Collapsible Header */}
      <button className="contact-toggle" onClick={() => setIsOpen((v) => !v)}>
        <div className="contact-toggle-left">
          <div className="contact-icon-wrap">
            <MessageSquarePlus size={20} />
          </div>
          <div className="contact-toggle-text">
            <h2 className="contact-title">Missing Your Timetable?</h2>
            <p className="contact-subtitle text-secondary">Contact the admin to get your classroom added</p>
          </div>
        </div>
        <ChevronDown size={20} className={`chevron-icon ${isOpen ? 'rotated' : ''}`} />
      </button>

      {/* Expandable Form */}
      {isOpen && (
        <div className="contact-body slide-up">
          <div className="contact-divider" />

          {submitted ? (
            <div className="submitted-state">
              <div className="submitted-icon">
                <CheckCircle2 size={40} />
              </div>
              <h3>Request Sent! 🎉</h3>
              <p className="text-secondary">Your request has been saved directly to our database. The admin will review and add your classroom timetable soon.</p>
              <button
                className="btn btn-secondary reset-btn"
                onClick={() => { setSubmitted(false); setForm({ name: '', email: '', contact_number: '', classroom: '', message: '' }); }}
              >
                Send Another Request
              </button>
            </div>
          ) : (
            <>
              <p className="contact-description text-secondary">
                {"Don't see your classroom in the list? Fill out this form and we'll save your request to the admin dashboard so they can add your timetable."}
              </p>

              {error && (
                <div className="form-error-banner">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="contact-form">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="contact-name">
                      <User size={13} /> Your Name
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      name="name"
                      className="form-input"
                      placeholder="e.g. Ravi Kumar"
                      value={form.name}
                      onChange={handleChange}
                      disabled={submitting}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="contact-email">
                      <Mail size={13} /> Your Email
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      name="email"
                      className="form-input"
                      placeholder="e.g. ravi@college.edu"
                      value={form.email}
                      onChange={handleChange}
                      disabled={submitting}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="contact-phone">
                      <Phone size={13} /> Contact Number <span className="optional-tag">(optional)</span>
                    </label>
                    <input
                      id="contact-phone"
                      type="tel"
                      name="contact_number"
                      className="form-input"
                      placeholder="e.g. +91 98765 43210"
                      value={form.contact_number}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="contact-classroom">
                      <BookOpen size={13} /> Classroom / Section Name
                    </label>
                    <input
                      id="contact-classroom"
                      type="text"
                      name="classroom"
                      className="form-input"
                      placeholder="e.g. CSE-A 3rd Year, Section B - Batch 2024"
                      value={form.classroom}
                      onChange={handleChange}
                      disabled={submitting}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="contact-message">
                    Additional Details <span className="optional-tag">(optional)</span>
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    className="form-input contact-textarea"
                    placeholder="Any extra info for the admin — e.g. semester, department, faculty name..."
                    value={form.message}
                    onChange={handleChange}
                    disabled={submitting}
                    rows={3}
                  />
                </div>

                <button type="submit" disabled={submitting} className="btn btn-primary contact-submit-btn">
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  {submitting ? 'Submitting Request...' : 'Send Request to Admin'}
                </button>
              </form>
            </>
          )}
        </div>
      )}

      <style jsx>{`
        .contact-section {
          padding: 0;
          overflow: hidden;
          margin-top: 32px;
        }

        .contact-toggle {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 22px 28px;
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--text-primary);
          text-align: left;
          transition: background var(--transition-fast);
          gap: 16px;
        }
        .contact-toggle:hover {
          background: rgba(255,255,255,0.02);
        }
        .contact-toggle-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .contact-icon-wrap {
          width: 42px;
          height: 42px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, rgba(79,70,229,0.2), rgba(168,85,247,0.2));
          border: 1px solid rgba(79,70,229,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-purple);
          flex-shrink: 0;
        }
        .contact-toggle-text { display: flex; flex-direction: column; gap: 3px; }
        .contact-title {
          font-size: 1.05rem;
          font-weight: 700;
          margin: 0;
          color: var(--text-primary);
        }
        .contact-subtitle { font-size: 0.82rem; margin: 0; }

        .chevron-icon {
          flex-shrink: 0;
          color: var(--text-muted);
          transition: transform var(--transition-normal);
        }
        .chevron-icon.rotated { transform: rotate(180deg); }

        .contact-divider {
          height: 1px;
          background: var(--glass-border);
          margin: 0 28px;
        }

        .contact-body {
          padding: 24px 28px 28px;
        }

        .contact-description {
          font-size: 0.88rem;
          margin-bottom: 20px;
          line-height: 1.6;
        }

        .form-error-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          background: rgba(239,68,68,0.08);
          border: 1px solid var(--error-glow);
          color: var(--error);
          font-size: 0.85rem;
          margin-bottom: 16px;
        }

        .contact-form {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 640px) {
          .form-row { grid-template-columns: 1fr; }
          .contact-toggle { padding: 18px 20px; }
          .contact-body { padding: 20px; }
        }

        .form-label {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
          margin-bottom: 7px;
        }

        .optional-tag {
          font-size: 0.72rem;
          text-transform: none;
          letter-spacing: 0;
          color: var(--text-muted);
          font-weight: 400;
        }

        .contact-textarea {
          resize: vertical;
          min-height: 80px;
          font-family: inherit;
        }

        .contact-submit-btn {
          width: 100%;
          height: 48px;
          margin-top: 8px;
        }

        /* Submitted state */
        .submitted-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 24px 0 8px;
          gap: 12px;
        }
        .submitted-icon {
          width: 72px; height: 72px;
          border-radius: 50%;
          background: rgba(16,185,129,0.1);
          border: 2px solid var(--success-glow);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--success);
          margin-bottom: 8px;
        }
        .submitted-state h3 { font-size: 1.2rem; }
        .submitted-state p { font-size: 0.88rem; max-width: 360px; line-height: 1.6; }
        .reset-btn { margin-top: 8px; }
      `}</style>
    </section>
  );
}
