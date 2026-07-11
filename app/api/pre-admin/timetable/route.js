// app/api/pre-admin/timetable/route.js
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase';

// POST /api/pre-admin/timetable - Overwrite timetable for assigned classroom only (Pre-Admin only)
export async function POST(request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'pre_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { classroom_id, schedule } = body;

    if (!classroom_id) {
      return NextResponse.json({ error: 'Classroom ID is required' }, { status: 400 });
    }

    // Security Gate: Ensure the pre-admin can only write to their own classroom!
    if (classroom_id !== session.classroom_id) {
      return NextResponse.json({ error: 'Forbidden: You can only manage your assigned classroom timetable.' }, { status: 403 });
    }

    if (!Array.isArray(schedule)) {
      return NextResponse.json({ error: 'Schedule must be an array' }, { status: 400 });
    }

    const formattedSchedule = [];
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    for (const entry of schedule) {
      const { day_of_week, subject, start_time, end_time, teacher, room } = entry;

      if (!day_of_week || !validDays.includes(day_of_week)) {
        return NextResponse.json({ error: `Invalid day of week: ${day_of_week}` }, { status: 400 });
      }
      if (!subject || subject.trim() === '') {
        return NextResponse.json({ error: 'Subject name is required for all entries' }, { status: 400 });
      }
      if (!start_time || !end_time) {
        return NextResponse.json({ error: 'Start time and end time are required for all entries' }, { status: 400 });
      }

      formattedSchedule.push({
        classroom_id,
        day_of_week,
        subject: subject.trim(),
        start_time,
        end_time,
        teacher: teacher?.trim() || null,
        room: room?.trim() || null,
      });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Delete existing timetable for this classroom
    const { error: deleteError } = await supabaseAdmin
      .from('timetable')
      .delete()
      .eq('classroom_id', classroom_id);

    if (deleteError) throw deleteError;

    // Insert new schedule
    if (formattedSchedule.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('timetable')
        .insert(formattedSchedule);

      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true, count: formattedSchedule.length }, { status: 200 });
  } catch (error) {
    console.error('Error in pre-admin timetable edit:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
