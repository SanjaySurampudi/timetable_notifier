// app/api/auth/session/route.js
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET(request) {
  try {
    const session = await getSession(request);
    
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }
    
    return NextResponse.json({
      authenticated: true,
      role: session.role,
      user: {
        id: session.id || session.userId,
        roll_number: session.roll_number,
        email: session.email,
        username: session.username || session.email,
        classroom_id: session.classroom_id,
        classroom_name: session.classroom_name
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ authenticated: false, error: error.message }, { status: 500 });
  }
}
