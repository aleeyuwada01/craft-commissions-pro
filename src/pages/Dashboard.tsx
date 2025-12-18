import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBusinessUnits } from '@/hooks/useBusinessUnits';
import { formatCurrency } from '@/lib/currency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Wallet,
  Users,
  Building2,
  TrendingUp,
  Plus,
  ArrowRight,
  Camera,
  Sparkles,
  Shirt,
} from 'lucide-react';

const businessIcons: Record<string, React.ElementType> = {
  photography: Camera,
  makeup: Sparkles,
  clothing: Shirt,
  custom: Building2,
};

interface DashboardStats {
  totalRevenue: number;
  totalCommissions: number;
  totalEmployees: number;
  recentTransactions: Array<{
    id: string;
    total_amount: number;
    commission_amount: number;
    created_at: string;
    employee_name?: string;
    business_name?: string;
  }>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { businessUnits, loading: businessLoading } = useBusinessUnits();
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalCommissions: 0,
    totalEmployees: 0,
    recentTransactions: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          *,
          employees(name),
          business_units(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      const { count: employeeCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true });

      const { data: allTransactions } = await supabase
        .from('transactions')
        .select('total_amount, commission_amount');

      const totalRevenue = allTransactions?.reduce(
        (sum, t) => sum + Number(t.total_amount),
        0
      ) || 0;

      const totalCommissions = allTransactions?.reduce(
        (sum, t) => sum + Number(t.commission_amount),
        0
      ) || 0;

      setStats({
        totalRevenue,
        totalCommissions,
        totalEmployees: employeeCount || 0,
        recentTransactions: transactions?.map((t) => ({
          ...t,
          employee_name: t.employees?.name,
          business_name: t.business_units?.name,
        })) || [],
      });

      setLoading(false);
    };

    fetchStats();

    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading || businessLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">Welcome back,</p>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground">
            {user?.user_metadata?.full_name || 'Admin'}
          </h1>
        </div>
        <Link to="/business/new" className="hidden sm:block">
          <Button className="rounded-xl">
            <Plus className="w-4 h-4 mr-2" />
            Add Business
          </Button>
        </Link>
      </div>

      {/* Summary Cards - 2x2 Grid on Mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Card className="stat-card col-span-2 lg:col-span-1">
          <CardContent className="p-4 lg:p-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center shadow-lg shadow-primary/20">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-lg lg:text-xl font-bold text-foreground">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-4 lg:p-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-warning/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Commissions</p>
                <p className="text-lg lg:text-xl font-bold text-foreground">
                  {formatCurrency(stats.totalCommissions)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-4 lg:p-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-info/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Businesses</p>
                <p className="text-lg lg:text-xl font-bold text-foreground">
                  {businessUnits.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-4 lg:p-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Employees</p>
                <p className="text-lg lg:text-xl font-bold text-foreground">
                  {stats.totalEmployees}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Units */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base lg:text-lg font-semibold text-foreground">Your Businesses</h2>
          <Link to="/business/new" className="text-sm text-primary font-medium">
            View all
          </Link>
        </div>
        
        {businessUnits.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-secondary mx-auto mb-4 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">No businesses yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                Create your first business to start tracking sales and commissions
              </p>
              <Link to="/business/new">
                <Button className="rounded-xl">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Business
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            {businessUnits.map((unit) => {
              const Icon = businessIcons[unit.type] || Building2;
              return (
                <Link key={unit.id} to={`/business/${unit.id}`}>
                  <Card className="stat-card group cursor-pointer">
                    <CardContent className="p-4 lg:p-5">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                          style={{ backgroundColor: unit.color }}
                        >
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {unit.name}
                          </h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            {unit.type}
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {stats.recentTransactions.length > 0 && (
        <div>
          <h2 className="text-base lg:text-lg font-semibold text-foreground mb-4">Recent Sales</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {stats.recentTransactions.map((transaction, index) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {transaction.employee_name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {transaction.employee_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.business_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground text-sm">
                        {formatCurrency(Number(transaction.total_amount))}
                      </p>
                      <p className="text-xs text-primary font-medium">
                        +{formatCurrency(Number(transaction.commission_amount))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
