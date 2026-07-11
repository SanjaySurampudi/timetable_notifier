// app/api/admin/contact-info/route.js
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET: Public fetch of contact info for login page
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('contact_info')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error fetching contact info:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const contact = data && data.length > 0 ? data[0] : {
      email: 'support@college.edu',
      phone: '+1-800-123-4567',
      address: '123 College Ave, City, Country'
    };

    return NextResponse.json({ contact }, { status: 200 });
  } catch (error) {
    console.error('[Contact Info GET Error]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Admin updates contact info
export async function POST(request) {
  try {
    // 1. Authorize Admin
    const session = await getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const { email, phone, address } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Check if there is an existing record
    const { data: existing, error: checkErr } = await supabaseAdmin
      .from('contact_info')
      .select('id')
      .limit(1);

    if (checkErr) {
      return NextResponse.json({ error: checkErr.message }, { status: 500 });
    }

    let saveErr;
    if (existing && existing.length > 0) {
      // Update
      const { error } = await supabaseAdmin
        .from('contact_info')
        .update({ email, phone, address })
        .eq('id', existing[0].id);
      saveErr = error;
    } else {
      // Insert
      const { error } = await supabaseAdmin
        .from('contact_info')
        .insert([{ email, phone, address }]);
      saveErr = error;
    }

    if (saveErr) {
      return NextResponse.json({ error: saveErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Contact info updated successfully.' });
  } catch (error) {
    console.error('[Contact Info POST Error]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
