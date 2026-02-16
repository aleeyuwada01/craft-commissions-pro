import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useUserRole() {
    const { user } = useAuth();
    const [role, setRole] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setRole(null);
            setIsAdmin(false);
            setLoading(false);
            return;
        }

        const fetchRole = async () => {
            try {
                const { data } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', user.id)
                    .maybeSingle();

                console.log('useUserRole: Fetched role:', data);

                if (data) {
                    setRole(data.role);
                    // Check strictly for 'admin'
                    setIsAdmin(data.role.toLowerCase() === 'admin');
                }
            } catch (error) {
                console.error('Error fetching user role:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRole();
    }, [user]);

    return { role, isAdmin, loading };
}
