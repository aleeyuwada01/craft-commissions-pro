import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Check, Pencil, Trash2, Eye, EyeOff, UserCheck } from 'lucide-react';
import { z } from 'zod';

interface Employee {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  commission_percentage: number;
  is_active: boolean;
  user_id: string | null;
}

interface Transaction {
  id: string;
  employee_id: string;
  total_amount: number;
  commission_amount: number;
  is_commission_paid: boolean;
  created_at: string;
  services: { name: string } | null;
}

const emailSchema = z.string().email('Please enter a valid email');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function EmployeeManagement() {
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<{ name: string } | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [createAccount, setCreateAccount] = useState(true);
  const [commissionRate, setCommissionRate] = useState('10');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const fetchData = async () => {
    if (!id) return;

    const { data: businessData } = await supabase
      .from('business_units')
      .select('name')
      .eq('id', id)
      .single();

    if (businessData) setBusiness(businessData);

    const { data: employeesData } = await supabase
      .from('employees')
      .select('*')
      .eq('business_id', id)
      .order('name');

    if (employeesData) setEmployees(employeesData);

    const { data: transactionsData } = await supabase
      .from('transactions')
      .select(`
        id,
        employee_id,
        total_amount,
        commission_amount,
        is_commission_paid,
        created_at,
        services(name)
      `)
      .eq('business_id', id)
      .order('created_at', { ascending: false });

    if (transactionsData) setTransactions(transactionsData);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setCreateAccount(true);
    setCommissionRate('10');
    setEditingEmployee(null);
    setErrors({});
  };

  const handleOpenDialog = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setName(employee.name);
      setEmail(employee.email || '');
      setPhone(employee.phone || '');
      setCommissionRate(employee.commission_percentage.toString());
      setCreateAccount(false);
      setPassword('');
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (createAccount && !editingEmployee) {
      const emailResult = emailSchema.safeParse(email);
      if (!emailResult.success) {
        newErrors.email = emailResult.error.errors[0].message;
      }

      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        newErrors.password = passwordResult.error.errors[0].message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter employee name');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      if (editingEmployee) {
        // Update existing employee
        const { error } = await supabase
          .from('employees')
          .update({
            name,
            email: email || null,
            phone: phone || null,
            commission_percentage: parseFloat(commissionRate),
          })
          .eq('id', editingEmployee.id);

        if (error) throw error;
        toast.success('Employee updated successfully');
      } else {
        let userId: string | null = null;

        // Create auth account if requested
        if (createAccount && email && password) {
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/`,
              data: {
                full_name: name,
                role: 'employee',
              },
            },
          });

          if (authError) {
            if (authError.message.includes('already registered')) {
              toast.error('This email is already registered. Please use a different email.');
            } else {
              toast.error('Failed to create account: ' + authError.message);
            }
            setIsSaving(false);
            return;
          }

          userId = authData.user?.id || null;
        }

        // Create employee record
        const { error } = await supabase.from('employees').insert({
          business_id: id,
          name,
          email: email || null,
          phone: phone || null,
          commission_percentage: parseFloat(commissionRate),
          user_id: userId,
        });

        if (error) throw error;
        
        toast.success(
          createAccount 
            ? `Employee added! They can login with email: ${email}` 
            : 'Employee added successfully'
        );
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (employeeId: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', employeeId);

    if (error) {
      toast.error('Failed to delete employee');
    } else {
      toast.success('Employee deleted');
      fetchData();
    }
  };

  const handleMarkPaid = async (transactionIds: string[]) => {
    const { error } = await supabase
      .from('transactions')
      .update({ is_commission_paid: true, paid_at: new Date().toISOString() })
      .in('id', transactionIds);

    if (error) {
      toast.error('Failed to mark as paid');
    } else {
      toast.success('Commissions marked as paid');
      fetchData();
    }
  };

  const getEmployeeStats = (employeeId: string) => {
    const empTransactions = transactions.filter((t) => t.employee_id === employeeId);
    const totalSales = empTransactions.reduce((sum, t) => sum + Number(t.total_amount), 0);
    const totalCommission = empTransactions.reduce((sum, t) => sum + Number(t.commission_amount), 0);
    const unpaidCommission = empTransactions
      .filter((t) => !t.is_commission_paid)
      .reduce((sum, t) => sum + Number(t.commission_amount), 0);

    return { totalSales, totalCommission, unpaidCommission, transactionCount: empTransactions.length };
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
          <Link to={`/business/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Employees</h1>
            <p className="text-muted-foreground">{business?.name}</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </DialogTitle>
              <DialogDescription>
                {editingEmployee
                  ? 'Update employee details'
                  : 'Enter employee details and create their login account'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Email {createAccount && !editingEmployee ? '*' : ''}</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  placeholder="employee@example.com"
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              {!editingEmployee && (
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">Create Login Account</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow employee to sign in and view their commissions
                    </p>
                  </div>
                  <Switch
                    checked={createAccount}
                    onCheckedChange={setCreateAccount}
                  />
                </div>
              )}

              {createAccount && !editingEmployee && (
                <div className="space-y-2">
                  <Label>Password *</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors({ ...errors, password: undefined });
                      }}
                      placeholder="Min 6 characters"
                      className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 xxx xxx xxxx"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Commission Rate (%)</Label>
                <Input
                  type="number"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  min="0"
                  max="100"
                  step="0.5"
                />
              </div>
              
              <Button className="w-full" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : editingEmployee ? 'Update' : 'Add Employee'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Employees Grid */}
      {employees.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No employees yet</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Employee
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => {
            const stats = getEmployeeStats(emp.id);
            return (
              <Card key={emp.id} className="stat-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center relative">
                        <span className="text-lg font-semibold text-primary">
                          {emp.name.charAt(0)}
                        </span>
                        {emp.user_id && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-success rounded-full flex items-center justify-center">
                            <UserCheck className="w-3 h-3 text-success-foreground" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{emp.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {emp.commission_percentage}% commission
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(emp)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(emp.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {emp.email && (
                    <p className="text-xs text-muted-foreground mb-3 truncate">{emp.email}</p>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Sales</p>
                      <p className="font-semibold">{formatCurrency(stats.totalSales)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Commission</p>
                      <p className="font-semibold">{formatCurrency(stats.totalCommission)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Transactions</p>
                      <p className="font-semibold">{stats.transactionCount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Unpaid</p>
                      <p className="font-semibold text-warning">
                        {formatCurrency(stats.unpaidCommission)}
                      </p>
                    </div>
                  </div>
                  {stats.unpaidCommission > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-4"
                      onClick={() => {
                        const unpaidIds = transactions
                          .filter((t) => t.employee_id === emp.id && !t.is_commission_paid)
                          .map((t) => t.id);
                        handleMarkPaid(unpaidIds);
                      }}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Mark All as Paid
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Commission Ledger */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Commission Ledger</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-right">Total Sale</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 20).map((txn) => {
                  const employee = employees.find((e) => e.id === txn.employee_id);
                  return (
                    <TableRow key={txn.id}>
                      <TableCell>
                        {new Date(txn.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{employee?.name || 'Unknown'}</TableCell>
                      <TableCell>{txn.services?.name || '-'}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(txn.total_amount))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(txn.commission_amount))}
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
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
