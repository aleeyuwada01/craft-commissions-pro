import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  User,
  Bell,
  Shield,
  Palette,
  Save,
  Loader2,
  Key,
  Download,
  Upload,
  Database,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { usePrivateAccess } from '@/hooks/usePrivateAccess';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BackupData {
  version: string;
  exportedAt: string;
  userId: string;
  profile: any;
  businessUnits: any[];
  employees: any[];
  services: any[];
  transactions: any[];
}

export default function GlobalSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [compactView, setCompactView] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<BackupData | null>(null);

  // Private Access hook
  const { 
    isPrivateAccessEnabled, 
    isLoading: privateAccessLoading, 
    setPrivateAccess 
  } = usePrivateAccess();

  const handlePrivateAccessToggle = async (enabled: boolean) => {
    try {
      await setPrivateAccess(enabled);
      toast.success(
        enabled 
          ? 'Private access enabled - new registrations are now disabled' 
          : 'Private access disabled - new registrations are now allowed'
      );
    } catch (error) {
      toast.error('Failed to update private access setting');
    }
  };

  useEffect(() => {
    fetchProfile();
    loadPreferences();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setFullName(data.full_name || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = () => {
    const prefs = localStorage.getItem('jb-manager-preferences');
    if (prefs) {
      const parsed = JSON.parse(prefs);
      setEmailNotifications(parsed.emailNotifications ?? true);
      setCompactView(parsed.compactView ?? false);
    }
  };

  const savePreferences = () => {
    localStorage.setItem('jb-manager-preferences', JSON.stringify({
      emailNotifications,
      compactView,
    }));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: fullName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      if (error) throw error;
      savePreferences();
      toast.success('Settings saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const { data: businesses } = await supabase
        .from('business_units')
        .select('id')
        .eq('user_id', user.id);
      
      const businessIds = businesses?.map(b => b.id) || [];

      const [profileRes, businessRes, employeesRes, servicesRes, transactionsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('business_units').select('*').eq('user_id', user.id),
        businessIds.length > 0 
          ? supabase.from('employees').select('*').in('business_id', businessIds)
          : { data: [] },
        businessIds.length > 0
          ? supabase.from('services').select('*').in('business_id', businessIds)
          : { data: [] },
        businessIds.length > 0
          ? supabase.from('transactions').select('*').in('business_id', businessIds)
          : { data: [] },
      ]);

      const backupData: BackupData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        userId: user.id,
        profile: profileRes.data,
        businessUnits: businessRes.data || [],
        employees: employeesRes.data || [],
        services: servicesRes.data || [],
        transactions: transactionsRes.data || [],
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jb-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as BackupData;
        if (!data.version || !data.businessUnits) {
          toast.error('Invalid backup file format');
          return;
        }
        setPendingImportData(data);
        setImportDialogOpen(true);
      } catch {
        toast.error('Failed to parse backup file');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportData = async () => {
    if (!user || !pendingImportData) return;
    setImporting(true);
    setImportDialogOpen(false);
    try {
      const data = pendingImportData;
      const businessIdMap: Record<string, string> = {};
      
      for (const business of data.businessUnits) {
        const oldId = business.id;
        const { data: newBusiness, error } = await supabase
          .from('business_units')
          .insert({
            name: `${business.name} (Imported)`,
            type: business.type,
            color: business.color,
            icon: business.icon,
            user_id: user.id,
          })
          .select()
          .single();
        if (error) throw error;
        businessIdMap[oldId] = newBusiness.id;
      }

      const serviceIdMap: Record<string, string> = {};
      for (const service of data.services) {
        const newBusinessId = businessIdMap[service.business_id];
        if (!newBusinessId) continue;
        const oldId = service.id;
        const { data: newService, error } = await supabase
          .from('services')
          .insert({
            name: service.name,
            description: service.description,
            base_price: service.base_price,
            is_active: service.is_active,
            business_id: newBusinessId,
          })
          .select()
          .single();
        if (error) throw error;
        serviceIdMap[oldId] = newService.id;
      }

      const employeeIdMap: Record<string, string> = {};
      for (const employee of data.employees) {
        const newBusinessId = businessIdMap[employee.business_id];
        if (!newBusinessId) continue;
        const oldId = employee.id;
        const { data: newEmployee, error } = await supabase
          .from('employees')
          .insert({
            name: employee.name,
            email: employee.email,
            phone: employee.phone,
            commission_type: employee.commission_type,
            commission_percentage: employee.commission_percentage,
            fixed_commission: employee.fixed_commission,
            is_active: employee.is_active,
            business_id: newBusinessId,
            user_id: null,
          })
          .select()
          .single();
        if (error) throw error;
        employeeIdMap[oldId] = newEmployee.id;
      }

      for (const transaction of data.transactions) {
        const newBusinessId = businessIdMap[transaction.business_id];
        if (!newBusinessId) continue;
        const newEmployeeId = transaction.employee_id ? employeeIdMap[transaction.employee_id] : null;
        const newServiceId = transaction.service_id ? serviceIdMap[transaction.service_id] : null;
        await supabase.from('transactions').insert({
          business_id: newBusinessId,
          employee_id: newEmployeeId,
          service_id: newServiceId,
          total_amount: transaction.total_amount,
          commission_amount: transaction.commission_amount,
          house_amount: transaction.house_amount,
          is_commission_paid: transaction.is_commission_paid,
          paid_at: transaction.paid_at,
          notes: transaction.notes,
          created_at: transaction.created_at,
        });
      }

      toast.success(`Imported ${data.businessUnits.length} businesses, ${data.employees.length} employees, ${data.services.length} services, and ${data.transactions.length} transactions`);
      setPendingImportData(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to import data');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and app preferences</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Manage your personal information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={user?.email || ''} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatarUrl">Avatar URL</Label>
            <Input id="avatarUrl" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://example.com/avatar.jpg" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <CardTitle>Security</CardTitle>
              <CardDescription>Update your password</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
          </div>
          <Button onClick={handleChangePassword} disabled={changingPassword || !newPassword || !confirmPassword} variant="outline">
            {changingPassword ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Changing...</> : <><Key className="w-4 h-4 mr-2" />Change Password</>}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <CardTitle>Access Control</CardTitle>
              <CardDescription>Manage user registration settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Private Access</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, new user registrations are disabled. Only existing users can sign in.
              </p>
            </div>
            <Switch 
              checked={isPrivateAccessEnabled} 
              onCheckedChange={handlePrivateAccessToggle}
              disabled={privateAccessLoading}
              data-testid="private-access-toggle"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <CardTitle>Data & Backup</CardTitle>
              <CardDescription>Export or import your business data</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleExportData} disabled={exporting} variant="outline" className="flex-1">
              {exporting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Exporting...</> : <><Download className="w-4 h-4 mr-2" />Export Data</>}
            </Button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
            <Button onClick={() => fileInputRef.current?.click()} disabled={importing} variant="outline" className="flex-1">
              {importing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</> : <><Upload className="w-4 h-4 mr-2" />Import Data</>}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Export creates a JSON backup of all your businesses, employees, services, and transactions. Import will create new copies (existing data is preserved).
          </p>
        </CardContent>
      </Card>

      <AlertDialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Confirm Data Import
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>You are about to import the following data:</p>
                {pendingImportData && (
                  <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                    <li>{pendingImportData.businessUnits.length} business unit(s)</li>
                    <li>{pendingImportData.employees.length} employee(s)</li>
                    <li>{pendingImportData.services.length} service(s)</li>
                    <li>{pendingImportData.transactions.length} transaction(s)</li>
                  </ul>
                )}
                <p className="mt-3 text-sm">
                  Imported businesses will be marked with "(Imported)" suffix.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImportData}>Import Data</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Configure how you receive notifications</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive email updates about your business</p>
            </div>
            <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Palette className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <CardTitle>Display</CardTitle>
              <CardDescription>Customize the app appearance</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Compact View</Label>
              <p className="text-sm text-muted-foreground">Use a more compact layout for tables and lists</p>
            </div>
            <Switch checked={compactView} onCheckedChange={setCompactView} />
          </div>
          <p className="text-xs text-muted-foreground">Dark mode can be toggled from the sidebar</p>
        </CardContent>
      </Card>

      <div className="flex justify-end pb-8">
        <Button onClick={handleSaveProfile} disabled={saving} size="lg">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
        </Button>
      </div>
    </div>
  );
}