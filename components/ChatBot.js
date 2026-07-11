'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles, ChevronRight } from 'lucide-react';

// ──────────────────────────────────────────────────────────
// Rule-based timetable chatbot (no external API needed)
// ──────────────────────────────────────────────────────────

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getDayOfWeek() {
  return DAYS_ORDER[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

function matchesDay(input) {
  return DAYS_ORDER.find((d) => input.toLowerCase().includes(d.toLowerCase()));
}

function matchesSubject(input, schedule) {
  return schedule.find((s) => input.toLowerCase().includes(s.subject.toLowerCase()));
}

function matchesTeacher(input, schedule) {
  return schedule.find(
    (s) => s.teacher && input.toLowerCase().includes(s.teacher.toLowerCase().split(' ').pop())
  );
}

function formatSlot(slot) {
  const parts = [`📚 **${slot.subject}**`];
  parts.push(`🕐 ${formatTime(slot.start_time)} – ${formatTime(slot.end_time)}`);
  if (slot.teacher) parts.push(`👨‍🏫 ${slot.teacher}`);
  if (slot.room) parts.push(`📍 ${slot.room}`);
  return parts.join('\n');
}

function formatDaySchedule(day, entries) {
  if (!entries || entries.length === 0) return `No classes scheduled on **${day}** 🎉`;
  const sorted = [...entries].sort((a, b) => a.start_time.localeCompare(b.start_time));
  return `📅 **${day}**\n\n` + sorted.map((e, i) => `${i + 1}. ${formatSlot(e)}`).join('\n\n');
}

function generateBotResponse(message, schedule, classroomName) {
  const input = message.trim().toLowerCase();

  if (!schedule || schedule.length === 0) {
    return `No timetable data is loaded yet for **${classroomName || 'this classroom'}**. Please ask the admin to upload one! 📋`;
  }

  const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'yo', 'sup'];
  if (greetings.some((g) => input === g || input.startsWith(g + ' '))) {
    return `Hello! 👋 I'm your timetable assistant for **${classroomName}**. Ask me about:\n• Your schedule for any day\n• When a specific subject is\n• Who teaches a subject\n• Class locations\n\nWhat would you like to know?`;
  }

  // "full schedule" / "all classes" / "show everything"
  if (['full', 'all', 'everything', 'complete', 'entire', 'whole', 'show all', 'list all'].some((k) => input.includes(k))) {
    const byDay = DAYS_ORDER.reduce((acc, day) => {
      const entries = schedule.filter((s) => s.day_of_week === day);
      if (entries.length > 0) acc[day] = entries;
      return acc;
    }, {});
    if (Object.keys(byDay).length === 0) return 'No classes found in the timetable.';
    const lines = [`📓 **Full Timetable for ${classroomName}**\n`];
    for (const [day, entries] of Object.entries(byDay)) {
      const sorted = [...entries].sort((a, b) => a.start_time.localeCompare(b.start_time));
      lines.push(`**${day}:** ${sorted.map((e) => `${e.subject} (${formatTime(e.start_time)})`).join(', ')}`);
    }
    return lines.join('\n');
  }

  // "today" / "tomorrow" queries
  if (input.includes('today')) {
    const today = getDayOfWeek();
    const entries = schedule.filter((s) => s.day_of_week === today);
    return formatDaySchedule(today, entries);
  }
  if (input.includes('tomorrow')) {
    const todayIdx = DAYS_ORDER.indexOf(getDayOfWeek());
    const tomorrow = DAYS_ORDER[(todayIdx + 1) % 7];
    const entries = schedule.filter((s) => s.day_of_week === tomorrow);
    return formatDaySchedule(tomorrow, entries);
  }

  // Day-specific query
  const matchedDay = matchesDay(input);
  if (matchedDay) {
    const entries = schedule.filter((s) => s.day_of_week === matchedDay);
    return formatDaySchedule(matchedDay, entries);
  }

  // Teacher query
  if (input.includes('who teach') || input.includes('teacher') || input.includes('professor') || input.includes('lecturer') || input.includes('who takes') || input.includes('who handles')) {
    const teacherSlot = matchesSubject(input, schedule);
    if (teacherSlot) {
      return teacherSlot.teacher
        ? `👨‍🏫 **${teacherSlot.subject}** is taught by **${teacherSlot.teacher}**${teacherSlot.room ? ` in ${teacherSlot.room}` : ''}.`
        : `No teacher info is recorded for **${teacherSlot.subject}**.`;
    }
    // List all unique teachers
    const teachers = [...new Set(schedule.filter((s) => s.teacher).map((s) => `**${s.teacher}** (${s.subject})`))];
    if (teachers.length === 0) return "No teacher information is recorded in the timetable.";
    return `👨‍🏫 **Teachers in this timetable:**\n${teachers.join('\n')}`;
  }

  // Room / location query
  if (input.includes('room') || input.includes('where') || input.includes('location') || input.includes('hall') || input.includes('lab')) {
    const roomSlot = matchesSubject(input, schedule);
    if (roomSlot) {
      return roomSlot.room
        ? `📍 **${roomSlot.subject}** is held in **${roomSlot.room}**.`
        : `No room info is recorded for **${roomSlot.subject}**.`;
    }
    const rooms = [...new Set(schedule.filter((s) => s.room).map((s) => `**${s.subject}** → ${s.room}`))];
    if (rooms.length === 0) return "No room information is recorded in the timetable.";
    return `📍 **Class Locations:**\n${rooms.join('\n')}`;
  }

  // Time query for a subject
  if (input.includes('time') || input.includes('when') || input.includes('start') || input.includes('end') || input.includes('what time')) {
    const slot = matchesSubject(input, schedule);
    if (slot) {
      const allSlots = schedule.filter((s) => s.subject.toLowerCase() === slot.subject.toLowerCase());
      if (allSlots.length === 1) {
        return `🕐 **${slot.subject}** is on **${slot.day_of_week}** from **${formatTime(slot.start_time)}** to **${formatTime(slot.end_time)}**.`;
      }
      return `🕐 **${slot.subject}** occurs multiple times:\n\n` + allSlots.map((s) => `• **${s.day_of_week}**: ${formatTime(s.start_time)} – ${formatTime(s.end_time)}`).join('\n');
    }
  }

  // Subject-specific query (catch-all subject lookup)
  const subjectSlot = matchesSubject(input, schedule);
  if (subjectSlot) {
    const allSlots = schedule.filter((s) => s.subject.toLowerCase() === subjectSlot.subject.toLowerCase());
    const lines = [`📚 **${subjectSlot.subject}**\n`];
    allSlots.forEach((s) => {
      lines.push(`• **${s.day_of_week}** | ${formatTime(s.start_time)} – ${formatTime(s.end_time)}${s.teacher ? ` | 👨‍🏫 ${s.teacher}` : ''}${s.room ? ` | 📍 ${s.room}` : ''}`);
    });
    return lines.join('\n');
  }

  // Count queries
  if (input.includes('how many') || input.includes('count') || input.includes('number of')) {
    if (input.includes('class') || input.includes('subject') || input.includes('period')) {
      const uniqueSubjects = [...new Set(schedule.map((s) => s.subject))];
      return `📊 There are **${schedule.length} total class slots** with **${uniqueSubjects.length} unique subjects** in the timetable:\n${uniqueSubjects.map((s) => `• ${s}`).join('\n')}`;
    }
  }

  // Free day query
  if (input.includes('free') || input.includes('holiday') || input.includes('no class') || input.includes('off day')) {
    const scheduledDays = new Set(schedule.map((s) => s.day_of_week));
    const freeDays = DAYS_ORDER.filter((d) => !scheduledDays.has(d));
    if (freeDays.length === 0) return '📅 You have classes every day of the week!';
    return `🎉 **Days with no classes:** ${freeDays.join(', ')}`;
  }

  // Fallback
  const subjects = [...new Set(schedule.map((s) => s.subject))];
  return `🤔 I'm not sure about that. You can ask me things like:\n• "What's on Monday?"\n• "When is ${subjects[0] || 'Math'} class?"\n• "Who teaches ${subjects[0] || 'Physics'}?"\n• "Show my full schedule"\n• "What classes are today?"`;
}

// ──────────────────────────────────────────────────────────
// Suggested questions
// ──────────────────────────────────────────────────────────
const SUGGESTED = [
  { label: "Today's classes", query: "What classes do I have today?" },
  { label: "Monday schedule", query: "Show me Monday's schedule" },
  { label: "Full timetable", query: "Show me the full timetable" },
  { label: "Free days", query: "Which days do I have no classes?" },
  { label: "All teachers", query: "Who are the teachers?" },
  { label: "Class locations", query: "Where are the classes held?" },
];

// ──────────────────────────────────────────────────────────
// Markdown-like renderer for bot messages
// ──────────────────────────────────────────────────────────
function renderMessage(text) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bold: **text**
    const rendered = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    return <p key={i} dangerouslySetInnerHTML={{ __html: rendered || '&nbsp;' }} style={{ margin: '2px 0' }} />;
  });
}

