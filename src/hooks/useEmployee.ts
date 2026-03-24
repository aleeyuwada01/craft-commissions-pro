import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useEmployee(businessId?: string) {
  const { user } = useAuth();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [isEmployee, setIsEmployee] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !businessId) {
      setLoading(false);
      return;
    }

    const fetchEmployee = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .eq('business_id', businessId)
        .maybeSingle();

      if (data) {
        setEmployeeId(data.id);
        setIsEmployee(true);
      } else {
        setEmployeeId(null);
        setIsEmployee(false);
      }
      setLoading(false);
    };

    fetchEmployee();
  }, [user, businessId]);

  return { employeeId, isEmployee, loading };
}
