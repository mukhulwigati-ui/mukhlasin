import { createBrowserClient } from '@supabase/ssr';

// Fungsi utama untuk membuat client Supabase secara aman saat runtime
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key are missing in environment variables.');
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// ⚠️ JANGAN export objek `supabase` global di sini, 
// karena itu yang memicu error saat prerendering / build Next.js!