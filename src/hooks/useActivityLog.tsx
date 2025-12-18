import { supabase } from '@/integrations/supabase/client';

export type ActivityAction = 
  | 'login'
  | 'logout'
  | 'view_dashboard'
  | 'view_commissions'
  | 'password_changed'
  | 'profile_updated'
  | 'sale_recorded'
  | 'commission_paid';

interface LogActivityParams {
  employeeId: string;
  action: ActivityAction;
  details?: string;
}

export async function logActivity({ employeeId, action, details }: LogActivityParams) {
  try {
    const { error } = await supabase
      .from('employee_activity_logs')
      .insert({
        employee_id: employeeId,
        action,
        details,
      });

    if (error) {
      console.error('Failed to log activity:', error.message);
    }
  } catch (err) {
    console.error('Activity logging error:', err);
  }
}

export function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    login: 'Logged in',
    logout: 'Logged out',
    view_dashboard: 'Viewed dashboard',
    view_commissions: 'Viewed commissions',
    password_changed: 'Password was changed',
    profile_updated: 'Profile updated',
    sale_recorded: 'Sale recorded',
    commission_paid: 'Commission paid',
  };
  return labels[action] || action;
}

export function getActionIcon(action: string): string {
  const icons: Record<string, string> = {
    login: '🔐',
    logout: '👋',
    view_dashboard: '📊',
    view_commissions: '💰',
    password_changed: '🔑',
    profile_updated: '👤',
    sale_recorded: '🛒',
    commission_paid: '✅',
  };
  return icons[action] || '📝';
}
