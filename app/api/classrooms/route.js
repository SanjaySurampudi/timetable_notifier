import { NextResponse } from 'next/server';
import { supabase, getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/auth';

// GET /api/classrooms - Fetch all classrooms (Public access)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('classrooms')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ classrooms: data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching classrooms:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/classrooms - Create a classroom (Admin only)
export async function POST(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Classroom name is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('classrooms')
      .insert([{ name: name.trim() }])
      .select();

    if (error) throw error;
    return NextResponse.json({ classroom: data[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating classroom:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/classrooms - Delete a classroom (Admin only)
export async function DELETE(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Classroom ID is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from('classrooms')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Classroom deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting classroom:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