// ──────────────────────────────────────────────────────────
// Main ChatBot Component
// ──────────────────────────────────────────────────────────
export default function ChatBot({ schedule, classroomName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        setMessages([
          {
            role: 'bot',
            text: classroomName
              ? `Hi! 👋 I'm your timetable assistant for **${classroomName}**. Ask me anything about your schedule!`
              : `Hi! 👋 Please select a classroom first so I can answer questions about your timetable.`,
            id: Date.now(),
          },
        ]);
      }, 0);
    }
  }, [isOpen, classroomName, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed) return;

    setInput('');
    setShowSuggestions(false);
    setMessages((prev) => [...prev, { role: 'user', text: trimmed, id: Date.now() }]);
    setIsTyping(true);

    // Simulate thinking delay for realism
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));

    const response = generateBotResponse(trimmed, schedule, classroomName);
    setMessages((prev) => [...prev, { role: 'bot', text: response, id: Date.now() }]);
    setIsTyping(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* Floating Chat Bubble */}
      <button
        className={`chat-fab ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Open timetable assistant"
        title="Chat with Timetable Assistant"
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
        {!isOpen && <span className="chat-fab-label">Ask me!</span>}
      </button>

      {/* Chat Panel */}
      <div className={`chat-panel ${isOpen ? 'visible' : ''}`}>
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="bot-avatar">
              <Bot size={18} />
            </div>
            <div>
              <div className="chat-header-title">Timetable Assistant</div>
              <div className="chat-header-sub">
                {classroomName ? `📍 ${classroomName}` : 'Select a classroom to begin'}
              </div>
            </div>
          </div>
          <button className="chat-close-btn" onClick={() => setIsOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-row ${msg.role}`}>
              {msg.role === 'bot' && (
                <div className="msg-avatar bot-msg-avatar"><Bot size={14} /></div>
              )}
              <div className={`message-bubble ${msg.role}-bubble`}>
                {msg.role === 'bot' ? renderMessage(msg.text) : <p>{msg.text}</p>}
              </div>
              {msg.role === 'user' && (
                <div className="msg-avatar user-msg-avatar"><User size={14} /></div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="message-row bot">
              <div className="msg-avatar bot-msg-avatar"><Bot size={14} /></div>
              <div className="message-bubble bot-bubble typing-bubble">
                <span className="dot" /><span className="dot" /><span className="dot" />
              </div>
            </div>
          )}

          {/* Suggested questions */}
          {showSuggestions && messages.length <= 1 && classroomName && (
            <div className="suggestions-wrap">
              <p className="suggestions-label">Try asking:</p>
              <div className="suggestions-grid">
                {SUGGESTED.map((s) => (
                  <button key={s.label} className="suggestion-chip" onClick={() => sendMessage(s.query)}>
                    <ChevronRight size={12} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="chat-input-wrap">
          <input
            ref={inputRef}
            className="chat-input"
            type="text"
            placeholder={classroomName ? 'Ask about your timetable...' : 'Select a classroom first...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping || !classroomName}
          />
          <button
            className={`chat-send-btn ${!input.trim() || isTyping || !classroomName ? 'disabled' : ''}`}
            onClick={() => sendMessage()}
            disabled={!input.trim() || isTyping || !classroomName}
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      <style jsx>{`
        /* FAB */
        .chat-fab {
          position: fixed;
          bottom: 28px;
          right: 28px;
          z-index: 1000;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 20px;
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-purple));
          color: white;
          border: none;
          border-radius: var(--radius-full);
          cursor: pointer;
          box-shadow: 0 8px 30px -5px var(--accent-primary-glow), 0 0 20px rgba(168,85,247,0.3);
          transition: all var(--transition-normal);
          font-weight: 700;
          font-size: 0.9rem;
        }
        .chat-fab:hover {
          transform: translateY(-3px) scale(1.03);
          box-shadow: 0 12px 40px -5px var(--accent-primary-glow), 0 0 30px rgba(168,85,247,0.4);
        }
        .chat-fab.open {
          padding: 14px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ef4444, #b91c1c);
          box-shadow: 0 6px 20px -3px rgba(239,68,68,0.4);
        }
        .chat-fab-label { font-size: 0.85rem; }

        /* Chat Panel */
        .chat-panel {
          position: fixed;
          bottom: 90px;
          right: 28px;
          z-index: 999;
          width: 380px;
          max-width: calc(100vw - 40px);
          height: 520px;
          max-height: calc(100vh - 120px);
          background: var(--glass-bg);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-lg);
          box-shadow: 0 24px 60px -10px rgba(0,0,0,0.6), 0 0 40px -10px var(--accent-primary-glow);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transform: translateY(20px) scale(0.96);
          opacity: 0;
          pointer-events: none;
          transition: all var(--transition-normal);
        }
        .chat-panel.visible {
          transform: translateY(0) scale(1);
          opacity: 1;
          pointer-events: all;
        }
        .chat-panel::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        }

        /* Chat Header */
        .chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 18px;
          background: linear-gradient(135deg, rgba(79,70,229,0.15), rgba(168,85,247,0.1));
          border-bottom: 1px solid var(--glass-border);
          flex-shrink: 0;
        }
        .chat-header-info { display: flex; align-items: center; gap: 10px; }
        .bot-avatar {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-purple));
          display: flex; align-items: center; justify-content: center;
          color: white;
          flex-shrink: 0;
        }
        .chat-header-title { font-weight: 700; font-size: 0.95rem; }
        .chat-header-sub { font-size: 0.75rem; color: var(--text-muted); margin-top: 1px; }
        .chat-close-btn {
          background: transparent; border: none; color: var(--text-muted);
          cursor: pointer; padding: 6px; border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }
        .chat-close-btn:hover { color: var(--text-primary); background: rgba(255,255,255,0.06); }

        /* Messages */
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          scrollbar-width: thin;
          scrollbar-color: var(--bg-tertiary) transparent;
        }
        .message-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
        }
        .message-row.user { justify-content: flex-end; }
        .message-row.bot { justify-content: flex-start; }
        .msg-avatar {
          width: 26px; height: 26px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; font-size: 12px;
        }
        .bot-msg-avatar { background: linear-gradient(135deg, var(--accent-primary), var(--accent-purple)); color: white; }
        .user-msg-avatar { background: var(--bg-tertiary); color: var(--text-secondary); }

        .message-bubble {
          max-width: 82%;
          padding: 10px 14px;
          border-radius: 16px;
          font-size: 0.85rem;
          line-height: 1.55;
        }
        .bot-bubble {
          background: rgba(19,26,38,0.9);
          border: 1px solid var(--glass-border);
          border-bottom-left-radius: 4px;
          color: var(--text-primary);
        }
        .bot-bubble :global(strong) { color: var(--accent-secondary); }
        .user-bubble {
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-purple));
          color: white;
          border-bottom-right-radius: 4px;
        }
        .message-bubble p { margin: 1px 0; }

        /* Typing indicator */
        .typing-bubble { display: flex; align-items: center; gap: 4px; padding: 14px 18px; }
        .dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--text-muted);
          animation: bounce 1.2s infinite;
        }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-6px); opacity: 1; }
        }

        /* Suggestions */
        .suggestions-wrap { margin-top: 4px; }
        .suggestions-label {
          font-size: 0.72rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
          font-weight: 600;
        }
        .suggestions-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .suggestion-chip {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 5px 10px;
          border-radius: var(--radius-full);
          font-size: 0.78rem;
          font-weight: 500;
          background: rgba(79,70,229,0.1);
          border: 1px solid rgba(79,70,229,0.25);
          color: var(--accent-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .suggestion-chip:hover {
          background: rgba(79,70,229,0.2);
          border-color: var(--accent-secondary);
          transform: translateY(-1px);
        }

        /* Input */
        .chat-input-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 14px;
          border-top: 1px solid var(--glass-border);
          background: rgba(10,14,23,0.4);
          flex-shrink: 0;
        }
        .chat-input {
          flex: 1;
          background: rgba(19,26,38,0.8);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-full);
          padding: 10px 16px;
          color: var(--text-primary);
          font-size: 0.88rem;
          transition: all var(--transition-fast);
        }
        .chat-input:focus {
          outline: none;
          border-color: var(--accent-secondary);
          box-shadow: 0 0 0 3px var(--accent-secondary-glow);
        }
        .chat-input::placeholder { color: var(--text-muted); }
        .chat-input:disabled { opacity: 0.5; cursor: not-allowed; }
        .chat-send-btn {
          width: 38px; height: 38px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-purple));
          color: white;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: all var(--transition-fast);
          box-shadow: 0 3px 10px -2px var(--accent-primary-glow);
        }
        .chat-send-btn:hover:not(.disabled) {
          transform: scale(1.1);
          box-shadow: 0 6px 15px -3px var(--accent-primary-glow);
        }
        .chat-send-btn.disabled {
          background: var(--bg-tertiary);
          box-shadow: none;
          cursor: not-allowed;
          opacity: 0.5;
        }

        @media (max-width: 480px) {
          .chat-panel { right: 12px; bottom: 80px; width: calc(100vw - 24px); }
          .chat-fab { right: 16px; bottom: 20px; }
        }
      `}</style>
    </>
  );
}
