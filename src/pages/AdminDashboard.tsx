import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
    Shield,
    TrendingUp,
    Users,
    ShoppingCart,
    UserCircle,
    Search,
    Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/currency';

interface AdminStats {
    totalSales: number;
    totalRevenue: number;
    totalCustomers: number;
    totalBusinesses: number;
}

interface Sale {
    id: string;
    sale_number: string;
    total_amount: number;
    payment_method: string;
    status: string;
    created_at: string;
    business_units: { name: string } | null;
    customers: { name: string } | null;
    employees: { name: string } | null;
}

export default function AdminDashboard() {
    const { user, signOut } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<AdminStats>({
        totalSales: 0,
        totalRevenue: 0,
        totalCustomers: 0,
        totalBusinesses: 0,
    });
    const [sales, setSales] = useState<Sale[]>([]);
    const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        fetchAdminData();
    }, []);

    useEffect(() => {
        filterSales();
    }, [sales, searchTerm, statusFilter]);

    const fetchAdminData = async () => {
        try {
            // Fetch all sales
            const { data: salesData, error: salesError } = await supabase
                .from('sales')
                .select(`
          *,
          business_units(name),
          customers(name),
          employees(name)
        `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (salesError) throw salesError;
            setSales(salesData || []);

            // Fetch stats
            const { data: customersData } = await supabase
                .from('customers')
                .select('id');

            const { data: businessesData } = await supabase
                .from('business_units')
                .select('id');

            const totalRevenue = (salesData || []).reduce(
                (sum, sale) => sum + Number(sale.total_amount),
                0
            );

            setStats({
                totalSales: salesData?.length || 0,
                totalRevenue,
                totalCustomers: customersData?.length || 0,
                totalBusinesses: businessesData?.length || 0,
            });
        } catch (error: any) {
            toast.error('Failed to load admin data: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const filterSales = () => {
        let filtered = [...sales];

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(
                (sale) =>
                    sale.sale_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    sale.business_units?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    sale.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filter by status
        if (statusFilter !== 'all') {
            filtered = filtered.filter((sale) => sale.status === statusFilter);
        }

        setFilteredSales(filtered);
    };

    const exportToCSV = () => {
        const headers = ['Sale Number', 'Business', 'Customer', 'Employee', 'Amount', 'Payment Method', 'Status', 'Date'];
        const rows = filteredSales.map((sale) => [
            sale.sale_number,
            sale.business_units?.name || '-',
            sale.customers?.name || '-',
            sale.employees?.name || '-',
            sale.total_amount,
            sale.payment_method,
            sale.status,
            format(new Date(sale.created_at), 'yyyy-MM-dd HH:mm'),
        ]);

        const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-muted-foreground">Loading admin dashboard...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-card border-b border-border sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-foreground">Admin Dashboard</h1>
                            <p className="text-xs text-muted-foreground">Full system access</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={signOut}>
                        Sign Out
                    </Button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                Total Revenue
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4" />
                                Total Sales
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalSales}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <UserCircle className="w-4 h-4" />
                                Total Customers
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Total Businesses
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalBusinesses}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters and Export */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>All Sales Across All Businesses</CardTitle>
                            <Button onClick={exportToCSV} variant="outline" size="sm">
                                <Download className="w-4 h-4 mr-2" />
                                Export CSV
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <Input
                                    placeholder="Search by sale number, business, or customer..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    icon={<Search className="w-4 h-4" />}
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="refunded">Refunded</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Sales Table */}
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Sale Number</TableHead>
                                        <TableHead>Business</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Employee</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead>Payment</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSales.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                                No sales found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredSales.map((sale) => (
                                            <TableRow key={sale.id}>
                                                <TableCell className="font-mono text-sm">{sale.sale_number}</TableCell>
                                                <TableCell>{sale.business_units?.name || '-'}</TableCell>
                                                <TableCell>{sale.customers?.name || '-'}</TableCell>
                                                <TableCell>{sale.employees?.name || '-'}</TableCell>
                                                <TableCell className="text-right font-semibold">
                                                    {formatCurrency(Number(sale.total_amount))}
                                                </TableCell>
                                                <TableCell className="capitalize">{sale.payment_method}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            sale.status === 'completed'
                                                                ? 'default'
                                                                : sale.status === 'pending'
                                                                    ? 'secondary'
                                                                    : 'destructive'
                                                        }
                                                    >
                                                        {sale.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {format(new Date(sale.created_at), 'MMM d, yyyy HH:mm')}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="text-sm text-muted-foreground">
                            Showing {filteredSales.length} of {sales.length} sales
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
