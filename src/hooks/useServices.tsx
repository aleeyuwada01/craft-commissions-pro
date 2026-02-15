import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Service {
  id: string;
  business_id: string;
  name: string;
  base_price: number;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;

  // POS Fields
  sku?: string | null;
  barcode?: string | null;
  category?: string | null;
  cost_price?: number | null;
  tax_rate?: number | null;
  image_url?: string | null;

  // Booking Fields
  service_type?: string | null; // 'service' | 'product' | 'package'
  duration_minutes?: number | null;
  buffer_time?: number | null;
}

export interface UseServicesResult {
  services: Service[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useServices(businessId: string | undefined): UseServicesResult {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchServices = async () => {
    if (!businessId) {
      setServices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (fetchError) {
      console.error('Error fetching services:', fetchError);
      setError(new Error(fetchError.message));
      setServices([]);
    } else {
      setServices(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, [businessId]);

  return {
    services,
    loading,
    error,
    refetch: fetchServices,
  };
}
