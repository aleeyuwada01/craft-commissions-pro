import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBusinessUnits } from '@/hooks/useBusinessUnits';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Download, FileText, Filter } from 'lucide-react';

interface Transaction {
  id: string;
  total_amount: number;
  commission_amount: number;
  house_amount: number;
  is_commission_paid: boolean;
  created_at: string;
  employees: { id: string; name: string } | null;
  services: { name: string } | null;
  business_units: { id: string; name: string } | null;
}

export default function Reports() {
  const { user } = useAuth();
  const { businessUnits } = useBusinessUnits();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedBusiness, setSelectedBusiness] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paidFilter, setPaidFilter] = useState<string>('all');

  useEffect(() => {
    fetchTransactions();
  }, [user, selectedBusiness, startDate, endDate, paidFilter]);

  const fetchTransactions = async () => {
    if (!user) return;

    let query = supabase
      .from('transactions')
      .select(`
        *,
        employees(id, name),
        services(name),
        business_units(id, name)
      `)
      .order('created_at', { ascending: false });

    if (selectedBusiness !== 'all') {
      query = query.eq('business_id', selectedBusiness);
    }

    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00`);
    }

    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59`);
    }

    if (paidFilter === 'paid') {
      query = query.eq('is_commission_paid', true);
    } else if (paidFilter === 'unpaid') {
      query = query.eq('is_commission_paid', false);
    }

    const { data } = await query;
    setTransactions(data || []);
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const totals = {
    revenue: transactions.reduce((sum, t) => sum + Number(t.total_amount), 0),
    commissions: transactions.reduce((sum, t) => sum + Number(t.commission_amount), 0),
    house: transactions.reduce((sum, t) => sum + Number(t.house_amount), 0),
    unpaid: transactions
      .filter((t) => !t.is_commission_paid)
      .reduce((sum, t) => sum + Number(t.commission_amount), 0),
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Business', 'Employee', 'Service', 'Total', 'Commission', 'House', 'Status'];
    const rows = transactions.map((t) => [
      new Date(t.created_at).toLocaleDateString(),
      t.business_units?.name || '',
      t.employees?.name || '',
      t.services?.name || '',
      Number(t.total_amount).toFixed(2),
      Number(t.commission_amount).toFixed(2),
      Number(t.house_amount).toFixed(2),
      t.is_commission_paid ? 'Paid' : 'Due',
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commission-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">
            Commission reports and export tools
          </p>
        </div>
        <Button onClick={exportToCSV} disabled={transactions.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Business</Label>
              <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
                <SelectTrigger>
                  <SelectValue placeholder="All businesses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Businesses</SelectItem>
                  {businessUnits.map((bu) => (
                    <SelectItem key={bu.id} value={bu.id}>
                      {bu.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select value={paidFilter} onValueChange={setPaidFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="stat-card">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold">{formatCurrency(totals.revenue)}</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">House Earnings</p>
            <p className="text-2xl font-bold">{formatCurrency(totals.house)}</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Commissions</p>
            <p className="text-2xl font-bold">{formatCurrency(totals.commissions)}</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Unpaid Commissions</p>
            <p className="text-2xl font-bold text-warning">{formatCurrency(totals.unpaid)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Transaction History
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({transactions.length} records)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No transactions found for the selected filters
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">House</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell>
                        {new Date(txn.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{txn.business_units?.name}</TableCell>
                      <TableCell>{txn.employees?.name || '-'}</TableCell>
                      <TableCell>{txn.services?.name || '-'}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(txn.total_amount))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(txn.commission_amount))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(txn.house_amount))}
                      </TableCell>
                      <TableCell className="text-center">
                        {txn.is_commission_paid ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-success/10 text-success">
                            Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-warning/10 text-warning">
                            Due
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
