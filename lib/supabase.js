import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    'Supabase URL or Anon Key is missing. Using placeholders for build compilation. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables for production.'
  );
}

// Client-side and server-side public client (uses Anon Key, subject to RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side admin client (uses Service Role Key, bypasses RLS for notifications and secure actions)
export const getSupabaseAdmin = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      'SUPABASE_SERVICE_ROLE_KEY is missing. Using placeholders. Make sure this is set in production.'
    );
  }
  
  return createClient(supabaseUrl, serviceKey);
};
