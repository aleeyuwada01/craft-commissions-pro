import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Plus,
    FileText,
    CheckCircle,
    Clock,
    AlertCircle,
    Eye,
    Pencil,
} from 'lucide-react';
import { format } from 'date-fns';

interface Contract {
    id: string;
    employee_id: string;
    title: string;
    contract_type: string;
    start_date: string;
    end_date: string | null;
    status: 'draft' | 'pending' | 'signed' | 'expired' | 'terminated';
    employee_signed_at: string | null;
    employer_signed_at: string | null;
    created_at: string;
    employees: {
        name: string;
        user_id: string | null;
    } | null;
}

export default function EmployeeContracts() {
    const { id: businessId } = useParams<{ id: string }>();
    const { user } = useAuth();
    const { isAdmin, loading: roleLoading } = useUserRole();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOwner, setIsOwner] = useState(false);

    useEffect(() => {
        checkOwnership();
        fetchContracts();
    }, [businessId]);

    const checkOwnership = async () => {
        if (!businessId || !user) return;
        const { data } = await supabase
            .from('business_units')
            .select('id')
            .eq('id', businessId)
            .eq('user_id', user.id)
            .maybeSingle();
        setIsOwner(!!data);
    };

    const fetchContracts = async () => {
        if (!businessId) return;

        const { data, error } = await supabase
            .from('employee_contracts')
            .select(`
                id,
                employee_id,
                title,
                contract_type,
                start_date,
                end_date,
                status,
                employee_signed_at,
                employer_signed_at,
                created_at,
                employees(name, user_id)
            `)
            .eq('business_id', businessId)
            .order('created_at', { ascending: false });

        if (error) {
            toast.error('Failed to load contracts');
            console.error(error);
        } else {
            // If user is an employee (not owner AND not admin), filter to only their contracts
            if (user && !isOwner && !isAdmin) {
                const filtered = (data || []).filter(
                    (c) => c.employees?.user_id === user.id
                );
                setContracts(filtered as unknown as Contract[]);
            } else {
                setContracts((data || []) as unknown as Contract[]);
            }
        }
        setLoading(false);
    };

    // Re-fetch when ownership or admin role is determined
    useEffect(() => {
        // If role is still loading, don't run logic yet
        if (roleLoading) return;
        fetchContracts();
    }, [isOwner, isAdmin, roleLoading]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'signed':
                return <CheckCircle className="w-4 h-4 text-green-600" />;
            case 'pending':
                return <Clock className="w-4 h-4 text-yellow-600" />;
            case 'expired':
            case 'terminated':
                return <AlertCircle className="w-4 h-4 text-red-600" />;
            default:
                return <FileText className="w-4 h-4 text-gray-600" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'signed':
                return 'bg-green-500/10 text-green-600 border-green-500/20';
            case 'pending':
                return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
            case 'expired':
            case 'terminated':
                return 'bg-red-500/10 text-red-600 border-red-500/20';
            default:
                return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to={isOwner ? `/business/${businessId}` : '/employee'}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">
                            {isOwner ? 'Employee Contracts' : 'My Contracts'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {contracts.length} {isOwner ? 'total contracts' : 'contract(s)'}
                        </p>
                    </div>
                </div>

                {/* Only owners and admins can create new contracts */}
                {(isOwner || isAdmin) && (
                    <Link to={`/business/${businessId}/contracts/new`}>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            New Contract
                        </Button>
                    </Link>
                )}
            </div>

            {/* Contracts Grid */}
            {contracts.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center">
                        <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">
                            {isOwner ? 'No contracts found' : 'No contracts assigned to you yet'}
                        </p>
                        {isOwner && (
                            <Link to={`/business/${businessId}/contracts/new`}>
                                <Button className="mt-4">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create First Contract
                                </Button>
                            </Link>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {contracts.map((contract) => (
                        <Card key={contract.id} className="hover:border-primary transition-colors">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            {getStatusIcon(contract.status)}
                                            {contract.title}
                                        </CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {contract.employees?.name}
                                        </p>
                                    </div>
                                    <Badge className={getStatusColor(contract.status)}>
                                        {contract.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Type</p>
                                        <p className="font-medium capitalize">{contract.contract_type}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Start Date</p>
                                        <p className="font-medium">
                                            {format(new Date(contract.start_date), 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                </div>

                                {contract.end_date && (
                                    <div className="text-sm">
                                        <p className="text-muted-foreground">End Date</p>
                                        <p className="font-medium">
                                            {format(new Date(contract.end_date), 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {contract.employee_signed_at && (
                                        <div className="flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3 text-green-600" />
                                            Employee signed
                                        </div>
                                    )}
                                    {contract.employer_signed_at && (
                                        <div className="flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3 text-green-600" />
                                            Employer signed
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Link
                                        to={`/business/${businessId}/contracts/${contract.id}`}
                                        className="flex-1"
                                    >
                                        <Button variant="outline" size="sm" className="w-full">
                                            <Eye className="w-4 h-4 mr-2" />
                                            View
                                        </Button>
                                    </Link>
                                    {isOwner && contract.status === 'draft' && (
                                        <Link
                                            to={`/business/${businessId}/contracts/${contract.id}/edit`}
                                            className="flex-1"
                                        >
                                            <Button variant="outline" size="sm" className="w-full">
                                                <Pencil className="w-4 h-4 mr-2" />
                                                Edit
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
