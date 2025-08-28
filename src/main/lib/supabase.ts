import { createClient } from '@supabase/supabase-js';
import settings from 'electron-settings';

// Custom storage implementation for Supabase using electron-settings
// Note: electron-settings stores data under Electron's userData directory.
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    const value = (await settings.get(key)) as string | undefined;
    console.log(`[Main] Supabase storage getItem: ${key} =`, value ? 'FOUND' : 'NULL');
    return value ?? null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    console.log(`[Main] Supabase storage setItem: ${key} =`, value ? 'STORING' : 'NULL');
    await settings.set(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    console.log(`[Main] Supabase storage removeItem: ${key}`);
    await settings.unset(key);
  },
};

// Supabase configuration
const supabaseUrl = 'https://cikhrockryhbgeefhhec.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpa2hyb2NrcnloYmdlZWZoaGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyODMwNDYsImV4cCI6MjA3MTg1OTA0Nn0.U2htepxAIT44IxyCJfpV_HYvk0ukZbr1EghuS7pCKRk';

// Create Supabase client for main process
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use PKCE flow for security
    flowType: 'pkce',
    // Persist session across app restarts
    persistSession: true,
    // Detect session from URL (for OAuth callbacks)
    detectSessionInUrl: false, // We'll handle this manually in loopback server
    // Use electron-store for secure storage
    storage,
    // Enable auto-refresh of tokens
    autoRefreshToken: true,
  },
});

// Export types for IPC
export type AuthSession = {
  user: any;
  session: any;
} | null;

// Helper function to get current session
export const getCurrentSession = async (): Promise<AuthSession> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[Main] Session error:', error);
      return null;
    }
    return data.session ? { user: data.session.user, session: data.session } : null;
  } catch (error) {
    console.error('[Main] Failed to get session:', error);
    return null;
  }
};

// Helper function to sign out
export const signOut = async (): Promise<{ error: any }> => {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error) {
    console.error('[Main] Sign out error:', error);
    return { error };
  }
};
