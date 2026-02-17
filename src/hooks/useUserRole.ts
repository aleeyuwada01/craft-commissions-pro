import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useUserRole() {
    const { user, loading: authLoading } = useAuth();
    const [role, setRole] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Wait for auth to initialize
        if (authLoading) return;

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


                if (data) {
                    setRole(data.role);
                    const isUserAdmin = data.role.toLowerCase() === 'admin';
                    setIsAdmin(isUserAdmin);
                }
            } catch (error) {
                console.error('Error fetching user role:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRole();
    }, [user, authLoading]);

    return { role, isAdmin, loading: loading || authLoading };
}
