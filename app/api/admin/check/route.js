import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';

// GET /api/admin/check - Verify admin authorization
export async function GET(request) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ authenticated: false, error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, user: admin }, { status: 200 });
}
