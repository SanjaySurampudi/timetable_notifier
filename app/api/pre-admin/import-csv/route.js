// app/api/pre-admin/import-csv/route.js
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase';

// Parse a simple CSV text into an array of objects using the header row as keys
function parseCSV(text) {
  const lines = text
    .split('\n')
    .map(l => l.replace(/\r/g, '').trim())
    .filter(l => l.length > 0);

  if (lines.length < 2) {
    throw new Error('CSV file must have a header row and at least one data row.');
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    // Handle quoted values with commas inside
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.length !== headers.length) continue; // skip malformed rows

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }

  return rows;
}

const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// POST /api/pre-admin/import-csv
export async function POST(request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'pre_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No CSV file provided.' }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text);

    const formatted = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is the header

      // Normalise field names — accept both snake_case and space versions
      const day = (row['day_of_week'] || row['day'] || '').trim();
      const subject = (row['subject'] || row['subject_name'] || '').trim();
      const startTime = (row['start_time'] || row['start'] || '').trim();
      const endTime = (row['end_time'] || row['end'] || '').trim();
      const teacher = (row['teacher'] || row['professor'] || row['faculty'] || '').trim();
      const room = (row['room'] || row['classroom'] || row['location'] || '').trim();

      // Capitalise day properly (Monday, not monday)
      const capitalDay = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();

      if (!VALID_DAYS.includes(capitalDay)) {
        errors.push(`Row ${rowNum}: Invalid day "${day}". Must be one of: ${VALID_DAYS.join(', ')}.`);
        continue;
      }
      if (!subject) {
        errors.push(`Row ${rowNum}: Subject is required.`);
        continue;
      }
      if (!startTime || !endTime) {
        errors.push(`Row ${rowNum}: start_time and end_time are required.`);
        continue;
      }

      // Normalise time to HH:MM:SS
      const normTime = (t) => {
        if (t.match(/^\d{2}:\d{2}:\d{2}$/)) return t;
        if (t.match(/^\d{2}:\d{2}$/)) return t + ':00';
        if (t.match(/^\d{1}:\d{2}$/)) return '0' + t + ':00';
        return t + ':00';
      };

      formatted.push({
        classroom_id: session.classroom_id,
        day_of_week: capitalDay,
        subject,
        start_time: normTime(startTime),
        end_time: normTime(endTime),
        teacher: teacher || null,
        room: room || null,
      });
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: 'CSV has validation errors', details: errors }, { status: 400 });
    }

    if (formatted.length === 0) {
      return NextResponse.json({ error: 'No valid rows found in CSV file.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Delete existing timetable for this classroom, then insert new
    const { error: deleteError } = await supabaseAdmin
      .from('timetable')
      .delete()
      .eq('classroom_id', session.classroom_id);

    if (deleteError) throw deleteError;

    const { error: insertError } = await supabaseAdmin
      .from('timetable')
      .insert(formatted);

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      count: formatted.length,
      message: `Successfully imported ${formatted.length} timetable entries.`,
    });
  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
