import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://cikhrockryhbgeefhhec.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpa2hyb2NrcnloYmdlZWZoaGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyODMwNDYsImV4cCI6MjA3MTg1OTA0Nn0.U2htepxAIT44IxyCJfpV_HYvk0ukZbr1EghuS7pCKRk';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable auto-refresh of tokens
    autoRefreshToken: true,
    // Persist session across page reloads
    persistSession: true,
    // Detect session from URL (for OAuth callbacks)
    detectSessionInUrl: true,
    // Use PKCE flow by default for security
    flowType: 'pkce',
    // Use default localStorage-based storage for PKCE support
    // (Supabase needs to store code verifier between OAuth start and callback)
    persistSession: true,
    storage: {
      getItem: (key) => {
        try {
          const value = localStorage.getItem(key);
          console.log(`Supabase storage getItem: ${key} =`, value ? 'FOUND' : 'NULL');
          return value;
        } catch (error) {
          console.error(`Storage getItem error for ${key}:`, error);
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          console.log(`Supabase storage setItem: ${key} =`, value ? 'STORING' : 'NULL');
          localStorage.setItem(key, value);
          // Also backup to electron-store if available
          if (typeof window !== 'undefined' && window.electron?.store) {
            window.electron.store.set(`supabase_${key}`, value).catch(console.error);
          }
        } catch (error) {
          console.error(`Storage setItem error for ${key}:`, error);
        }
      },
      removeItem: (key) => {
        try {
          console.log(`Supabase storage removeItem: ${key}`);
          localStorage.removeItem(key);
          // Also remove from electron-store backup
          if (typeof window !== 'undefined' && window.electron?.store) {
            window.electron.store.delete(`supabase_${key}`).catch(console.error);
          }
        } catch (error) {
          console.error(`Storage removeItem error for ${key}:`, error);
        }
      },
    },
  },
});

// Helper function to get current user
export const getCurrentUser = () => {
  return supabase.auth.getUser();
};

// Helper function to get current session
export const getCurrentSession = () => {
  return supabase.auth.getSession();
};

// Helper function for sign up
export const signUp = async (email, password, userData = {}) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData,
    },
  });
  return { data, error };
};

// Helper function for sign in
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

// Helper function for OAuth sign in
export const signInWithOAuth = async (provider) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      // Redirect URL for Electron app with hash routing
      redirectTo: 'http://localhost:1212/#/auth/callback',
    },
  });
  return { data, error };
};

// Helper function for sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// Helper function to listen for auth state changes
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback);
};

// Full-text search on posts (requires search_vector tsvector column + GIN index and trigger)
export const searchPostsFullText = async (query, { limit = 50, config = 'english' } = {}) => {
  if (!query || !query.trim()) return { data: [], error: null };
  // Use websearch for natural language queries: supports phrases and operators
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .textSearch('search_vector', query, { type: 'websearch', config })
    .limit(limit);
  return { data, error };
};

// Helper function to update user profile
export const updateProfile = async (profileData) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      id: supabase.auth.getUser()?.data?.user?.id,
      ...profileData,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  return { data, error };
};

// Helper function to get user profile
export const getProfile = async (userId = null) => {
  const targetUserId = userId || supabase.auth.getUser()?.data?.user?.id;

  if (!targetUserId) {
    return { data: null, error: { message: 'No user ID provided' } };
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', targetUserId)
    .single();

  return { data, error };
};

// Real-time subscriptions management
let activeChannels = new Map();

// Helper function to create a real-time channel for posts
export const subscribeToPostChanges = (pileId, callbacks) => {
  const channelName = `posts_${pileId}`;
  
  // Unsubscribe from existing channel if any
  if (activeChannels.has(channelName)) {
    activeChannels.get(channelName).unsubscribe();
  }

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'posts',
        filter: `pile_id=eq.${pileId}`,
      },
      (payload) => {
        console.log('Post change received:', payload);
        callbacks.onPostChange?.(payload);
      }
    )
    .subscribe();

  activeChannels.set(channelName, channel);
  return channel;
};

// Helper function to create a presence channel for collaborative editing
export const subscribeToPresence = (pileId, userId, callbacks) => {
  const channelName = `presence_${pileId}`;
  
  // Unsubscribe from existing presence channel if any
  if (activeChannels.has(channelName)) {
    activeChannels.get(channelName).unsubscribe();
  }

  const channel = supabase
    .channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    })
    .on('presence', { event: 'sync' }, () => {
      const newState = channel.presenceState();
      callbacks.onPresenceSync?.(newState);
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      callbacks.onPresenceJoin?.(key, newPresences);
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      callbacks.onPresenceLeave?.(key, leftPresences);
    })
    .subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') { 
        return;
      }

      // Track presence with user info
      const trackingData = {
        user_id: userId,
        online_at: new Date().toISOString(),
        pile_id: pileId,
      };

      await channel.track(trackingData);
    });

  activeChannels.set(channelName, channel);
  return channel;
};

// Helper function to broadcast cursor position updates
export const broadcastCursorPosition = (pileId, cursorData) => {
  const channelName = `presence_${pileId}`;
  const channel = activeChannels.get(channelName);
  
  if (channel) {
    channel.send({
      type: 'broadcast',
      event: 'cursor_move',
      payload: cursorData,
    });
  }
};

// Helper function to listen for cursor broadcasts
export const subscribeToCursorUpdates = (pileId, callback) => {
  const channelName = `presence_${pileId}`;
  const channel = activeChannels.get(channelName);
  
  if (channel) {
    channel.on('broadcast', { event: 'cursor_move' }, callback);
  }
};

// Helper function to unsubscribe from a specific channel
export const unsubscribeFromChannel = (channelId) => {
  if (activeChannels.has(channelId)) {
    const channel = activeChannels.get(channelId);
    channel.unsubscribe();
    activeChannels.delete(channelId);
  }
};

// Helper function to unsubscribe from all channels
export const unsubscribeFromAllChannels = () => {
  activeChannels.forEach((channel) => {
    channel.unsubscribe();
  });
  activeChannels.clear();
};

export default supabase;
