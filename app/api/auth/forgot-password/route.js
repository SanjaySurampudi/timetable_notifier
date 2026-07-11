// app/api/auth/forgot-password/route.js
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { identifier } = await request.json();
    if (!identifier) {
      return NextResponse.json({ error: 'Email or Roll number is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    let found = false;
    let foundRole = '';

    // 1. Check in pre_admins
    const { data: paData } = await supabaseAdmin
      .from('pre_admins')
      .select('email, roll_number')
      .or(`roll_number.eq."${identifier}",email.eq."${identifier}"`)
      .limit(1);

    if (paData && paData.length > 0) {
      found = true;
      foundRole = 'pre_admin';
    }

    // 2. Check in users
    if (!found) {
      const { data: uData } = await supabaseAdmin
        .from('users')
        .select('email, roll_number')
        .or(`roll_number.eq."${identifier}",email.eq."${identifier}"`)
        .limit(1);

      if (uData && uData.length > 0) {
        found = true;
        foundRole = 'user';
      }
    }

    // 3. Log reset request
    console.log(`[Forgot Password] Requested for identifier: "${identifier}". Found: ${found} (Role: ${foundRole})`);

    // Return a generic success message to prevent user enumeration
    return NextResponse.json({
      success: true,
      message: 'If the identifier exists in our database, a password reset link/instructions have been sent to the associated email.'
    }, { status: 200 });

  } catch (error) {
    console.error('[Forgot Password Error]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
