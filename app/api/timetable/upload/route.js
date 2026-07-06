import { NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';
import { verifyAdmin } from '@/lib/auth';

// Helper to convert time strings (e.g. "9:30 AM", "14:15") to 24-hour time "HH:MM:SS"
function normalizeTime(timeStr) {
  if (!timeStr) return null;
  timeStr = timeStr.trim().toUpperCase();

  // Match formats like 9:30 AM, 09:30, 9 AM, 14:15
  const match = timeStr.match(/^(\d{1,2})[:.]?(\d{2})?\s*(AM|PM)?$/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const ampm = match[3];

  if (ampm === 'PM' && hours < 12) {
    hours += 12;
  } else if (ampm === 'AM' && hours === 12) {
    hours = 0;
  }

  const hStr = hours.toString().padStart(2, '0');
  const mStr = minutes.toString().padStart(2, '0');
  return `${hStr}:${mStr}:00`;
}

// Heuristic parser to extract schedule entries from PDF text
function parseTimetableText(text) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const schedule = [];
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  let currentDay = null;
  let activeEntry = null;

  // Regex to detect time ranges, e.g. "09:00 - 10:30", "9:00 AM to 11:00 AM", "13.00-14.30"
  // Captures: group 1 & 2 (start hour/min), group 3 (start AM/PM), group 4 & 5 (end hour/min), group 6 (end AM/PM)
  const timeRangeRegex = /\b(\d{1,2})[:.](\d{2})\s*(AM|PM)?\s*(?:-|–|TO)\s*(\d{1,2})[:.](\d{2})\s*(AM|PM)?\b/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Check if line represents a day of the week
    const matchedDay = daysOfWeek.find((d) => line.toLowerCase() === d.toLowerCase() || line.toLowerCase().startsWith(d.toLowerCase() + ':'));
    if (matchedDay) {
      currentDay = matchedDay;
      continue;
    }

    // Also look for days embedded inside lines, e.g. "Monday Classes" or "Day: Tuesday"
    const embeddedDay = daysOfWeek.find((d) => new RegExp(`\\b${d}\\b`, 'i').test(line));
    if (embeddedDay && !currentDay) {
      currentDay = embeddedDay;
    }

    // 2. Check for time range in the line
    const timeMatch = line.match(timeRangeRegex);
    if (timeMatch) {
      // Save previously building entry if it exists
      if (activeEntry && currentDay) {
        schedule.push(activeEntry);
      }

      const startTimeStr = `${timeMatch[1]}:${timeMatch[2]} ${timeMatch[3] || ''}`.trim();
      const endTimeStr = `${timeMatch[4]}:${timeMatch[5]} ${timeMatch[6] || ''}`.trim();

      const startTimeFormatted = normalizeTime(startTimeStr);
      const endTimeFormatted = normalizeTime(endTimeStr);

      if (startTimeFormatted && endTimeFormatted) {
        activeEntry = {
          day_of_week: currentDay || 'Monday', // fallback to Monday if no day has been seen yet
          start_time: startTimeFormatted,
          end_time: endTimeFormatted,
          subject: '',
          teacher: '',
          room: '',
        };

        // Extract metadata from the rest of the line that is not the time range
        let remainingText = line.replace(timeMatch[0], '').trim();
        
        // Remove brackets or separators
        remainingText = remainingText.replace(/^[\s,:-]+|[\s,:-]+$/g, '');

        if (remainingText.length > 0) {
          parseDetails(remainingText, activeEntry);
        }
      }
      continue;
    }

    // 3. If we have an active entry, lines following the time range represent subject/teacher/room details
    if (activeEntry) {
      // If we see typical teacher/room identifiers or just the subject
      if (line.toLowerCase().startsWith('teacher:') || line.toLowerCase().startsWith('prof:') || line.toLowerCase().startsWith('dr.')) {
        activeEntry.teacher = line.replace(/^(teacher|prof|dr\.)\s*:\s*/i, '').trim();
      } else if (line.toLowerCase().startsWith('room:') || line.toLowerCase().startsWith('rm:') || line.toLowerCase().startsWith('hall:')) {
        activeEntry.room = line.replace(/^(room|rm|hall)\s*:\s*/i, '').trim();
      } else {
        // Parse unstructured text line (often the subject first, then teacher/room)
        if (!activeEntry.subject) {
          activeEntry.subject = line;
        } else if (!activeEntry.teacher && !activeEntry.room) {
          parseDetails(line, activeEntry);
        } else {
          // If we already have a subject and are collecting extra notes, append it
          activeEntry.subject += ` ${line}`;
        }
      }
    }
  }

  // Push final entry
  if (activeEntry) {
    schedule.push(activeEntry);
  }

  return schedule;
}

// Heuristically extract teacher, room, and subject from a text snippet
function parseDetails(text, entry) {
  // Regex patterns
  const roomPattern = /\b(?:Room|Rm|Lab|Hall|Classroom)\s*[-:]?\s*([A-Z0-9-]+)\b|\b([A-Z]-\d{3})\b|\b(?:Room)\s+(\d+)\b/i;
  const teacherPattern = /\b(?:Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/i;

  const roomMatch = text.match(roomPattern);
  if (roomMatch) {
    entry.room = roomMatch[0];
    text = text.replace(roomMatch[0], '');
  }

  const teacherMatch = text.match(teacherPattern);
  if (teacherMatch) {
    entry.teacher = teacherMatch[0];
    text = text.replace(teacherMatch[0], '');
  }

  // Whatever is left (cleaned of punctuation) is probably the subject
  const cleanedText = text.replace(/^[\s,:-]+|[\s,:-]+$/g, '').trim();
  if (cleanedText.length > 0) {
    if (!entry.subject) {
      entry.subject = cleanedText;
    } else {
      // Append if it's supplementary subject text
      entry.subject += ` ${cleanedText}`;
    }
  }
}

// POST /api/timetable/upload - Upload and Parse PDF
export async function POST(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be in PDF format' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF text content
    const parser = new PDFParse(buffer);
    const data = await parser.getText();
    const text = data.text;

    // Run heuristic text parser
    const parsedSchedule = parseTimetableText(text);

    return NextResponse.json({
      success: true,
      rawText: text,
      schedule: parsedSchedule,
    }, { status: 200 });

  } catch (error) {
    console.error('Error parsing PDF timetable:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
