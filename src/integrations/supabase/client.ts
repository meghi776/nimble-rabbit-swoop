// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://smpjbedvyqensurarrym.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtcGpiZWR2eXFlbnN1cmFycnltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2NjE0NDIsImV4cCI6MjA2NjIzNzQ0Mn0.-hxqZCleudpwenhHHFWELZdPtbi7TWVyV1q6SMOIlO0";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true, // Explicitly set to true (default)
    autoRefreshToken: true, // Explicitly set to true (default)
    detectSessionInUrl: true, // Explicitly set to true (default)
    storage: localStorage, // Explicitly use localStorage (default)
  },
});