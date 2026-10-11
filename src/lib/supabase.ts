import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kcqfcwcajcotawrtklov.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjcWZjd2NhamNvdGF3cnRrbG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MTA2MTcsImV4cCI6MjEwNzI4NjYxN30.tQ_0xebVynTW6Dd7ImJw8Wab9tBwaz5xeKUqGlcdY1g';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
