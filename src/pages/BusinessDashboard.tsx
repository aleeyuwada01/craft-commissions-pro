import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { logActivity } from '@/hooks/useActivityLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  TrendingUp,
  Users,
  Plus,
  ArrowLeft,
  Calendar,
  Zap,
  Settings,
  Banknote,
  ShoppingCart,
  UserCircle,
  FileText,
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  commission_percentage: number;
  commission_type: string;
  fixed_commission: number;
}

interface Service {
  id: string;
  name: string;
  base_price: number;
}

interface Transaction {
  id: string;
  total_amount: number;
  commission_amount: number;
  house_amount: number;
  created_at: string;
  employees: { name: string } | null;
  services: { name: string } | null;
}

interface SaleRecord {
  id: string;
  sale_number: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  customers: { name: string } | null;
}

interface DisplayTransaction {
  id: string;
  type: 'commission' | 'pos';
  total_amount: number;
  created_at: string;
  label: string;
  sublabel: string;
  commission_amount?: number;
  payment_status?: string;
}

interface BusinessStats {
  totalRevenue: number;
  totalCommissions: number;
  houseEarnings: number;
  transactionCount: number;
}

interface TodayStats {
  revenue: number;
  transactions: number;
  commissions: number;
}

type TimeFilter = 'today' | 'week' | 'month' | 'all';

