import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Search,
    Calendar,
    Clock,
    DollarSign,
    Receipt,
    User,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

interface Sale {
    id: string;
    sale_number: string;
    total_amount: number;
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    payment_method: string;
    payment_status: string;
    created_at: string;
    customers: { name: string } | null;
    employees: { name: string } | null;
}

type StatusFilter = 'all' | 'completed' | 'pending' | 'partial' | 'refunded';

export default function SalesHistory() {
    const { id: businessId } = useParams<{ id: string }>();
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

    const fetchSales = async () => {
        if (!businessId) return;

        let query = supabase
            .from('sales')
            .select(`
        *,
        customers(name),
        employees(name)
      `)
            .eq('business_id', businessId)
            .order('created_at', { ascending: false });

        if (statusFilter !== 'all') {
            query = query.eq('payment_status', statusFilter);
        }

        const { data, error } = await query;

        if (error) {
            toast.error('Failed to load sales');
            console.error(error);
        } else {
            setSales(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSales();

        // Setup realtime subscription
        const channel = supabase
            .channel(`sales-${businessId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'sales',
                    filter: `business_id=eq.${businessId}`,
                },
                () => {
                    fetchSales();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [businessId, statusFilter]);

    const filteredSales = sales.filter(sale =>
        sale.sale_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sale.customers?.name && sale.customers.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-500/10 text-green-600 border-green-500/20';
            case 'pending':
                return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
            case 'partial':
                return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
            case 'refunded':
                return 'bg-red-500/10 text-red-600 border-red-500/20';
            default:
                return 'bg-secondary text-secondary-foreground';
        }
    };

    const getPaymentMethodIcon = (method: string) => {
        return <DollarSign className="w-4 h-4" />;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const totalTax = filteredSales.reduce((sum, sale) => sum + sale.tax_amount, 0);
    const totalDiscounts = filteredSales.reduce((sum, sale) => sum + sale.discount_amount, 0);

    return (
        <div className="max-w-7xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to={`/business/${businessId}`}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Sales History</h1>
                        <p className="text-sm text-muted-foreground">
                            {filteredSales.length} sales
                        </p>
                    </div>
                </div>
                <Link to={`/business/${businessId}/pos`}>
                    <Button>
                        New Sale
                    </Button>
                </Link>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Sales</p>
                                <p className="text-2xl font-bold">{filteredSales.length}</p>
                            </div>
                            <Receipt className="w-8 h-8 text-primary" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Revenue</p>
                                <p className="text-xl font-bold text-green-600">{formatCurrency(totalSales)}</p>
                            </div>
                            <DollarSign className="w-8 h-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Tax Collected</p>
                            <p className="text-lg font-semibold">{formatCurrency(totalTax)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Discounts</p>
                            <p className="text-lg font-semibold text-orange-600">{formatCurrency(totalDiscounts)}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                        placeholder="Search by sale number or customer name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="partial">Partial Payment</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Sales List */}
            {filteredSales.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center">
                        <Receipt className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">No sales found</p>
                        <Link to={`/business/${businessId}/pos`}>
                            <Button className="mt-4">Make Your First Sale</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {filteredSales.map((sale) => (
                        <Card key={sale.id} className="hover:border-primary transition-colors">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Badge variant="outline" className="font-mono text-xs">
                                                {sale.sale_number}
                                            </Badge>
                                            <Badge className={getStatusColor(sale.payment_status)}>
                                                {sale.payment_status}
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                {formatDate(sale.created_at)}
                                            </div>
                                            {sale.customers && (
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4" />
                                                    {sale.customers.name}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                {getPaymentMethodIcon(sale.payment_method)}
                                                {sale.payment_method.toUpperCase()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right ml-4">
                                        <p className="text-2xl font-bold text-primary">
                                            {formatCurrency(sale.total_amount)}
                                        </p>
                                        {sale.discount_amount > 0 && (
                                            <p className="text-xs text-orange-600">
                                                -{formatCurrency(sale.discount_amount)} discount
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
