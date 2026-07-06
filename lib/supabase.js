import { createClient } from '@supabase/supabase-js';

// Helper to sanitize environment variables (removes accidental quotes and trims spaces)
function cleanEnvValue(value) {
  if (!value) return '';
  let cleaned = value.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseUrl = cleanEnvValue(rawSupabaseUrl) || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = cleanEnvValue(rawSupabaseAnonKey) || 'placeholder-anon-key';

// Print safety checks to the build log to debug formatting issues
console.log(`[Supabase Config Debug] URL length: ${supabaseUrl.length}`);
console.log(`[Supabase Config Debug] URL starts with: "${supabaseUrl.substring(0, 15)}"`);

if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  console.error(`[Supabase Config Debug] ERROR: URL must start with http:// or https://. Value is: "${supabaseUrl}"`);
}

if (!rawSupabaseUrl || !rawSupabaseAnonKey) {
  console.warn(
    'Supabase URL or Anon Key is missing. Using placeholders for build compilation. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables for production.'
  );
}

// Client-side and server-side public client (uses Anon Key, subject to RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side admin client (uses Service Role Key, bypasses RLS for notifications and secure actions)
export const getSupabaseAdmin = () => {
  const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serviceKey = cleanEnvValue(rawServiceKey) || 'placeholder-service-key';
  
  if (!rawServiceKey) {
    console.warn(
      'SUPABASE_SERVICE_ROLE_KEY is missing. Using placeholders. Make sure this is set in production.'
    );
  }
  
  return createClient(supabaseUrl, serviceKey);
};
