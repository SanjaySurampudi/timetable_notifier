import { getSupabaseAdmin } from './supabase';

/**
 * Verifies if the request is authenticated via Supabase.
 * Returns the user if authenticated, otherwise null.
 */
export async function verifyAdmin(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const supabaseAdmin = getSupabaseAdmin();
    
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }

    return user;
  } catch (err) {
    console.error('Error verifying admin session:', err);
    return null;
  }
}
