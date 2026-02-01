
import { createClient } from '@supabase/supabase-js';

// Environment variables should be in a .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const msg = 'Supabase environment variables are missing! Application cannot start.';
  console.error(msg);
  alert(msg); // Alert the user immediately
  throw new Error(msg);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
