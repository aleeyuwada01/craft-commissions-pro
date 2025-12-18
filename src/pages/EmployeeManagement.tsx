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
import { toast } from 'sonner';
import { ArrowLeft, Plus, Check, Pencil, Trash2, Eye, EyeOff, UserCheck, Percent, Banknote, KeyRound } from 'lucide-react';
import { z } from 'zod';

interface Employee {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  commission_percentage: number;
  commission_type: string;
  fixed_commission: number;
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
  const [commissionType, setCommissionType] = useState<'percentage' | 'fixed'>('percentage');
  const [commissionRate, setCommissionRate] = useState('10');
  const [fixedCommission, setFixedCommission] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Password reset state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmployee, setResetEmployee] = useState<Employee | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

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
    setCommissionType('percentage');
    setCommissionRate('10');
    setFixedCommission('');
    setEditingEmployee(null);
    setErrors({});
  };

  const handleOpenDialog = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setName(employee.name);
      setEmail(employee.email || '');
      setPhone(employee.phone || '');
      setCommissionType(employee.commission_type as 'percentage' | 'fixed');
      setCommissionRate(employee.commission_percentage.toString());
      setFixedCommission(employee.fixed_commission?.toString() || '');
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
        const { error } = await supabase
          .from('employees')
          .update({
            name,
            email: email || null,
            phone: phone || null,
            commission_type: commissionType,
            commission_percentage: parseFloat(commissionRate) || 0,
            fixed_commission: parseFloat(fixedCommission) || 0,
          })
          .eq('id', editingEmployee.id);

        if (error) throw error;
        toast.success('Employee updated successfully');
      } else {
        let userId: string | null = null;

        // First, insert the employee WITHOUT the user_id
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .insert({
            business_id: id,
            name,
            email: email || null,
            phone: phone || null,
            commission_type: commissionType,
            commission_percentage: parseFloat(commissionRate) || 0,
            fixed_commission: parseFloat(fixedCommission) || 0,
            user_id: null,
          })
          .select()
          .single();

        if (employeeError) throw employeeError;

        // Then create the account if requested
        if (createAccount && email && password) {
          // Store current session before signUp
          const { data: currentSession } = await supabase.auth.getSession();
          
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

          // Restore the admin session immediately
          if (currentSession.session) {
            await supabase.auth.setSession(currentSession.session);
          }

          if (authError) {
            // Employee was created, but account creation failed - let user know
            if (authError.message.includes('already registered')) {
              toast.error('Employee added, but email is already registered. They can use existing login.');
            } else {
              toast.error('Employee added, but account creation failed: ' + authError.message);
            }
          } else {
            userId = authData.user?.id || null;
            
            // Update the employee with the user_id
            if (userId) {
              await supabase
                .from('employees')
                .update({ user_id: userId })
                .eq('id', employeeData.id);
            }
            
            toast.success(`Employee added! Login: ${email}`);
          }
        } else {
          toast.success('Employee added successfully');
        }
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

  const handleResetPassword = async () => {
    if (!resetEmployee?.user_id || !newPassword) {
      toast.error('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsResetting(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('admin-reset-password', {
        body: {
          userId: resetEmployee.user_id,
          newPassword,
          employeeId: resetEmployee.id,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to reset password');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success(`Password updated for ${resetEmployee.name}`);
      setResetDialogOpen(false);
      setNewPassword('');
      setResetEmployee(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setIsResetting(false);
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

  const getCommissionDisplay = (emp: Employee) => {
    if (emp.commission_type === 'fixed') {
      return `${formatCurrency(emp.fixed_commission)} per sale`;
    }
    return `${emp.commission_percentage}%`;
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to={`/business/${id}`}>
            <Button variant="ghost" size="icon" className="rounded-xl shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-foreground">Employees</h1>
            <p className="text-sm text-muted-foreground">{business?.name}</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Add Employee</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? 'Edit Employee' : 'Add Employee'}
              </DialogTitle>
              <DialogDescription>
                {editingEmployee ? 'Update details' : 'Enter employee details'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="h-12 rounded-xl"
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
                  className={`h-12 rounded-xl ${errors.email ? 'border-destructive' : ''}`}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              {!editingEmployee && (
                <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
                  <div>
                    <Label className="text-sm font-medium">Create Login</Label>
                    <p className="text-xs text-muted-foreground">
                      Employee can sign in to view commissions
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
                      className={`h-12 rounded-xl ${errors.password ? 'border-destructive pr-10' : 'pr-10'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
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
                  className="h-12 rounded-xl"
                />
              </div>

              {/* Commission Type Selection */}
              <div className="space-y-3">
                <Label>Commission Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCommissionType('percentage')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      commissionType === 'percentage'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Percent className={`w-5 h-5 mx-auto mb-2 ${commissionType === 'percentage' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="text-sm font-medium">Percentage</p>
                    <p className="text-xs text-muted-foreground">% of sale</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommissionType('fixed')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      commissionType === 'fixed'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Banknote className={`w-5 h-5 mx-auto mb-2 ${commissionType === 'fixed' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="text-sm font-medium">Fixed</p>
                    <p className="text-xs text-muted-foreground">Per sale</p>
                  </button>
                </div>
              </div>
              
              {commissionType === 'percentage' ? (
                <div className="space-y-2">
                  <Label>Commission Rate (%)</Label>
                  <Input
                    type="number"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    placeholder="10"
                    min="0"
                    max="100"
                    step="0.5"
                    className="h-12 rounded-xl"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Fixed Commission (₦)</Label>
                  <Input
                    type="number"
                    value={fixedCommission}
                    onChange={(e) => setFixedCommission(e.target.value)}
                    placeholder="5000"
                    min="0"
                    className="h-12 rounded-xl"
                  />
                </div>
              )}
              
              <Button className="w-full h-12 rounded-xl" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : editingEmployee ? 'Update' : 'Add Employee'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Password Reset Dialog */}
        <Dialog open={resetDialogOpen} onOpenChange={(open) => {
          setResetDialogOpen(open);
          if (!open) {
            setNewPassword('');
            setResetEmployee(null);
          }
        }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Set a new password for {resetEmployee?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="h-12 rounded-xl pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <Button 
                className="w-full h-12 rounded-xl" 
                onClick={handleResetPassword} 
                disabled={isResetting || !newPassword}
              >
                {isResetting ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Employees Grid */}
      {employees.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto mb-4 flex items-center justify-center">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">No employees yet</p>
            <Button onClick={() => handleOpenDialog()} className="rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Employee
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {employees.map((emp) => {
            const stats = getEmployeeStats(emp.id);
            return (
              <Card key={emp.id} className="stat-card">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center relative">
                        <span className="text-lg font-bold text-primary">
                          {emp.name.charAt(0)}
                        </span>
                        {emp.user_id && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-lg flex items-center justify-center">
                            <UserCheck className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{emp.name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          {emp.commission_type === 'fixed' ? (
                            <Banknote className="w-3 h-3" />
                          ) : (
                            <Percent className="w-3 h-3" />
                          )}
                          {getCommissionDisplay(emp)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(emp)}
                        className="rounded-xl"
                        title="Edit employee"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {emp.user_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setResetEmployee(emp);
                            setResetDialogOpen(true);
                          }}
                          className="rounded-xl"
                          title="Reset password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(emp.id)}
                        className="rounded-xl text-destructive hover:text-destructive"
                        title="Delete employee"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-xl bg-secondary/50">
                      <p className="text-muted-foreground text-xs">Total Sales</p>
                      <p className="font-semibold">{formatCurrency(stats.totalSales)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/50">
                      <p className="text-muted-foreground text-xs">Earned</p>
                      <p className="font-semibold text-primary">{formatCurrency(stats.totalCommission)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/50">
                      <p className="text-muted-foreground text-xs">Transactions</p>
                      <p className="font-semibold">{stats.transactionCount}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-warning/10">
                      <p className="text-muted-foreground text-xs">Unpaid</p>
                      <p className="font-semibold text-warning">{formatCurrency(stats.unpaidCommission)}</p>
                    </div>
                  </div>
                  
                  {stats.unpaidCommission > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-4 rounded-xl"
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
            <CardTitle className="text-lg">Commission Ledger</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead className="hidden sm:table-cell">Service</TableHead>
                    <TableHead className="text-right">Sale</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.slice(0, 20).map((txn) => {
                    const employee = employees.find((e) => e.id === txn.employee_id);
                    return (
                      <TableRow key={txn.id}>
                        <TableCell className="text-sm">
                          {new Date(txn.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </TableCell>
                        <TableCell className="font-medium">{employee?.name || '-'}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">{txn.services?.name || '-'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(txn.total_amount))}</TableCell>
                        <TableCell className="text-right font-medium text-primary">{formatCurrency(Number(txn.commission_amount))}</TableCell>
                        <TableCell className="text-center">
                          {txn.is_commission_paid ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs bg-primary/10 text-primary font-medium">
                              Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs bg-warning/10 text-warning font-medium">
                              Due
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
