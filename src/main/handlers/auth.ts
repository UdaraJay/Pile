import { ipcMain } from 'electron';
import { startGoogleOAuth, cleanupOAuth, OAuthResult } from './oauth';
import { getCurrentSession, signOut, AuthSession, supabase } from '../lib/supabase';

// IPC handler for starting Google OAuth
ipcMain.handle('auth:google-signin', async (): Promise<OAuthResult> => {
  console.log('[Main] IPC: Starting Google OAuth...');
  try {
    const result = await startGoogleOAuth();
    console.log('[Main] IPC: Google OAuth result:', result.success ? 'SUCCESS' : 'FAILED');
    return result;
  } catch (error) {
    console.error('[Main] IPC: Google OAuth error:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
});

// IPC handler for getting current session
ipcMain.handle('auth:get-session', async (): Promise<AuthSession> => {
  try {
    const session = await getCurrentSession();
    // Only log when session state changes, not on every check
    return session;
  } catch (error) {
    console.error('[Main] IPC: Get session error:', error);
    return null;
  }
});

// IPC handler for signing out
ipcMain.handle('auth:signout', async (): Promise<{ error: any }> => {
  console.log('[Main] IPC: Signing out...');
  try {
    const result = await signOut();
    console.log('[Main] IPC: Sign out result:', result.error ? 'ERROR' : 'SUCCESS');
    return result;
  } catch (error) {
    console.error('[Main] IPC: Sign out error:', error);
    return { error: (error as Error).message };
  }
});

// IPC handler for getting user profile
ipcMain.handle('auth:get-profile', async (_, userId: string): Promise<any> => {
  console.log('[Main] IPC: Getting user profile...');
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Profile doesn't exist, create it
      console.log('[Main] Creating new user profile for:', userId);
      
      // Get current user from session to get metadata
      const session = await getCurrentSession();
      const user = session?.user;
      
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          display_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
          preferences: {},
          ai_settings: {},
        })
        .select()
        .single();

      if (createError) {
        console.error('[Main] Error creating profile:', createError);
        return { data: null, error: createError };
      }
      
      return { data: newProfile, error: null };
    } else if (error) {
      console.error('[Main] Error loading profile:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('[Main] Profile loading error:', error);
    return { data: null, error };
  }
});

// IPC handler for getting user's piles
ipcMain.handle('auth:get-piles', async (): Promise<any> => {
  console.log('[Main] IPC: Getting user piles...');
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return { data: [], error: { message: 'No authenticated user' } };
    }

    const { data, error } = await supabase
      .from('piles')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Main] Error loading piles:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('[Main] Piles loading error:', error);
    return { data: [], error };
  }
});

// IPC handler for creating a new pile
ipcMain.handle('auth:create-pile', async (_, name: string, description: string = '', isPrivate: boolean = true): Promise<any> => {
  console.log('[Main] IPC: Creating new pile:', name);
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return { data: null, error: { message: 'No authenticated user' } };
    }

    const { data, error } = await supabase
      .from('piles')
      .insert({
        user_id: session.user.id,
        name: name.trim(),
        description: description.trim(),
        is_private: isPrivate,
        settings: {
          theme: 'light',
          sync_enabled: true,
        },
      })
      .select()
      .single();

    if (error) {
      console.error('[Main] Error creating pile:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('[Main] Pile creation error:', error);
    return { data: null, error };
  }
});

// Clean up OAuth server when app is quitting
process.on('before-quit', () => {
  cleanupOAuth();
});

// Also clean up on window closed
process.on('window-all-closed', () => {
  cleanupOAuth();
});