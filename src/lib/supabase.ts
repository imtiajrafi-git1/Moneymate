import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL
)?.trim();
const supabaseAnonKey = (
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim();

export const supabase = (() => {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  try {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'moneymate-academic-auth',
      },
    });
  } catch (cause) {
    console.error('Supabase configuration is invalid:', cause);
    return null;
  }
})();