export default function BusinessDashboard() {
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<{ name: string; type: string; color: string } | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [displayTransactions, setDisplayTransactions] = useState<DisplayTransaction[]>([]);
  const [stats, setStats] = useState<BusinessStats>({
    totalRevenue: 0,
    totalCommissions: 0,
    houseEarnings: 0,
    transactionCount: 0,
  });
  const [todayStats, setTodayStats] = useState<TodayStats>({
    revenue: 0,
    transactions: 0,
    commissions: 0,
  });
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [loading, setLoading] = useState(true);

  // Record Sale Form State
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [saleAmount, setSaleAmount] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const getDateFilter = () => {
    const now = new Date();
    switch (timeFilter) {
      case 'today':
        return new Date(now.setHours(0, 0, 0, 0)).toISOString();
      case 'week':
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        return weekAgo.toISOString();
      case 'month':
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        return monthAgo.toISOString();
      default:
        return null;
    }
  };

  const fetchData = async () => {
    if (!id) return;

    // Fetch business details
    const { data: businessData } = await supabase
      .from('business_units')
      .select('name, type, color')
      .eq('id', id)
      .single();

    if (businessData) setBusiness(businessData);

    // Fetch employees
    const { data: employeesData } = await supabase
      .from('employees')
      .select('id, name, commission_percentage, commission_type, fixed_commission')
      .eq('business_id', id)
      .eq('is_active', true);

    if (employeesData) setEmployees(employeesData);

    // Fetch services
    const { data: servicesData } = await supabase
      .from('services')
      .select('id, name, base_price')
      .eq('business_id', id)
      .eq('is_active', true);

    if (servicesData) setServices(servicesData);

    // Fetch transactions with time filter
    let query = supabase
      .from('transactions')
      .select(`
        id,
        total_amount,
        commission_amount,
        house_amount,
        created_at,
        employees(name),
        services(name)
      `)
      .eq('business_id', id)
      .order('created_at', { ascending: false });

    const dateFilter = getDateFilter();
    if (dateFilter) {
      query = query.gte('created_at', dateFilter);
    }

    const { data: transactionsData } = await query;

    if (transactionsData) {
      setTransactions(transactionsData);

      // Calculate stats
      const totalRevenue = transactionsData.reduce(
        (sum, t) => sum + Number(t.total_amount),
        0
      );
      const totalCommissions = transactionsData.reduce(
        (sum, t) => sum + Number(t.commission_amount),
        0
      );
      const houseEarnings = transactionsData.reduce(
        (sum, t) => sum + Number(t.house_amount),
        0
      );

      setStats({
        totalRevenue,
        totalCommissions,
        houseEarnings,
        transactionCount: transactionsData.length,
      });
    }

    // Fetch POS sales
    let salesQuery = supabase
      .from('sales')
      .select(`
        id,
        sale_number,
        total_amount,
        payment_method,
        payment_status,
        created_at,
        customers(name)
      `)
      .eq('business_id', id)
      .order('created_at', { ascending: false });

    if (dateFilter) {
      salesQuery = salesQuery.gte('created_at', dateFilter);
    }

    const { data: salesData } = await salesQuery;

    // Merge transactions and sales into unified display list
    const commissionItems: DisplayTransaction[] = (transactionsData || []).map(t => ({
      id: t.id,
      type: 'commission' as const,
      total_amount: Number(t.total_amount),
      created_at: t.created_at,
      label: t.employees?.name || 'Unknown',
      sublabel: t.services?.name || 'Service',
      commission_amount: Number(t.commission_amount),
    }));

    const posItems: DisplayTransaction[] = (salesData || []).map(s => ({
      id: s.id,
      type: 'pos' as const,
      total_amount: Number(s.total_amount),
      created_at: s.created_at,
      label: s.customers?.name || 'Walk-in Customer',
      sublabel: `POS Sale #${s.sale_number}`,
      payment_status: s.payment_status,
    }));

    const merged = [...commissionItems, ...posItems].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setDisplayTransactions(merged);

    // Update stats to include POS sales
    const posSalesRevenue = (salesData || []).reduce(
      (sum, s) => sum + Number(s.total_amount), 0
    );
    setStats(prev => ({
      ...prev,
      totalRevenue: prev.totalRevenue + posSalesRevenue,
      transactionCount: prev.transactionCount + (salesData || []).length,
    }));

    // Fetch today's stats separately
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayData } = await supabase
      .from('transactions')
      .select('total_amount, commission_amount')
      .eq('business_id', id)
      .gte('created_at', todayStart.toISOString());

    const { data: todaySalesData } = await supabase
      .from('sales')
      .select('total_amount')
      .eq('business_id', id)
      .gte('created_at', todayStart.toISOString());

    const todayCommRevenue = (todayData || []).reduce((sum, t) => sum + Number(t.total_amount), 0);
    const todaySalesRevenue = (todaySalesData || []).reduce((sum, s) => sum + Number(s.total_amount), 0);

    setTodayStats({
      revenue: todayCommRevenue + todaySalesRevenue,
      transactions: (todayData || []).length + (todaySalesData || []).length,
      commissions: (todayData || []).reduce((sum, t) => sum + Number(t.commission_amount), 0),
    });

    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    // Set up realtime subscriptions for both tables
    const channel = supabase
      .channel(`business-${id}-all-sales`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `business_id=eq.${id}`,
        },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales',
          filter: `business_id=eq.${id}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, timeFilter]);

  const handleServiceChange = (serviceId: string) => {
    setSelectedService(serviceId);
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      setSaleAmount(service.base_price.toString());
    }
  };

  const handleRecordSale = async () => {
    if (!selectedEmployee || !selectedService || !saleAmount) {
      toast.error('Please fill in all fields');
      return;
    }

    const employee = employees.find((e) => e.id === selectedEmployee);
    if (!employee) return;

    const amount = parseFloat(saleAmount);

    // Calculate commission based on type
    let commission: number;
    if (employee.commission_type === 'fixed') {
      commission = employee.fixed_commission || 0;
    } else {
      commission = amount * (employee.commission_percentage / 100);
    }

    const houseAmount = amount - commission;

    setIsRecording(true);

    const { error } = await supabase.from('transactions').insert({
      business_id: id,
      employee_id: selectedEmployee,
      service_id: selectedService,
      total_amount: amount,
      commission_amount: commission,
      house_amount: houseAmount,
    });

    if (error) {
      toast.error('Failed to record sale: ' + error.message);
    } else {
      // Log activity for the employee
      const service = services.find(s => s.id === selectedService);
      await logActivity({
        employeeId: selectedEmployee,
        action: 'sale_recorded',
        details: `Sale of ${formatCurrency(amount)} for ${service?.name || 'service'}`,
      });

      toast.success(
        `Sale recorded! ${employee.name} earns ${formatCurrency(commission)}`
      );
      setSaleDialogOpen(false);
      setSelectedEmployee('');
      setSelectedService('');
      setSaleAmount('');
    }

    setIsRecording(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
      {/* Today's Quick Stats */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Today's Summary</h3>
              <p className="text-xs text-muted-foreground">Real-time overview</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-xl bg-background/50">
              <p className="text-2xl sm:text-3xl font-bold text-primary">{todayStats.transactions}</p>
              <p className="text-xs text-muted-foreground">Sales</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-background/50">
              <p className="text-lg sm:text-xl font-bold text-foreground">{formatCurrency(todayStats.revenue)}</p>
              <p className="text-xs text-muted-foreground">Revenue</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-background/50">
              <p className="text-lg sm:text-xl font-bold text-warning">{formatCurrency(todayStats.commissions)}</p>
              <p className="text-xs text-muted-foreground">Commissions</p>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{business?.name}</h1>
            <p className="text-muted-foreground capitalize">{business?.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/business/${id}/pos`}>
            <Button variant="outline" size="sm">
              <ShoppingCart className="w-4 h-4 mr-2" />
              POS
            </Button>
          </Link>
          <Link to={`/business/${id}/customers`}>
            <Button variant="outline" size="sm">
              <UserCircle className="w-4 h-4 mr-2" />
              Customers
            </Button>
          </Link>
          <Link to={`/business/${id}/contracts`}>
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              Contracts
            </Button>
          </Link>
          <Link to={`/business/${id}/employees`}>
            <Button variant="outline" size="sm">
              <Users className="w-4 h-4 mr-2" />
              Employees
            </Button>
          </Link>
          <Link to={`/business/${id}/settings`}>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={timeFilter}
            onValueChange={(value) => setTimeFilter(value as TimeFilter)}
          >
            <SelectTrigger className="w-[140px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Record Sale
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record New Sale</DialogTitle>
                <DialogDescription>
                  Enter the sale details. Commission will be calculated automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name} ({emp.commission_percentage}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {employees.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No employees yet.{' '}
                      <Link to={`/business/${id}/employees`} className="text-primary hover:underline">
                        Add one first
                      </Link>
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Service</Label>
                  <Select value={selectedService} onValueChange={handleServiceChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((svc) => (
                        <SelectItem key={svc.id} value={svc.id}>
                          {svc.name} - {formatCurrency(svc.base_price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount (₦)</Label>
                  <Input
                    type="number"
                    value={saleAmount}
                    onChange={(e) => setSaleAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                {selectedEmployee && saleAmount && (
                  <div className="p-4 bg-secondary rounded-xl">
                    <p className="text-sm text-muted-foreground mb-2">Commission Preview</p>
                    {(() => {
                      const emp = employees.find((e) => e.id === selectedEmployee);
                      const amount = parseFloat(saleAmount) || 0;
                      const commission = emp?.commission_type === 'fixed'
                        ? (emp?.fixed_commission || 0)
                        : amount * ((emp?.commission_percentage || 0) / 100);
                      const house = amount - commission;
                      return (
                        <>
                          <div className="flex justify-between">
                            <span>Employee gets:</span>
                            <span className="font-semibold text-primary">
                              {formatCurrency(commission)}
                            </span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span>House gets:</span>
                            <span className="font-semibold">
                              {formatCurrency(house)}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
                <Button
                  className="w-full h-12 rounded-xl"
                  onClick={handleRecordSale}
                  disabled={isRecording || !selectedEmployee || !selectedService || !saleAmount}
                >
                  {isRecording ? 'Recording...' : 'Record Sale'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Banknote className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">House Earnings</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.houseEarnings)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Commissions</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalCommissions)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold">{stats.transactionCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <Calendar className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {displayTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No transactions yet. Record your first sale!
                </p>
              ) : (
                <div className="space-y-2">
                  {displayTransactions.map((txn) => (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{txn.label}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${txn.type === 'pos'
                              ? 'bg-blue-500/10 text-blue-600'
                              : 'bg-purple-500/10 text-purple-600'
                            }`}>
                            {txn.type === 'pos' ? 'POS' : 'Commission'}
                          </span>
                          {txn.payment_status && txn.payment_status !== 'completed' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-600">
                              {txn.payment_status}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {txn.sublabel} · {formatDate(txn.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(txn.total_amount)}</p>
                        {txn.commission_amount !== undefined && (
                          <p className="text-sm text-muted-foreground">
                            Commission: {formatCurrency(txn.commission_amount)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Employees</CardTitle>
              <Link to={`/business/${id}/employees`}>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Employee
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No employees yet. Add your first team member!
                </p>
              ) : (
                <div className="space-y-2">
                  {employees.map((emp) => (
                    <div
                      key={emp.id}
                      className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {emp.name.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium">{emp.name}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {emp.commission_percentage}% commission
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Services</CardTitle>
              <Link to={`/business/${id}/settings`}>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Service
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {services.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No services configured. Add services to start recording sales!
                </p>
              ) : (
                <div className="space-y-2">
                  {services.map((svc) => (
                    <div
                      key={svc.id}
                      className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg"
                    >
                      <span className="font-medium">{svc.name}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(svc.base_price)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
