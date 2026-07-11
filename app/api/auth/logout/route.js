// app/api/auth/logout/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('session_token');
    
    // Also sign out from Supabase if we have a session
    await supabase.auth.signOut();

    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
