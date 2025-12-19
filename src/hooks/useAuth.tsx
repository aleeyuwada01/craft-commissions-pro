import { useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const PRIVATE_ACCESS_KEY = 'private_access_enabled';

/**
 * Check if private access mode is enabled by querying the database directly.
 * Returns true if private access is enabled, false otherwise.
 * Defaults to false (allow registration) on any error.
 */
export async function checkPrivateAccessEnabled(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', PRIVATE_ACCESS_KEY)
      .maybeSingle();

    if (error) {
      console.error('Error checking private access status:', error);
      return false; // Default to allow registration on error
    }

    if (!data) {
      return false; // Default to allow registration when setting not found
    }

    return typeof data.value === 'boolean' ? data.value : false;
  } catch (err) {
    console.error('Error checking private access status:', err);
    return false; // Default to allow registration on error
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('useAuth: Setting up auth listener...');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('useAuth: Auth state changed:', event, !!session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    console.log('useAuth: Checking existing session...');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('useAuth: getSession result:', !!session, error);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((err) => {
      console.error('useAuth: getSession error:', err);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    // Check private access status before calling Supabase signUp
    const isPrivateAccessEnabled = await checkPrivateAccessEnabled();
    
    if (isPrivateAccessEnabled) {
      // Return error when private access is enabled
      const error = new Error('Registration is currently disabled') as AuthError;
      error.name = 'AuthApiError';
      (error as AuthError).status = 403;
      return { error };
    }

    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };
}
