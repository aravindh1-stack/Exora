import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  'https://dfladezsmmzymvrrhaee.supabase.co';

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmbGFkZXpzbW16eW12cnJoYWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5Nzk5MTIsImV4cCI6MjEwMjU1NTkxMn0.kcN7aFm7_w7CZkW7DtTGuPoCGmyd2_bu5vpup_37LWE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});
