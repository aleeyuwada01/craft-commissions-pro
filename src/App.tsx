import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import EmployeeDashboard from "@/pages/EmployeeDashboard";
import NewBusiness from "@/pages/NewBusiness";
import BusinessDashboard from "@/pages/BusinessDashboard";
import EmployeeManagement from "@/pages/EmployeeManagement";
import BusinessSettings from "@/pages/Settings";
import Reports from "@/pages/Reports";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}

// Smart home route that detects if user is admin or employee
function SmartHome() {
  const { user, loading } = useAuth();
  const [isEmployee, setIsEmployee] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user || loading) return;

    const checkUserRole = async () => {
      // Check if user has any business units (admin)
      const { count: businessCount } = await supabase
        .from('business_units')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Check if user is an employee
      const { data: employeeData } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      // If user has businesses, they're an admin
      // If user has no businesses but has employee record, they're an employee
      if (businessCount && businessCount > 0) {
        setIsEmployee(false);
      } else if (employeeData) {
        setIsEmployee(true);
      } else {
        // New user with no businesses or employee record - show admin dashboard
        setIsEmployee(false);
      }

      setChecking(false);
    };

    checkUserRole();
  }, [user, loading]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isEmployee) {
    return <EmployeeDashboard />;
  }

  return (
    <DashboardLayout>
      <Dashboard />
    </DashboardLayout>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={user ? <Navigate to="/" replace /> : <Auth />}
      />
      <Route
        path="/"
        element={<SmartHome />}
      />
      <Route
        path="/my-commissions"
        element={
          user ? <EmployeeDashboard /> : <Navigate to="/auth" replace />
        }
      />
      <Route
        path="/business/new"
        element={
          <ProtectedRoute>
            <NewBusiness />
          </ProtectedRoute>
        }
      />
      <Route
        path="/business/:id"
        element={
          <ProtectedRoute>
            <BusinessDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/business/:id/employees"
        element={
          <ProtectedRoute>
            <EmployeeManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/business/:id/settings"
        element={
          <ProtectedRoute>
            <BusinessSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
