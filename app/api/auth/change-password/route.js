// app/api/auth/change-password/route.js
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabase, getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();
    if (!newPassword || newPassword.trim().length < 4) {
      return NextResponse.json({ error: 'New password must be at least 4 characters long' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const role = session.role;
    const userId = session.id || session.userId;

    // 1. Admin Change Password (via Supabase Auth API)
    if (role === 'admin') {
      // Supabase handles update for current authenticated user.
      // Since it's server-side, we must ensure we update the user's password.
      // Note: We can use the admin client to update user password by ID directly.
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: 'Admin password updated successfully.' });
    }

    // 2. Pre-Admin Change Password (Plaintext in pre_admins table)
    if (role === 'pre_admin') {
      // First fetch to verify current password
      const { data: preAdmin, error: fetchErr } = await supabaseAdmin
        .from('pre_admins')
        .select('password')
        .eq('id', userId)
        .single();

      if (fetchErr || !preAdmin) {
        return NextResponse.json({ error: 'Pre-Admin account not found' }, { status: 404 });
      }

      if (currentPassword && preAdmin.password !== currentPassword) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }

      // Update password
      const { error: updateErr } = await supabaseAdmin
        .from('pre_admins')
        .update({ password: newPassword })
        .eq('id', userId);

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Pre-Admin password updated successfully.' });
    }

    // 3. Standard User Change Password (Plaintext in users table)
    if (role === 'user') {
      // First fetch to verify current password
      const { data: user, error: fetchErr } = await supabaseAdmin
        .from('users')
        .select('password')
        .eq('id', userId)
        .single();

      if (fetchErr || !user) {
        return NextResponse.json({ error: 'User account not found' }, { status: 404 });
      }

      if (currentPassword && user.password !== currentPassword) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }

      // Update password
      const { error: updateErr } = await supabaseAdmin
        .from('users')
        .update({ password: newPassword })
        .eq('id', userId);

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Password updated successfully.' });
    }

    return NextResponse.json({ error: 'Invalid user role' }, { status: 400 });
  } catch (error) {
    console.error('[Change Password Error]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
