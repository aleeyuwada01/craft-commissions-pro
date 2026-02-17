import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useUserRole() {
    const { user, loading: authLoading } = useAuth();
    const [role, setRole] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Wait for useAuth to finish its initial check
        if (authLoading) {
            setLoading(true);
            return;
        }

        if (!user) {
            console.log('useUserRole: No user found, stopping loading');
            setRole(null);
            setIsAdmin(false);
            setLoading(false);
            return;
        }

        const fetchRole = async () => {
            setLoading(true); // Ensure it's true while fetching
            try {
                console.log('useUserRole: Fetching role for user:', user.id);
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
