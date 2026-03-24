import { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/currency';
import { logActivity } from '@/hooks/useActivityLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SaleRecordDialog } from '@/components/SaleRecordDialog';
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
  Plus,
  ShoppingCart,
  FileText,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, eachWeekOfInterval, startOfWeek, endOfWeek } from 'date-fns';

interface EmployeeData {
  id: string;
  name: string;
  business_id: string;
  commission_percentage: number;
  commission_type: 'percentage' | 'fixed';
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
  notes: string | null;
  services: { name: string } | null;
}

export default function EmployeeDashboard() {
  const { user, signOut } = useAuth();
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoggedLogin = useRef(false);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Get employee record for this user
      const { data: employeeData } = await supabase
        .from('employees')
        .select(`
          id,
          name,
          business_id,
          commission_percentage,
          commission_type,
          fixed_commission,
          business_units(name)
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (employeeData) {
        setEmployee({
          ...employeeData,
          commission_type: employeeData.commission_type as 'percentage' | 'fixed',
        });

        // Log login activity (only once per session)
        if (!hasLoggedLogin.current) {
          hasLoggedLogin.current = true;
          logActivity({
            employeeId: employeeData.id,
            action: 'login',
            details: 'Accessed employee dashboard',
          });
        }

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
            notes,
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
          <div className="flex items-center gap-2">
            <Link to={`/business/${employee.business_id}/pos`}>
              <Button variant="outline" size="sm">
                <ShoppingCart className="w-4 h-4 mr-1" />
                POS
              </Button>
            </Link>
            <Link to={`/business/${employee.business_id}/sales`}>
              <Button variant="outline" size="sm">
                <Receipt className="w-4 h-4 mr-1" />
                Sales History
              </Button>
            </Link>
            <Link to={`/business/${employee.business_id}/contracts`}>
              <Button variant="outline" size="sm">
                <FileText className="w-4 h-4 mr-1" />
                Contracts
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Sale Record Dialog */}
      <SaleRecordDialog
        open={saleDialogOpen}
        onOpenChange={setSaleDialogOpen}
        employeeId={employee.id}
        businessId={employee.business_id}
        commissionType={employee.commission_type}
        commissionPercentage={employee.commission_percentage}
        fixedCommission={employee.fixed_commission}
      />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome */}
        <div>
          <p className="text-muted-foreground text-sm">Welcome,</p>
          <h2 className="text-2xl font-bold text-foreground">{employee.name}</h2>
        </div>

        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Ready to record sales?</h3>
            <p className="text-muted-foreground">
              Please navigate to the POS page or Sales History using the buttons above.
            </p>
            <Link to={`/business/${employee.business_id}/pos`}>
              <Button className="mt-4">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Open Point of Sale
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
