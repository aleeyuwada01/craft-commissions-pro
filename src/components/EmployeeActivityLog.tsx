import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getActionLabel, getActionIcon } from '@/hooks/useActivityLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Clock } from 'lucide-react';

interface ActivityLog {
  id: string;
  employee_id: string;
  action: string;
  details: string | null;
  created_at: string;
}

interface EmployeeActivityLogProps {
  employeeId: string;
  employeeName: string;
}

export function EmployeeActivityLog({ employeeId, employeeName }: EmployeeActivityLogProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from('employee_activity_logs')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setLogs(data);
      }
      setLoading(false);
    };

    fetchLogs();
  }, [employeeId]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading activity...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">{employeeName}'s Activity</h3>
      </div>

      {logs.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground bg-secondary/30 rounded-xl">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No activity recorded yet</p>
        </div>
      ) : (
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <span className="text-lg">{getActionIcon(log.action)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">
                    {getActionLabel(log.action)}
                  </p>
                  {log.details && (
                    <p className="text-xs text-muted-foreground truncate">
                      {log.details}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(log.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
