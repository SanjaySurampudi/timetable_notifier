import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/auth';

// GET /api/requests - Fetch all requests (Admin only)
export async function GET(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ requests: data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching requests:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/requests - Submit a classroom addition request (Public)
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, classroom, contact_number, message } = body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!email || email.trim() === '') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!classroom || classroom.trim() === '') {
      return NextResponse.json({ error: 'Classroom name is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('requests')
      .insert([
        {
          name: name.trim(),
          email: email.trim(),
          classroom: classroom.trim(),
          contact_number: contact_number?.trim() || null,
          message: message?.trim() || null,
          status: 'pending'
        }
      ])
      .select();

    if (error) throw error;
    return NextResponse.json({ request: data[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating request:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/requests - Update request status (Admin only)
export async function PATCH(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }
    if (!status || !['pending', 'completed', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Valid status is required (pending, completed, rejected)' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('requests')
      .update({ status })
      .eq('id', id)
      .select();

    if (error) throw error;
    return NextResponse.json({ request: data[0] }, { status: 200 });
  } catch (error) {
    console.error('Error updating request:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/requests - Delete a request (Admin only)
export async function DELETE(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from('requests')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Request deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting request:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
