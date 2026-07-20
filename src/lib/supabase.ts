import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://dmenljopflcqjqdsqtgb.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZW5sam9wZmxjcWpxZHNxdGdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NTAzNjgsImV4cCI6MjA5OTIyNjM2OH0.vlrcWFMqYzSFnQNX8W1zwzmxm91cOYKi4jq7wHCGt7o';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});
