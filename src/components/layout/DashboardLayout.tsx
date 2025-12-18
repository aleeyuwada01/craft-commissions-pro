import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBusinessUnits } from '@/hooks/useBusinessUnits';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  Camera,
  Sparkles,
  Shirt,
  Building2,
  Users,
  Settings,
  LogOut,
  Plus,
  Menu,
  X,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const businessIcons: Record<string, React.ElementType> = {
  photography: Camera,
  makeup: Sparkles,
  clothing: Shirt,
  custom: Building2,
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { businessUnits } = useBusinessUnits();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-semibold text-foreground">JB-Manager</span>
        <div className="w-9" />
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-sidebar border-r border-sidebar-border z-50 transition-transform duration-300',
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sidebar-foreground">JB-Manager</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-sidebar-accent rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              <Link
                to="/"
                onClick={() => setSidebarOpen(false)}
                className={cn('sidebar-item', isActive('/') && 'sidebar-item-active')}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>Dashboard</span>
              </Link>

              <Separator className="my-4" />

              <div className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Business Units
                  </span>
                  <Link
                    to="/business/new"
                    onClick={() => setSidebarOpen(false)}
                    className="p-1 hover:bg-sidebar-accent rounded transition-colors"
                  >
                    <Plus className="w-4 h-4 text-muted-foreground" />
                  </Link>
                </div>
              </div>

              {businessUnits.map((unit) => {
                const Icon = businessIcons[unit.type] || Building2;
                return (
                  <Link
                    key={unit.id}
                    to={`/business/${unit.id}`}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'sidebar-item group',
                      isActive(`/business/${unit.id}`) && 'sidebar-item-active'
                    )}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${unit.color}20` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: unit.color }} />
                    </div>
                    <span className="flex-1 truncate">{unit.name}</span>
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                );
              })}

              {businessUnits.length === 0 && (
                <div className="px-3 py-4 text-center">
                  <p className="text-sm text-muted-foreground mb-3">No businesses yet</p>
                  <Link to="/business/new" onClick={() => setSidebarOpen(false)}>
                    <Button size="sm" className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Business
                    </Button>
                  </Link>
                </div>
              )}

              <Separator className="my-4" />

              <Link
                to="/employees"
                onClick={() => setSidebarOpen(false)}
                className={cn('sidebar-item', isActive('/employees') && 'sidebar-item-active')}
              >
                <Users className="w-5 h-5" />
                <span>All Employees</span>
              </Link>

              <Link
                to="/reports"
                onClick={() => setSidebarOpen(false)}
                className={cn('sidebar-item', isActive('/reports') && 'sidebar-item-active')}
              >
                <FileText className="w-5 h-5" />
                <span>Reports</span>
              </Link>

              <Link
                to="/settings"
                onClick={() => setSidebarOpen(false)}
                className={cn('sidebar-item', isActive('/settings') && 'sidebar-item-active')}
              >
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </Link>
            </nav>
          </ScrollArea>

          {/* User */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.user_metadata?.full_name || 'Admin'}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
