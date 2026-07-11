// app/api/pre-admin/change-password/route.js
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase';

// POST /api/pre-admin/change-password
export async function POST(request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'pre_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { current_password, new_password } = body;

    if (!current_password || !new_password) {
      return NextResponse.json({ error: 'Current and new password are required.' }, { status: 400 });
    }

    if (new_password.trim().length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Fetch the pre-admin's current password from DB
    const { data, error } = await supabaseAdmin
      .from('pre_admins')
      .select('password')
      .eq('id', session.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Could not verify your account.' }, { status: 500 });
    }

    // 2. Verify current password matches
    if (data.password !== current_password) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
    }

    // 3. Update password
    const { error: updateError } = await supabaseAdmin
      .from('pre_admins')
      .update({ password: new_password.trim() })
      .eq('id', session.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: 'Password updated successfully!' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
