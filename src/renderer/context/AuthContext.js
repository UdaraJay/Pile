import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  supabase,
  onAuthStateChange,
  getCurrentUser,
  getCurrentSession,
} from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // Initialize auth state from main process - run only once on mount
    const initializeAuth = async () => {
      try {
        // Get current session from main process
        const sessionData = await window.electron?.auth?.getSession();
        
        console.log('Auth initialization - session from main:', sessionData ? 'FOUND' : 'NULL');

        if (sessionData && sessionData.session && sessionData.user) {
          setSession(sessionData.session);
          setUser(sessionData.user);

          // Load user profile
          await loadUserProfile(sessionData.user.id);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Set up periodic session check (since we can't use Supabase auth state change listener from renderer)
    const sessionCheckInterval = setInterval(async () => {
      try {
        const sessionData = await window.electron?.auth?.getSession();
        
        // Only update if session state changed
        const hasSession = !!(sessionData && sessionData.session);
        const currentHasSession = !!session;
        
        if (hasSession !== currentHasSession) {
          console.log('Session state changed:', hasSession ? 'LOGGED_IN' : 'LOGGED_OUT');
          
          if (hasSession) {
            setSession(sessionData.session);
            setUser(sessionData.user);
            await loadUserProfile(sessionData.user.id);
          } else {
            setSession(null);
            setUser(null);
            setProfile(null);
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
      }
    }, 30000); // Check every 30 seconds

    return () => {
      clearInterval(sessionCheckInterval);
    };
  }, []); // Run only once on mount, no dependencies

  const loadUserProfile = async (userId) => {
    try {
      // Use IPC to load profile from main process (where session is authenticated)
      const result = await window.electron?.auth?.getProfile(userId);
      
      if (result?.error) {
        console.error('Error loading profile:', result.error);
      } else if (result?.data) {
        console.log('Profile loaded via IPC:', result.data.display_name);
        setProfile(result.data);
      }
    } catch (error) {
      console.error('Profile loading error:', error);
    }
  };

  const signUp = async (email, password, userData = {}) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    console.log('signInWithGoogle called - using loopback OAuth server');
    try {
      setLoading(true);
      
      // Use the new IPC-based OAuth with loopback server
      // This approach solves the PKCE storage issue by keeping everything in the main process
      const result = await window.electron?.auth?.signInWithGoogle();
      
      if (!result) {
        throw new Error('OAuth not available - IPC call failed');
      }
      
      console.log('OAuth result:', result.success ? 'SUCCESS' : 'FAILED');
      
      if (result.success) {
        console.log('OAuth successful, user:', result.user?.email);
        // The session will be automatically detected by auth state listener
        // No need to manually set session here since it's handled in main process
        return { data: { user: result.user, session: result.session }, error: null };
      } else {
        console.error('OAuth failed:', result.error);
        return { data: null, error: { message: result.error } };
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Use IPC to sign out from main process
      const result = await window.electron?.auth?.signOut();
      
      if (result?.error) {
        throw new Error(result.error);
      }

      // Clear local state
      setUser(null);
      setSession(null);
      setProfile(null);

      console.log('Sign out successful');
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    try {
      if (!user?.id) {
        throw new Error('No authenticated user');
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setProfile(data);
      return { data, error: null };
    } catch (error) {
      console.error('Profile update error:', error);
      return { data: null, error };
    }
  };

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://localhost:1212/auth/reset-password',
      });

      if (error) {
        throw error;
      }

      return { error: null };
    } catch (error) {
      console.error('Password reset error:', error);
      return { error };
    }
  };

  // Debug function for OAuth configuration
  const debugOAuthConfig = () => {
    const isHttpOrigin = typeof window !== 'undefined' && /^https?:$/.test(window.location.protocol);
    const redirectTarget = isHttpOrigin
      ? window.location.origin + '/auth/callback'
      : 'pilebintang://auth-callback';
    
    console.log('🔧 OAuth Configuration Debug:');
    console.log('Current location:', window.location);
    console.log('Is HTTP origin:', isHttpOrigin);
    console.log('Redirect target:', redirectTarget);
    console.log('\n📋 Required Supabase Redirect URLs:');
    console.log('1. pilebintang://auth-callback');
    console.log('2. ' + window.location.origin + '/auth/callback');
    console.log('\n💡 Add both URLs to your Supabase project settings under "Allowed Redirect URLs"');
    
    return {
      currentLocation: window.location,
      isHttpOrigin,
      redirectTarget,
      requiredUrls: ['pilebintang://auth-callback', window.location.origin + '/auth/callback']
    };
  };
  
  // Make debug function available globally
  if (typeof window !== 'undefined') {
    window.debugOAuthConfig = debugOAuthConfig;
  }

  const updatePassword = async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      return { error: null };
    } catch (error) {
      console.error('Password update error:', error);
      return { error };
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile,
    resetPassword,
    updatePassword,
    // Helper computed properties
    isAuthenticated: !!user,
    isLoading: loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
