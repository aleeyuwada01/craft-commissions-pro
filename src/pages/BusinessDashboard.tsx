import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
  DollarSign,
  TrendingUp,
  Users,
  Plus,
  ArrowLeft,
  Calendar,
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  commission_percentage: number;
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

interface BusinessStats {
  totalRevenue: number;
  totalCommissions: number;
  houseEarnings: number;
  transactionCount: number;
}

type TimeFilter = 'today' | 'week' | 'month' | 'all';

export default function BusinessDashboard() {
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<{ name: string; type: string; color: string } | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<BusinessStats>({
    totalRevenue: 0,
    totalCommissions: 0,
    houseEarnings: 0,
    transactionCount: 0,
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
      .select('id, name, commission_percentage')
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

    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    // Set up realtime subscription
    const channel = supabase
      .channel(`business-${id}-transactions`)
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
    const commission = amount * (employee.commission_percentage / 100);
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
      toast.success(
        `Sale recorded! ${employee.name} earns $${commission.toFixed(2)} commission.`
      );
      setSaleDialogOpen(false);
      setSelectedEmployee('');
      setSelectedService('');
      setSaleAmount('');
    }

    setIsRecording(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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
                          {svc.name} - ${svc.base_price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount ($)</Label>
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
                  <div className="p-4 bg-secondary rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Commission Preview</p>
                    <div className="flex justify-between">
                      <span>Employee gets:</span>
                      <span className="font-semibold text-primary">
                        {formatCurrency(
                          parseFloat(saleAmount) *
                            ((employees.find((e) => e.id === selectedEmployee)
                              ?.commission_percentage || 0) /
                              100)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span>House gets:</span>
                      <span className="font-semibold">
                        {formatCurrency(
                          parseFloat(saleAmount) -
                            parseFloat(saleAmount) *
                              ((employees.find((e) => e.id === selectedEmployee)
                                ?.commission_percentage || 0) /
                                100)
                        )}
                      </span>
                    </div>
                  </div>
                )}
                <Button
                  className="w-full"
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
                <DollarSign className="w-6 h-6 text-primary" />
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
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No transactions yet. Record your first sale!
                </p>
              ) : (
                <div className="space-y-2">
                  {transactions.map((txn) => (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{txn.employees?.name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">
                          {txn.services?.name} · {formatDate(txn.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(Number(txn.total_amount))}</p>
                        <p className="text-sm text-muted-foreground">
                          Commission: {formatCurrency(Number(txn.commission_amount))}
                        </p>
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
