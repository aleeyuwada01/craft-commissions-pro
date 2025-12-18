import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/currency';
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import { 
  Wallet, 
  TrendingUp, 
  Calendar, 
  CheckCircle2, 
  Clock,
  Trophy,
  Target,
  Sparkles,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, eachWeekOfInterval, startOfWeek, endOfWeek } from 'date-fns';

interface EmployeeData {
  id: string;
  name: string;
  commission_percentage: number;
  commission_type: string;
  fixed_commission: number;
  business_units: { name: string } | null;
}

interface Transaction {
  id: string;
  total_amount: number;
  commission_amount: number;
  house_amount: number;
  is_commission_paid: boolean;
  created_at: string;
  services: { name: string } | null;
}

export default function EmployeeDashboard() {
  const { user, signOut } = useAuth();
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Get employee record for this user
      const { data: employeeData } = await supabase
        .from('employees')
        .select(`
          id,
          name,
          commission_percentage,
          commission_type,
          fixed_commission,
          business_units(name)
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (employeeData) {
        setEmployee(employeeData);

        // Fetch transactions for this employee
        const { data: transactionsData } = await supabase
          .from('transactions')
          .select(`
            id,
            total_amount,
            commission_amount,
            house_amount,
            is_commission_paid,
            created_at,
            services(name)
          `)
          .eq('employee_id', employeeData.id)
          .order('created_at', { ascending: false });

        if (transactionsData) setTransactions(transactionsData);
      }

      setLoading(false);
    };

    fetchData();

    // Realtime subscription
    const channel = supabase
      .channel('employee-transactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Stats calculations
  const stats = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    const thisMonthTransactions = transactions.filter(t => {
      const date = new Date(t.created_at);
      return date >= monthStart && date <= monthEnd;
    });

    const totalEarnings = transactions.reduce((sum, t) => sum + Number(t.commission_amount), 0);
    const thisMonthEarnings = thisMonthTransactions.reduce((sum, t) => sum + Number(t.commission_amount), 0);
    const unpaidCommissions = transactions
      .filter(t => !t.is_commission_paid)
      .reduce((sum, t) => sum + Number(t.commission_amount), 0);
    const paidCommissions = transactions
      .filter(t => t.is_commission_paid)
      .reduce((sum, t) => sum + Number(t.commission_amount), 0);

    return {
      totalEarnings,
      thisMonthEarnings,
      unpaidCommissions,
      paidCommissions,
      totalSales: transactions.length,
      thisMonthSales: thisMonthTransactions.length,
    };
  }, [transactions]);

  // Weekly earnings chart data
  const weeklyData = useMemo(() => {
    const weeks = eachWeekOfInterval({
      start: subMonths(new Date(), 2),
      end: new Date(),
    });

    return weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart);
      const weekTransactions = transactions.filter(t => {
        const date = new Date(t.created_at);
        return date >= weekStart && date <= weekEnd;
      });

      return {
        week: format(weekStart, 'MMM d'),
        earnings: weekTransactions.reduce((sum, t) => sum + Number(t.commission_amount), 0),
        sales: weekTransactions.length,
      };
    });
  }, [transactions]);

  // Monthly earnings chart data
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthTransactions = transactions.filter(t => {
        const date = new Date(t.created_at);
        return date >= monthStart && date <= monthEnd;
      });

      return {
        month: format(month, 'MMM'),
        earnings: monthTransactions.reduce((sum, t) => sum + Number(t.commission_amount), 0),
        sales: monthTransactions.length,
      };
    });
  }, [transactions]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto mb-4 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">No Employee Record Found</h1>
          <p className="text-muted-foreground mb-6">
            Your account is not linked to any employee profile. Please contact your administrator.
          </p>
          <Button onClick={signOut} variant="outline">
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">JB-Manager</h1>
              <p className="text-xs text-muted-foreground">{employee.business_units?.name}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome */}
        <div>
          <p className="text-muted-foreground text-sm">Welcome,</p>
          <h2 className="text-2xl font-bold text-foreground">{employee.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Commission: {employee.commission_type === 'fixed' 
              ? formatCurrency(employee.fixed_commission) + ' per sale'
              : employee.commission_percentage + '%'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <Card className="stat-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Earnings</p>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(stats.totalEarnings)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">This Month</p>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(stats.thisMonthEarnings)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-lg font-bold text-warning">
                    {formatCurrency(stats.unpaidCommissions)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Received</p>
                  <p className="text-lg font-bold text-success">
                    {formatCurrency(stats.paidCommissions)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="w-5 h-5 text-primary" />
                Weekly Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData}>
                    <defs>
                      <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₦${(v/1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="earnings" 
                      stroke="hsl(var(--primary))" 
                      fill="url(#colorEarnings)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Monthly Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₦${(v/1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === 'earnings' ? formatCurrency(value) : value,
                        name === 'earnings' ? 'Earnings' : 'Sales'
                      ]}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                      }}
                    />
                    <Bar dataKey="earnings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Summary */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-primary">{stats.totalSales}</p>
              <p className="text-sm text-muted-foreground">Total Sales</p>
            </CardContent>
          </Card>
          <Card className="bg-success/5 border-success/20">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-success">{stats.thisMonthSales}</p>
              <p className="text-sm text-muted-foreground">This Month</p>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Commission History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-secondary mx-auto mb-4 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">No sales yet</h3>
                <p className="text-sm text-muted-foreground">
                  Your commissions will appear here once you make sales
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead className="text-right">Sale</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.slice(0, 20).map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell className="text-sm">
                          {format(new Date(txn.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>{txn.services?.name || '-'}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(txn.total_amount))}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {formatCurrency(Number(txn.commission_amount))}
                        </TableCell>
                        <TableCell className="text-center">
                          {txn.is_commission_paid ? (
                            <Badge className="bg-success/10 text-success hover:bg-success/20">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Paid
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-warning/10 text-warning">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
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
      </main>
    </div>
  );
}
