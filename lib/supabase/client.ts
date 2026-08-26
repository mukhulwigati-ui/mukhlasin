import { createBrowserClient } from '@supabase/ssr';

// Fungsi helper untuk mendapatkan client secara aman (Lazy Initialization)
export const getSupabaseClient = () => {
  const supabaseUrl = 
    process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.NEXT_SUPABASE_URL || 
    'https://placeholder-project.supabase.co';

  const supabaseAnonKey = 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    process.env.NEXT_SUPABASE_ANON_KEY || 
    'placeholder-anon-key';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

// Export instance tunggal dengan aman (menggunakan getter atau fungsi wrapper jika diperlukan, 
// atau biarkan komponen memanggil fungsi getSupabaseClient saat runtime)
export const supabase = {
  // Proxy sederhana agar jika ada kode lama yang memanggil `supabase.from(...)` tetap aman saat build statis
  from: (table: string) => getSupabaseClient().from(table),
  auth: getSupabaseClient().auth,
  channel: (name: string) => getSupabaseClient().channel(name),
  removeChannel: (channel: any) => getSupabaseClient().removeChannel(channel),
  removeAllChannels: () => getSupabaseClient().removeAllChannels(),
};