import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const getAuthStorage = (): Storage | undefined => {
  // In some embedded/iframe contexts, localStorage can be blocked. Fallback to sessionStorage.
  try {
    const k = '__sb_storage_test__';
    window.localStorage.setItem(k, k);
    window.localStorage.removeItem(k);
    return window.localStorage;
  } catch {
    try {
      const k = '__sb_storage_test__';
      window.sessionStorage.setItem(k, k);
      window.sessionStorage.removeItem(k);
      return window.sessionStorage;
    } catch {
      return undefined;
    }
  }
};

const storage = typeof window !== 'undefined' ? getAuthStorage() : undefined;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    ...(storage ? { storage } : {}),
  },
  global: {
    headers: {
      apikey: SUPABASE_ANON_KEY,
    },
  },
});
