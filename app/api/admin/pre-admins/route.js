// app/api/admin/pre-admins/route.js
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET /api/admin/pre-admins - List pre-admins
export async function GET(request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('pre_admins')
      .select('*, classrooms(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ preAdmins: data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching pre-admins:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/pre-admins - Add pre-admin
export async function POST(request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { roll_number, email, classroom_id } = body;

    if (!classroom_id) {
      return NextResponse.json({ error: 'Classroom ID is required' }, { status: 400 });
    }

    if (!roll_number && !email) {
      return NextResponse.json({ error: 'Either roll number or college email is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const insertData = {
      classroom_id,
      roll_number: roll_number?.trim() || null,
      email: email?.trim() || null
    };

    const { data, error } = await supabaseAdmin
      .from('pre_admins')
      .insert([insertData])
      .select();

    if (error) throw error;
    return NextResponse.json({ preAdmin: data[0] }, { status: 201 });
  } catch (error) {
    console.error('Error adding pre-admin:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/pre-admins - Delete pre-admin mapping
export async function DELETE(request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Pre-Admin ID is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from('pre_admins')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Pre-Admin deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting pre-admin:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
