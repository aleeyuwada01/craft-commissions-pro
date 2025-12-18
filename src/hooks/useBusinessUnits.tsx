import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface BusinessUnit {
  id: string;
  user_id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export function useBusinessUnits() {
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchBusinessUnits = async () => {
    if (!user) {
      setBusinessUnits([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('business_units')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching business units:', error);
    } else {
      setBusinessUnits(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBusinessUnits();
  }, [user]);

  const createBusinessUnit = async (
    name: string,
    type: string,
    color: string
  ) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('business_units')
      .insert({
        user_id: user.id,
        name,
        type,
        icon: type,
        color,
      })
      .select()
      .single();

    if (!error && data) {
      setBusinessUnits([...businessUnits, data]);
    }

    return { data, error };
  };

  const updateBusinessUnit = async (
    id: string,
    updates: Partial<Pick<BusinessUnit, 'name' | 'color'>>
  ) => {
    const { data, error } = await supabase
      .from('business_units')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      setBusinessUnits(
        businessUnits.map((unit) => (unit.id === id ? data : unit))
      );
    }

    return { data, error };
  };

  const deleteBusinessUnit = async (id: string) => {
    const { error } = await supabase
      .from('business_units')
      .delete()
      .eq('id', id);

    if (!error) {
      setBusinessUnits(businessUnits.filter((unit) => unit.id !== id));
    }

    return { error };
  };

  return {
    businessUnits,
    loading,
    createBusinessUnit,
    updateBusinessUnit,
    deleteBusinessUnit,
    refetch: fetchBusinessUnits,
  };
}
