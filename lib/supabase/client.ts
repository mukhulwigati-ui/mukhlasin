import { createBrowserClient } from '@supabase/ssr';

// Mendeteksi berbagai variasi nama environment variable di Vercel/Lokal + Fallback aman saat build
const supabaseUrl = 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 
  process.env.NEXT_SUPABASE_URL || 
  'https://placeholder-project.supabase.co';

const supabaseAnonKey = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.NEXT_SUPABASE_ANON_KEY || 
  'placeholder-anon-key';

export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
);