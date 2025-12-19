import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const PRIVATE_ACCESS_KEY = 'private_access_enabled';

export interface UsePrivateAccessReturn {
  isPrivateAccessEnabled: boolean;
  isLoading: boolean;
  error: Error | null;
  setPrivateAccess: (enabled: boolean) => Promise<void>;
}

export function usePrivateAccess(): UsePrivateAccessReturn {
  const [isPrivateAccessEnabled, setIsPrivateAccessEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch the private access setting from the database
  const fetchPrivateAccess = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', PRIVATE_ACCESS_KEY)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching private access setting:', fetchError);
        setError(new Error(fetchError.message));
        // Default to false (allow registration) when database unavailable
        setIsPrivateAccessEnabled(false);
        return;
      }

      // Default to false when setting not found
      if (!data) {
        setIsPrivateAccessEnabled(false);
        return;
      }

      // The value is stored as JSONB, so it should be a boolean directly
      const enabled = typeof data.value === 'boolean' ? data.value : false;
      setIsPrivateAccessEnabled(enabled);
    } catch (err) {
      console.error('Error fetching private access setting:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      // Default to false (allow registration) when error occurs
      setIsPrivateAccessEnabled(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update the private access setting in the database
  const setPrivateAccess = useCallback(async (enabled: boolean) => {
    try {
      setError(null);

      const { error: upsertError } = await supabase
        .from('app_settings')
        .upsert(
          {
            key: PRIVATE_ACCESS_KEY,
            value: enabled,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        );

      if (upsertError) {
        console.error('Error updating private access setting:', upsertError);
        setError(new Error(upsertError.message));
        throw new Error(upsertError.message);
      }

      setIsPrivateAccessEnabled(enabled);
    } catch (err) {
      console.error('Error updating private access setting:', err);
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    }
  }, []);

  useEffect(() => {
    fetchPrivateAccess();
  }, [fetchPrivateAccess]);

  return {
    isPrivateAccessEnabled,
    isLoading,
    error,
    setPrivateAccess,
  };
}
