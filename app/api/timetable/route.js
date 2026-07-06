import { NextResponse } from 'next/server';
import { supabase, getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/auth';

// GET /api/timetable - Fetch timetable for a classroom (Public access)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id');

    if (!classroomId) {
      return NextResponse.json({ error: 'Classroom ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('timetable')
      .select('*')
      .eq('classroom_id', classroomId)
      // Sort in order to display properly
      .order('start_time', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ schedule: data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching timetable:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/timetable - Save/Overwrite timetable for a classroom (Admin only)
export async function POST(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { classroom_id, schedule } = body;

    if (!classroom_id) {
      return NextResponse.json({ error: 'Classroom ID is required' }, { status: 400 });
    }

    if (!Array.isArray(schedule)) {
      return NextResponse.json({ error: 'Schedule must be an array' }, { status: 400 });
    }

    // Validate timetable entries
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

    // Overwrite: Delete existing timetable for this classroom first
    const { error: deleteError } = await supabaseAdmin
      .from('timetable')
      .delete()
      .eq('classroom_id', classroom_id);

    if (deleteError) throw deleteError;

    // Insert new schedule (if there are items)
    if (formattedSchedule.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('timetable')
        .insert(formattedSchedule);

      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true, count: formattedSchedule.length }, { status: 200 });
  } catch (error) {
    console.error('Error saving timetable:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
