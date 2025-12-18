import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBusinessUnits } from '@/hooks/useBusinessUnits';
import { formatCurrency } from '@/lib/currency';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { 
  Download, 
  FileText, 
  Filter, 
  TrendingUp, 
  Trophy, 
  Medal,
  Crown,
  BarChart3,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, eachDayOfInterval, eachWeekOfInterval } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Transaction {
  id: string;
  total_amount: number;
  commission_amount: number;
  house_amount: number;
  is_commission_paid: boolean;
  created_at: string;
  employees: { id: string; name: string } | null;
  services: { name: string } | null;
  business_units: { id: string; name: string } | null;
}

interface EmployeePerformance {
  id: string;
  name: string;
  totalCommissions: number;
  totalSales: number;
  transactionCount: number;
}

export default function Reports() {
  const { user } = useAuth();
  const { businessUnits } = useBusinessUnits();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedBusiness, setSelectedBusiness] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paidFilter, setPaidFilter] = useState<string>('all');

  useEffect(() => {
    fetchTransactions();
    fetchAllTransactions();
  }, [user, selectedBusiness, startDate, endDate, paidFilter]);

  const fetchAllTransactions = async () => {
    if (!user) return;
    
    // Fetch last 3 months for charts
    const threeMonthsAgo = subMonths(new Date(), 3);
    
    const { data } = await supabase
      .from('transactions')
      .select(`
        *,
        employees(id, name),
        services(name),
        business_units(id, name)
      `)
      .gte('created_at', threeMonthsAgo.toISOString())
      .order('created_at', { ascending: true });
    
    setAllTransactions(data || []);
  };

  const fetchTransactions = async () => {
    if (!user) return;

    let query = supabase
      .from('transactions')
      .select(`
        *,
        employees(id, name),
        services(name),
        business_units(id, name)
      `)
      .order('created_at', { ascending: false });

    if (selectedBusiness !== 'all') {
      query = query.eq('business_id', selectedBusiness);
    }

    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00`);
    }

    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59`);
    }

    if (paidFilter === 'paid') {
      query = query.eq('is_commission_paid', true);
    } else if (paidFilter === 'unpaid') {
      query = query.eq('is_commission_paid', false);
    }

    const { data } = await query;
    setTransactions(data || []);
    setLoading(false);
  };

  // Weekly Revenue Data
  const weeklyData = useMemo(() => {
    const weeks = eachWeekOfInterval({
      start: subWeeks(new Date(), 7),
      end: new Date(),
    });

    return weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart);
      const weekTransactions = allTransactions.filter(t => {
        const date = new Date(t.created_at);
        return date >= weekStart && date <= weekEnd;
      });

      return {
        week: format(weekStart, 'MMM d'),
        revenue: weekTransactions.reduce((sum, t) => sum + Number(t.total_amount), 0),
        commissions: weekTransactions.reduce((sum, t) => sum + Number(t.commission_amount), 0),
        house: weekTransactions.reduce((sum, t) => sum + Number(t.house_amount), 0),
      };
    });
  }, [allTransactions]);

  // Monthly Revenue Data
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthTransactions = allTransactions.filter(t => {
        const date = new Date(t.created_at);
        return date >= monthStart && date <= monthEnd;
      });

      return {
        month: format(month, 'MMM yyyy'),
        revenue: monthTransactions.reduce((sum, t) => sum + Number(t.total_amount), 0),
        commissions: monthTransactions.reduce((sum, t) => sum + Number(t.commission_amount), 0),
        house: monthTransactions.reduce((sum, t) => sum + Number(t.house_amount), 0),
      };
    });
  }, [allTransactions]);

  // Employee Leaderboard (This Month)
  const employeeLeaderboard = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    
    const monthTransactions = allTransactions.filter(t => {
      const date = new Date(t.created_at);
      return date >= monthStart && date <= monthEnd && t.employees;
    });

    const employeeMap = new Map<string, EmployeePerformance>();
    
    monthTransactions.forEach(t => {
      if (!t.employees) return;
      
      const existing = employeeMap.get(t.employees.id) || {
        id: t.employees.id,
        name: t.employees.name,
        totalCommissions: 0,
        totalSales: 0,
        transactionCount: 0,
      };

      existing.totalCommissions += Number(t.commission_amount);
      existing.totalSales += Number(t.total_amount);
      existing.transactionCount += 1;

      employeeMap.set(t.employees.id, existing);
    });

    return Array.from(employeeMap.values())
      .sort((a, b) => b.totalCommissions - a.totalCommissions)
      .slice(0, 10);
  }, [allTransactions]);

  const totals = {
    revenue: transactions.reduce((sum, t) => sum + Number(t.total_amount), 0),
    commissions: transactions.reduce((sum, t) => sum + Number(t.commission_amount), 0),
    house: transactions.reduce((sum, t) => sum + Number(t.house_amount), 0),
    unpaid: transactions
      .filter((t) => !t.is_commission_paid)
      .reduce((sum, t) => sum + Number(t.commission_amount), 0),
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{index + 1}</span>;
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Colors
    const primaryColor: [number, number, number] = [34, 139, 34];
    const darkColor: [number, number, number] = [30, 41, 59];
    const lightGray: [number, number, number] = [248, 250, 252];
    
    // Header with gradient effect
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    // Logo placeholder
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15, 10, 25, 25, 3, 3, 'F');
    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    doc.text('JB', 22, 26);
    
    // Title
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('Commission Report', 50, 22);
    
    // Subtitle
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('JB-Manager | Professional Commission Tracking', 50, 32);
    
    // Report info section
    doc.setFillColor(...lightGray);
    doc.roundedRect(15, 55, pageWidth - 30, 25, 3, 3, 'F');
    
    doc.setTextColor(...darkColor);
    doc.setFontSize(9);
    doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy HH:mm')}`, 20, 65);
    doc.text(`Period: ${startDate || 'All time'} - ${endDate || 'Present'}`, 20, 73);
    doc.text(`Business: ${selectedBusiness === 'all' ? 'All Businesses' : businessUnits.find(b => b.id === selectedBusiness)?.name || 'N/A'}`, pageWidth / 2, 65);
    doc.text(`Total Records: ${transactions.length}`, pageWidth / 2, 73);
    
    // Summary Cards
    const cardY = 90;
    const cardWidth = (pageWidth - 50) / 4;
    const cardHeight = 30;
    
    const summaryData = [
      { label: 'Total Revenue', value: formatCurrency(totals.revenue), color: primaryColor },
      { label: 'House Earnings', value: formatCurrency(totals.house), color: [59, 130, 246] as [number, number, number] },
      { label: 'Commissions', value: formatCurrency(totals.commissions), color: [168, 85, 247] as [number, number, number] },
      { label: 'Unpaid', value: formatCurrency(totals.unpaid), color: [234, 179, 8] as [number, number, number] },
    ];
    
    summaryData.forEach((item, index) => {
      const x = 15 + (index * (cardWidth + 5));
      
      // Card background
      doc.setFillColor(...lightGray);
      doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, 'F');
      
      // Accent line
      doc.setFillColor(...item.color);
      doc.rect(x, cardY, 3, cardHeight, 'F');
      
      // Label
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(item.label, x + 8, cardY + 10);
      
      // Value
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkColor);
      doc.text(item.value, x + 8, cardY + 22);
      doc.setFont('helvetica', 'normal');
    });
    
    // Transactions Table
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkColor);
    doc.text('Transaction Details', 15, 140);
    
    // Decorative line
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(15, 143, 80, 143);
    
    const tableData = transactions.slice(0, 50).map((t) => [
      format(new Date(t.created_at), 'MMM d, yyyy'),
      t.business_units?.name || '-',
      t.employees?.name || '-',
      t.services?.name || '-',
      formatCurrency(Number(t.total_amount)),
      formatCurrency(Number(t.commission_amount)),
      t.is_commission_paid ? 'Paid' : 'Due',
    ]);
    
    autoTable(doc, {
      startY: 150,
      head: [['Date', 'Business', 'Employee', 'Service', 'Total', 'Commission', 'Status']],
      body: tableData,
      theme: 'plain',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: 4,
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: darkColor,
      },
      alternateRowStyles: {
        fillColor: lightGray,
      },
      columnStyles: {
        0: { cellWidth: 25 },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'center' },
      },
      margin: { left: 15, right: 15 },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 6) {
          const status = data.cell.raw as string;
          if (status === 'Paid') {
            doc.setTextColor(34, 139, 34);
          } else {
            doc.setTextColor(234, 179, 8);
          }
        }
      },
    });
    
    // Employee Leaderboard on new page if we have data
    if (employeeLeaderboard.length > 0) {
      doc.addPage();
      
      // Header for second page
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 30, 'F');
      
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Employee Performance - ' + format(new Date(), 'MMMM yyyy'), 15, 20);
      
      // Leaderboard
      doc.setFontSize(14);
      doc.setTextColor(...darkColor);
      doc.text('Top Performers', 15, 50);
      
      doc.setDrawColor(...primaryColor);
      doc.line(15, 53, 70, 53);
      
      const leaderboardData = employeeLeaderboard.map((emp, index) => [
        `#${index + 1}`,
        emp.name,
        emp.transactionCount.toString(),
        formatCurrency(emp.totalSales),
        formatCurrency(emp.totalCommissions),
      ]);
      
      autoTable(doc, {
        startY: 60,
        head: [['Rank', 'Employee', 'Sales Count', 'Total Sales', 'Commissions Earned']],
        body: leaderboardData,
        theme: 'plain',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10,
          cellPadding: 5,
        },
        bodyStyles: {
          fontSize: 9,
          cellPadding: 4,
          textColor: darkColor,
        },
        alternateRowStyles: {
          fillColor: lightGray,
        },
        columnStyles: {
          0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
          2: { halign: 'center' },
          3: { halign: 'right' },
          4: { halign: 'right' },
        },
        margin: { left: 15, right: 15 },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 0 && data.row.index < 3) {
            const colors = [[255, 215, 0], [192, 192, 192], [205, 127, 50]];
            doc.setTextColor(...(colors[data.row.index] as [number, number, number]));
          }
        },
      });
    }
    
    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Footer line
      doc.setDrawColor(226, 232, 240);
      doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);
      
      // Footer text
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('JB-Manager Commission Tracking System', 15, pageHeight - 12);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 35, pageHeight - 12);
      doc.text('Confidential Business Report', pageWidth / 2 - 25, pageHeight - 12);
    }
    
    doc.save(`commission-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
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
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">
            Analytics, insights, and export tools
          </p>
        </div>
        <Button onClick={exportToPDF} disabled={transactions.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Revenue Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-5 h-5 text-primary" />
              Weekly Revenue (Last 8 Weeks)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 10 }} tickFormatter={(v) => `₦${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="house" name="House" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5 text-primary" />
              Monthly Trend (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 10 }} tickFormatter={(v) => `₦${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                  <Line type="monotone" dataKey="commissions" name="Commissions" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ fill: 'hsl(var(--warning))' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Top Performers - {format(new Date(), 'MMMM yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {employeeLeaderboard.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No employee performance data for this month yet
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employeeLeaderboard.slice(0, 6).map((emp, index) => (
                <div 
                  key={emp.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${
                    index === 0 ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800' :
                    index === 1 ? 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-700' :
                    index === 2 ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' :
                    'bg-card border-border'
                  }`}
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background">
                    {getRankIcon(index)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{emp.name}</p>
                    <p className="text-sm text-muted-foreground">{emp.transactionCount} sales</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{formatCurrency(emp.totalCommissions)}</p>
                    <p className="text-xs text-muted-foreground">earned</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Business</Label>
              <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
                <SelectTrigger>
                  <SelectValue placeholder="All businesses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Businesses</SelectItem>
                  {businessUnits.map((bu) => (
                    <SelectItem key={bu.id} value={bu.id}>
                      {bu.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select value={paidFilter} onValueChange={setPaidFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="stat-card">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold">{formatCurrency(totals.revenue)}</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">House Earnings</p>
            <p className="text-2xl font-bold">{formatCurrency(totals.house)}</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Commissions</p>
            <p className="text-2xl font-bold">{formatCurrency(totals.commissions)}</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Unpaid Commissions</p>
            <p className="text-2xl font-bold text-warning">{formatCurrency(totals.unpaid)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Transaction History
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({transactions.length} records)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No transactions found for the selected filters
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">House</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell>
                        {new Date(txn.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{txn.business_units?.name}</TableCell>
                      <TableCell>{txn.employees?.name || '-'}</TableCell>
                      <TableCell>{txn.services?.name || '-'}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(txn.total_amount))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(txn.commission_amount))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(txn.house_amount))}
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
