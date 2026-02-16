import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useBusinessUnits } from '@/hooks/useBusinessUnits';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  LayoutDashboard,
  Camera,
  Sparkles,
  Shirt,
  Building2,
  LogOut,
  Plus,
  Menu,
  FileText,
  TrendingUp,
  ChevronRight,
  Wallet,
  Moon,
  Sun,
  Users,
  Settings,
  ShoppingCart,
  Receipt,
  UserCircle,
  AlertTriangle,
  FileSignature,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const businessIcons: Record<string, React.ElementType> = {
  photography: Camera,
  makeup: Sparkles,
  clothing: Shirt,
  custom: Building2,
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { businessUnits } = useBusinessUnits();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isActive = (path: string) => location.pathname === path;
  const isBusinessActive = (id: string) => location.pathname.startsWith(`/business/${id}`);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3" onClick={() => setSheetOpen(false)}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sidebar-primary to-emerald-400 flex items-center justify-center shadow-lg shadow-sidebar-primary/20">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg text-sidebar-foreground">JB-Manager</span>
            <p className="text-xs text-sidebar-foreground/50">Commission Tracker</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-4 py-6">
        <nav className="space-y-2">
          <Link
            to="/"
            onClick={() => setSheetOpen(false)}
            className={cn('sidebar-item', isActive('/') && 'sidebar-item-active')}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/reports"
            onClick={() => setSheetOpen(false)}
            className={cn('sidebar-item', isActive('/reports') && 'sidebar-item-active')}
          >
            <FileText className="w-5 h-5" />
            <span>Reports</span>
          </Link>

          <Link
            to="/settings"
            onClick={() => setSheetOpen(false)}
            className={cn('sidebar-item', isActive('/settings') && 'sidebar-item-active')}
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </Link>

          <Separator className="my-4 bg-sidebar-border" />

          <div className="px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
              Businesses
            </span>
            <Link
              to="/business/new"
              onClick={() => setSheetOpen(false)}
              className="w-6 h-6 rounded-lg bg-sidebar-accent flex items-center justify-center hover:bg-sidebar-primary/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-sidebar-foreground/70" />
            </Link>
          </div>

          <div className="space-y-1">
            {businessUnits.map((unit) => {
              const Icon = businessIcons[unit.type] || Building2;
              const active = isBusinessActive(unit.id);
              return (
                <div key={unit.id}>
                  <Link
                    to={`/business/${unit.id}`}
                    onClick={() => setSheetOpen(false)}
                    className={cn('sidebar-item group', active && 'sidebar-item-active')}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: active ? unit.color : `${unit.color}20` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: active ? '#fff' : unit.color }} />
                    </div>
                    <span className="flex-1 truncate">{unit.name}</span>
                    <ChevronRight className={cn(
                      "w-4 h-4 transition-transform",
                      active ? "rotate-90" : "rotate-0 opacity-0 group-hover:opacity-50"
                    )} />
                  </Link>
                  {/* Sub-navigation for active business */}
                  {active && (
                    <div className="ml-6 pl-4 border-l border-sidebar-border space-y-1 mt-1 mb-2">
                      <Link
                        to={`/business/${unit.id}/pos`}
                        onClick={() => setSheetOpen(false)}
                        className={cn(
                          'sidebar-item text-sm py-2',
                          location.pathname === `/business/${unit.id}/pos` && 'sidebar-item-active'
                        )}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>POS</span>
                      </Link>
                      <Link
                        to={`/business/${unit.id}/sales`}
                        onClick={() => setSheetOpen(false)}
                        className={cn(
                          'sidebar-item text-sm py-2',
                          location.pathname === `/business/${unit.id}/sales` && 'sidebar-item-active'
                        )}
                      >
                        <Receipt className="w-4 h-4" />
                        <span>Sales</span>
                      </Link>
                      <Link
                        to={`/business/${unit.id}/customers`}
                        onClick={() => setSheetOpen(false)}
                        className={cn(
                          'sidebar-item text-sm py-2',
                          location.pathname === `/business/${unit.id}/customers` && 'sidebar-item-active'
                        )}
                      >
                        <UserCircle className="w-4 h-4" />
                        <span>Customers</span>
                      </Link>
                      <Link
                        to={`/business/${unit.id}/debtors`}
                        onClick={() => setSheetOpen(false)}
                        className={cn(
                          'sidebar-item text-sm py-2',
                          location.pathname === `/business/${unit.id}/debtors` && 'sidebar-item-active'
                        )}
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span>Debtors</span>
                      </Link>
                      <Link
                        to={`/business/${unit.id}/employees`}
                        onClick={() => setSheetOpen(false)}
                        className={cn(
                          'sidebar-item text-sm py-2',
                          location.pathname === `/business/${unit.id}/employees` && 'sidebar-item-active'
                        )}
                      >
                        <Users className="w-4 h-4" />
                        <span>Employees</span>
                      </Link>
                      <Link
                        to={`/business/${unit.id}/contracts`}
                        onClick={() => setSheetOpen(false)}
                        className={cn(
                          'sidebar-item text-sm py-2',
                          location.pathname === `/business/${unit.id}/contracts` && 'sidebar-item-active'
                        )}
                      >
                        <FileSignature className="w-4 h-4" />
                        <span>Contracts</span>
                      </Link>
                      <Link
                        to={`/business/${unit.id}/settings`}
                        onClick={() => setSheetOpen(false)}
                        className={cn(
                          'sidebar-item text-sm py-2',
                          location.pathname === `/business/${unit.id}/settings` && 'sidebar-item-active'
                        )}
                      >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}

            {businessUnits.length === 0 && (
              <div className="px-4 py-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-sidebar-accent mx-auto mb-3 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-sidebar-foreground/40" />
                </div>
                <p className="text-sm text-sidebar-foreground/50 mb-4">No businesses yet</p>
                <Link to="/business/new" onClick={() => setSheetOpen(false)}>
                  <Button size="sm" className="w-full rounded-xl">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Business
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </nav>
      </ScrollArea>

      {/* User */}
      <div className="p-4 border-t border-sidebar-border space-y-3">
        {/* Dark Mode Toggle */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-sidebar-accent/30">
          <div className="flex items-center gap-2">
            {theme === 'dark' ? (
              <Moon className="w-4 h-4 text-sidebar-foreground/70" />
            ) : (
              <Sun className="w-4 h-4 text-sidebar-foreground/70" />
            )}
            <span className="text-sm text-sidebar-foreground/70">Dark Mode</span>
          </div>
          <Switch
            checked={theme === 'dark'}
            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            className="data-[state=checked]:bg-sidebar-primary"
          />
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent/50">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground font-semibold">
              {user?.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.user_metadata?.full_name || 'Admin'}
            </p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="shrink-0 text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  // Mobile bottom navigation items
  const mobileNavItems = [
    { path: '/', icon: LayoutDashboard, label: 'Home' },
    { path: '/reports', icon: FileText, label: 'Reports' },
    { path: '/business/new', icon: Plus, label: 'Add' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-72 lg:flex-col bg-sidebar">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-md border-b border-border z-40 flex items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-foreground">JB-Manager</span>
        </Link>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-xl">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80 bg-sidebar border-sidebar-border">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-card/95 backdrop-blur-md border-t border-border z-40 px-2 pb-safe">
        <div className="flex items-center justify-around h-full max-w-md mx-auto">
          {mobileNavItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'mobile-nav-item flex-1',
                  active ? 'mobile-nav-item-active' : 'text-muted-foreground'
                )}
              >
                {item.label === 'Add' ? (
                  <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 -mt-6">
                    <item.icon className="w-6 h-6" />
                  </div>
                ) : (
                  <>
                    <item.icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </>
                )}
              </Link>
            );
          })}

          {/* Business shortcut */}
          {businessUnits.length > 0 && (
            <Link
              to={`/business/${businessUnits[0].id}`}
              className={cn(
                'mobile-nav-item flex-1',
                location.pathname.includes('/business/') && !location.pathname.includes('/new')
                  ? 'mobile-nav-item-active'
                  : 'text-muted-foreground'
              )}
            >
              <Building2 className="w-5 h-5" />
              <span className="text-xs font-medium">Business</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="lg:pl-72 pt-16 lg:pt-0 pb-24 lg:pb-0 min-h-screen">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
