import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://oajnvirtgkpfdnxosgpu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ham52aXJ0Z2twZmRueG9zZ3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTY4NzAsImV4cCI6MjA3OTU5Mjg3MH0.QvS3mKnWCNigDH7cpPje2je6uxiBMhNR8dgZmYP05LA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
});
