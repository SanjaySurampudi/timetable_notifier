// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase, getSupabaseAdmin } from '@/lib/supabase';
import { signSession } from '@/lib/session';

export async function POST(request) {
  try {
    const body = await request.json();
    const { role, identifier, password } = body;

    if (!role || !identifier) {
      return NextResponse.json({ error: 'Username/Email and role are required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabaseAdmin = getSupabaseAdmin();

    // Get dynamic session expiry
    const expirySeconds = await (async () => {
      try {
        const { data: cfg, error } = await supabaseAdmin
          .from('app_settings')
          .select('value')
          .eq('key', 'session_expiry_seconds')
          .single();
        if (error || !cfg) return 604800;
        const secs = parseInt(cfg.value, 10);
        return isNaN(secs) ? 604800 : secs;
      } catch (e) {
        return 604800;
      }
    })();

    // 1. Admin Role Auth
    if (role === 'admin') {
      if (!password) {
        return NextResponse.json({ error: 'Password is required for admin' }, { status: 400 });
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifier,
        password: password,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }

      const sessionToken = await signSession({
        role: 'admin',
        userId: data.user.id,
        email: data.user.email,
      }, expirySeconds);

      cookieStore.set('session_token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: expirySeconds,
        path: '/',
      });

      return NextResponse.json({
        success: true,
        role: 'admin',
        user: { id: data.user.id, email: data.user.email },
        session: data.session
      });
    }

    // 2. Pre-Admin Role Auth (now requires password)
    if (role === 'pre_admin') {
      if (!password) {
        return NextResponse.json({ error: 'Password is required' }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from('pre_admins')
        .select('*, classrooms(name)')
        .or(`roll_number.eq."${identifier}",email.eq."${identifier}"`);

      if (error) {
        console.error('Database error during pre-admin check:', error);
        return NextResponse.json({ error: 'Database check failed. Please ensure schema.sql was run.' }, { status: 500 });
      }

      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Pre-Admin account not found. Please contact the Admin.' }, { status: 401 });
      }

      const preAdmin = data[0];

      // Validate password
      if (preAdmin.password !== password) {
        return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
      }

      const sessionToken = await signSession({
        role: 'pre_admin',
        id: preAdmin.id,
        roll_number: preAdmin.roll_number,
        email: preAdmin.email,
        classroom_id: preAdmin.classroom_id,
        classroom_name: preAdmin.classrooms?.name || 'Assigned Classroom',
      }, expirySeconds);

      cookieStore.set('session_token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: expirySeconds,
        path: '/',
      });

      return NextResponse.json({
        success: true,
        role: 'pre_admin',
        user: {
          id: preAdmin.id,
          roll_number: preAdmin.roll_number,
          email: preAdmin.email,
          classroom_id: preAdmin.classroom_id,
          classroom_name: preAdmin.classrooms?.name,
        },
      });
    }

    // 3. User Role Auth
    if (role === 'user') {
      if (!password) {
        return NextResponse.json({ error: 'Password is required' }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .or(`roll_number.eq."${identifier}",email.eq."${identifier}"`);

      if (error) {
        console.error('Database error during user check:', error);
        return NextResponse.json({ error: 'Database check failed. Please ensure schema.sql was run.' }, { status: 500 });
      }

      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'User account not found.' }, { status: 401 });
      }

      const user = data[0];

      if (user.password !== password) {
        return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
      }

      const sessionToken = await signSession({
        role: 'user',
        id: user.id,
        roll_number: user.roll_number,
        email: user.email,
        username: user.roll_number || user.email,
      }, expirySeconds);

      cookieStore.set('session_token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: expirySeconds,
        path: '/',
      });

      return NextResponse.json({
        success: true,
        role: 'user',
        user: {
          id: user.id,
          roll_number: user.roll_number,
          email: user.email,
          username: user.roll_number || user.email,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid login role specified.' }, { status: 400 });
  } catch (error) {
    console.error('Login route error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
