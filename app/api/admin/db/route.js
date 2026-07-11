// app/api/admin/db/route.js
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase';

const ALLOWED_TABLES = [
  'classrooms',
  'timetable',
  'push_subscriptions',
  'telegram_subscriptions',
  'pre_admins',
  'users',
  'requests'
];

export async function GET(request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');

    if (!table || !ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from(table)
      .select('*')
      .order('created_at', { ascending: false, nullsFirst: false });

    if (error) throw error;

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching database table:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
