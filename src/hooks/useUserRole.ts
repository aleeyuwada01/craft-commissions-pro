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
                setLoading(true);
                const { data } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', user.id)
                    .maybeSingle();

                console.log('useUserRole: Fetched data from user_roles:', data);

                if (data) {
                    setRole(data.role);
                    const isUserAdmin = data.role.toLowerCase() === 'admin';
                    console.log('useUserRole: Setting isAdmin to:', isUserAdmin);
                    setIsAdmin(isUserAdmin);
                } else {
                    console.log('useUserRole: No role found for user:', user.id);
                }
            } catch (error) {
                console.error('useUserRole: Error fetching user role:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRole();
    }, [user]);

    return { role, isAdmin, loading };
}
