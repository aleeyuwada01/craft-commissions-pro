import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

interface BusinessContextType {
  businessUnits: BusinessUnit[];
  loading: boolean;
  refresh: () => Promise<void>;
  createBusinessUnit: (name: string, type: string, color: string) => Promise<{ data: any; error: any }>;
  updateBusinessUnit: (id: string, updates: any) => Promise<{ data: any; error: any }>;
  deleteBusinessUnit: (id: string) => Promise<{ error: any }>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchBusinessUnits = useCallback(async () => {
    if (!user) {
      setBusinessUnits([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('business_units')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      // Error handled by empty state
    } else {
      setBusinessUnits(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchBusinessUnits();
  }, [fetchBusinessUnits]);

  const createBusinessUnit = async (name: string, type: string, color: string) => {
    if (!user) return { data: null, error: new Error('Not authenticated') };

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
      setBusinessUnits(prev => [...prev, data]);
    }

    return { data, error };
  };

  const updateBusinessUnit = async (id: string, updates: any) => {
    const { data, error } = await supabase
      .from('business_units')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      setBusinessUnits(prev =>
        prev.map((unit) => (unit.id === id ? data : unit))
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
      setBusinessUnits(prev => prev.filter((unit) => unit.id !== id));
    }

    return { error };
  };

  return (
    <BusinessContext.Provider
      value={{
        businessUnits,
        loading,
        refresh: fetchBusinessUnits,
        createBusinessUnit,
        updateBusinessUnit,
        deleteBusinessUnit,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusinessContext() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusinessContext must be used within a BusinessProvider');
  }
  return context;
}
