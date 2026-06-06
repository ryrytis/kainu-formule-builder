import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

// Helper to safely get env vars in both Vite (browser) and Node (scripts/serverless)
const getEnv = (key: string) => {
    // 1. Try process.env (Standard Node/Vercel)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key];
    }
    // 2. Try import.meta.env (Vite/Browser)
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
        return (import.meta as any).env[key];
    }
    // 3. Try standard Key fallbacks (e.g. without VITE_ prefix on server)
    const fallbackKey = key.startsWith('VITE_') ? key.replace('VITE_', '') : `VITE_${key}`;
    if (typeof process !== 'undefined' && process.env && process.env[fallbackKey]) {
        return process.env[fallbackKey];
    }
    return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase credentials. Checked VITE_SUPABASE_URL/ANON_KEY and fallbacks.');
}

export const supabase = (supabaseUrl && supabaseAnonKey) 
    ? createClient<Database>(supabaseUrl.trim(), supabaseAnonKey.trim())
    : (null as unknown as ReturnType<typeof createClient<Database>>);
