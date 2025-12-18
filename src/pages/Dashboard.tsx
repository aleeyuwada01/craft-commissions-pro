import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBusinessUnits } from '@/hooks/useBusinessUnits';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
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
      // Get all transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          *,
          employees(name),
          business_units(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get all employees count
      const { count: employeeCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true });

      // Calculate totals from transactions
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

    // Set up realtime subscription
    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading || businessLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of all your business units
          </p>
        </div>
        <Link to="/business/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Business
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Commissions Due</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatCurrency(stats.totalCommissions)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Businesses</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {businessUnits.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {stats.totalEmployees}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Units Grid */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Your Businesses</h2>
        {businessUnits.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No businesses yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Create your first business unit to start tracking sales and commissions.
              </p>
              <Link to="/business/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Business
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {businessUnits.map((unit) => {
              const Icon = businessIcons[unit.type] || Building2;
              return (
                <Link key={unit.id} to={`/business/${unit.id}`}>
                  <Card className="stat-card group cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${unit.color}20` }}
                        >
                          <Icon className="w-6 h-6" style={{ color: unit.color }} />
                        </div>
                        <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mt-4">
                        {unit.name}
                      </h3>
                      <p className="text-sm text-muted-foreground capitalize mt-1">
                        {unit.type}
                      </p>
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
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {stats.recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {transaction.employee_name || 'Unknown Employee'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.business_name || 'Unknown Business'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {formatCurrency(Number(transaction.total_amount))}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Commission: {formatCurrency(Number(transaction.commission_amount))}
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
