import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { PaymentReceiptPDF, PaymentReceiptData } from '@/components/pos/PaymentReceiptPDF';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Search,
    DollarSign,
    Users,
    AlertTriangle,
    Download,
    CreditCard,
    Banknote,
    Smartphone,
    ChevronDown,
    ChevronUp,
    RefreshCw,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';

interface DebtorSale {
    id: string;
    sale_number: string;
    total_amount: number;
    amount_paid: number;
    balance_due: number;
    payment_status: string;
    payment_method: string;
    discount_amount: number;
    created_at: string;
    customer: {
        id: string;
        name: string | null;
        phone: string | null;
    } | null;
    sale_items: {
        id: string;
        quantity: number;
        unit_price: number;
        discount: number;
        total: number;
        service: {
            name: string;
        } | null;
    }[];
}

export default function Debtors() {
    const { id: businessId } = useParams<{ id: string }>();
    const [sales, setSales] = useState<DebtorSale[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'partial'>('all');
    const [expandedSale, setExpandedSale] = useState<string | null>(null);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState<DebtorSale | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<string>('cash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [receiptData, setReceiptData] = useState<PaymentReceiptData | null>(null);
    const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
    const [businessName, setBusinessName] = useState('');
    const [businessAddress, setBusinessAddress] = useState('');
    const [businessPhone, setBusinessPhone] = useState('');

    const fetchDebtors = async () => {
        if (!businessId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('sales')
                .select(`
                    id, sale_number, total_amount, amount_paid, balance_due,
                    payment_status, payment_method, discount_amount, created_at,
                    customer:customers(id, name, phone),
                    sale_items(id, quantity, unit_price, discount, total,
                        service:services(name)
                    )
                `)
                .eq('business_id', businessId)
                .gt('balance_due', 0)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSales((data as any) || []);
        } catch (error: any) {
            toast.error('Failed to load debtors: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!businessId) return;
        fetchDebtors();
        // Fetch business info
        supabase
            .from('business_units')
            .select('name, address, phone')
            .eq('id', businessId)
            .single()
            .then(({ data }) => {
                setBusinessName(data?.name || 'Business');
                setBusinessAddress(data?.address || '');
                setBusinessPhone(data?.phone || '');
            });
    }, [businessId]);

    const filteredSales = sales.filter(sale => {
        const matchesSearch =
            !searchQuery ||
            (sale.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (sale.customer?.phone?.includes(searchQuery)) ||
            sale.sale_number.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
            statusFilter === 'all' || sale.payment_status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const totalOutstanding = filteredSales.reduce((sum, s) => sum + (s.balance_due || 0), 0);
    const uniqueDebtors = new Set(filteredSales.map(s => s.customer?.id).filter(Boolean)).size;
    const walkInCount = filteredSales.filter(s => !s.customer).length;

    const openPaymentDialog = (sale: DebtorSale) => {
        setSelectedSale(sale);
        setPaymentAmount('');
        setPaymentMethod('cash');
        setPaymentDialogOpen(true);
    };

    const handleRecordPayment = async () => {
        if (!selectedSale || !paymentAmount) return;

        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Enter a valid payment amount');
            return;
        }
        if (amount > selectedSale.balance_due) {
            toast.error(`Amount exceeds balance of ${formatCurrency(selectedSale.balance_due)}`);
            return;
        }

        setIsProcessing(true);
        try {
            // Insert payment record
            const { error: paymentError } = await supabase
                .from('payments')
                .insert({
                    sale_id: selectedSale.id,
                    amount,
                    payment_method: paymentMethod,
                    status: 'successful',
                });

            if (paymentError) throw paymentError;

            // Update sale
            const newPaid = (selectedSale.amount_paid || 0) + amount;
            const newBalance = selectedSale.total_amount - newPaid;
            const newStatus = newBalance <= 0 ? 'completed' : 'partial';

            const { error: updateError } = await supabase
                .from('sales')
                .update({
                    amount_paid: newPaid,
                    balance_due: Math.max(0, newBalance),
                    payment_status: newStatus,
                })
                .eq('id', selectedSale.id);

            if (updateError) throw updateError;

            // Generate receipt data
            const receipt: PaymentReceiptData = {
                receiptNumber: `PAY-${Date.now().toString(36).toUpperCase()}`,
                date: format(new Date(), 'MMM d, yyyy h:mm a'),
                businessName,
                businessAddress: businessAddress || undefined,
                businessPhone: businessPhone || undefined,
                customerName: selectedSale.customer?.name || 'Walk-in Customer',
                customerPhone: selectedSale.customer?.phone || undefined,
                saleNumber: selectedSale.sale_number,
                saleDate: format(new Date(selectedSale.created_at), 'MMM d, yyyy'),
                originalTotal: selectedSale.total_amount,
                previouslyPaid: selectedSale.amount_paid || 0,
                thisPayment: amount,
                totalPaid: newPaid,
                remainingBalance: Math.max(0, newBalance),
                paymentMethod,
            };

            setReceiptData(receipt);
            setPaymentDialogOpen(false);
            setReceiptDialogOpen(true);
            toast.success(
                newBalance <= 0
                    ? 'Payment recorded — balance cleared! 🎉'
                    : `Payment of ${formatCurrency(amount)} recorded!`
            );
            fetchDebtors();
        } catch (error: any) {
            toast.error('Failed to record payment: ' + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to={`/business/${businessId}`}>
                        <Button variant="ghost" size="icon" className="rounded-xl">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Debtors & Outstanding Payments</h1>
                        <p className="text-muted-foreground text-sm">Track and manage unpaid balances</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={fetchDebtors} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                                <p className="text-xl font-bold text-red-500">{formatCurrency(totalOutstanding)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-amber-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                                <Users className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Debtors</p>
                                <p className="text-xl font-bold">{uniqueDebtors + walkInCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Outstanding Sales</p>
                                <p className="text-xl font-bold">{filteredSales.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by customer, phone, or sale number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select
                    value={statusFilter}
                    onValueChange={(val) => setStatusFilter(val as any)}
                >
                    <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Outstanding</SelectItem>
                        <SelectItem value="partial">Part Payments</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Debtors List */}
            <div className="space-y-3">
                {loading ? (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                            Loading debtors...
                        </CardContent>
                    </Card>
                ) : filteredSales.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="font-medium">No outstanding payments</p>
                            <p className="text-sm mt-1">All sales are fully paid!</p>
                        </CardContent>
                    </Card>
                ) : (
                    filteredSales.map(sale => (
                        <Card key={sale.id} className="overflow-hidden">
                            <CardContent className="p-0">
                                {/* Main Row */}
                                <div
                                    className="p-4 cursor-pointer hover:bg-secondary/20 transition-colors"
                                    onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-semibold truncate">
                                                    {sale.customer?.name || 'Walk-in Customer'}
                                                </p>
                                                <Badge variant={sale.payment_status === 'partial' ? 'secondary' : 'destructive'} className="text-xs">
                                                    {sale.payment_status === 'partial' ? 'Part Paid' : 'Unpaid'}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <span>{sale.sale_number}</span>
                                                <span>•</span>
                                                <span>{format(new Date(sale.created_at), 'MMM d, yyyy')}</span>
                                                {sale.customer?.phone && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{sale.customer.phone}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-red-500">
                                                    {formatCurrency(sale.balance_due)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    of {formatCurrency(sale.total_amount)}
                                                </p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="default"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openPaymentDialog(sale);
                                                }}
                                            >
                                                <Banknote className="w-4 h-4 mr-1" />
                                                Pay
                                            </Button>
                                            {expandedSale === sale.id
                                                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                                : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                            }
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mt-3">
                                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                                                style={{
                                                    width: `${((sale.amount_paid || 0) / sale.total_amount) * 100}%`,
                                                }}
                                            />
                                        </div>
                                        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                                            <span>Paid: {formatCurrency(sale.amount_paid || 0)}</span>
                                            <span>{Math.round(((sale.amount_paid || 0) / sale.total_amount) * 100)}%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedSale === sale.id && (
                                    <div className="px-4 pb-4 border-t bg-secondary/10">
                                        <div className="pt-3 space-y-2">
                                            <p className="text-sm font-medium">Sale Items</p>
                                            {sale.sale_items?.map(item => (
                                                <div key={item.id} className="flex justify-between text-sm py-1">
                                                    <span className="text-muted-foreground">
                                                        {item.service?.name || 'Unknown'} × {item.quantity}
                                                        {item.discount > 0 && (
                                                            <span className="text-green-600 ml-1">
                                                                (-{formatCurrency(item.discount)})
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="font-medium">{formatCurrency(item.total)}</span>
                                                </div>
                                            ))}
                                            {sale.discount_amount > 0 && (
                                                <div className="flex justify-between text-sm pt-2 border-t text-green-600">
                                                    <span>Total Discount</span>
                                                    <span>-{formatCurrency(sale.discount_amount)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-sm pt-2 border-t font-bold">
                                                <span>Total</span>
                                                <span>{formatCurrency(sale.total_amount)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Record Payment Dialog */}
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Record Payment</DialogTitle>
                    </DialogHeader>
                    {selectedSale && (
                        <div className="space-y-4">
                            <div className="p-3 bg-secondary/30 rounded-lg space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Customer:</span>
                                    <span className="font-medium">
                                        {selectedSale.customer?.name || 'Walk-in'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Sale:</span>
                                    <span className="font-mono text-xs">{selectedSale.sale_number}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Total:</span>
                                    <span>{formatCurrency(selectedSale.total_amount)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Already Paid:</span>
                                    <span className="text-green-600">{formatCurrency(selectedSale.amount_paid || 0)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold border-t pt-1">
                                    <span className="text-red-500">Balance Due:</span>
                                    <span className="text-red-500">{formatCurrency(selectedSale.balance_due)}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Payment Amount</label>
                                <Input
                                    type="number"
                                    min="0"
                                    max={selectedSale.balance_due}
                                    placeholder={`Max: ${formatCurrency(selectedSale.balance_due)}`}
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    autoFocus
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-xs"
                                    onClick={() => setPaymentAmount(selectedSale.balance_due.toString())}
                                >
                                    Pay Full Balance — {formatCurrency(selectedSale.balance_due)}
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Payment Method</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <Button
                                        variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setPaymentMethod('cash')}
                                    >
                                        <Banknote className="w-4 h-4 mr-1" />
                                        Cash
                                    </Button>
                                    <Button
                                        variant={paymentMethod === 'card' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setPaymentMethod('card')}
                                    >
                                        <CreditCard className="w-4 h-4 mr-1" />
                                        Card
                                    </Button>
                                    <Button
                                        variant={paymentMethod === 'transfer' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setPaymentMethod('transfer')}
                                    >
                                        <Smartphone className="w-4 h-4 mr-1" />
                                        Transfer
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleRecordPayment}
                            disabled={isProcessing || !paymentAmount}
                        >
                            {isProcessing ? 'Processing...' : 'Record Payment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Receipt Dialog */}
            <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-green-600">
                            ✓ Payment Recorded
                        </DialogTitle>
                    </DialogHeader>
                    {receiptData && (
                        <div className="space-y-4">
                            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                                <p className="text-2xl font-bold text-green-600">
                                    {formatCurrency(receiptData.thisPayment)}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {receiptData.paymentMethod.toUpperCase()} Payment
                                </p>
                            </div>

                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Customer:</span>
                                    <span>{receiptData.customerName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Sale:</span>
                                    <span className="font-mono text-xs">{receiptData.saleNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Paid:</span>
                                    <span className="text-green-600 font-semibold">
                                        {formatCurrency(receiptData.totalPaid)}
                                    </span>
                                </div>
                                {receiptData.remainingBalance > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Remaining:</span>
                                        <span className="text-red-500 font-semibold">
                                            {formatCurrency(receiptData.remainingBalance)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <PDFDownloadLink
                                document={<PaymentReceiptPDF data={receiptData} />}
                                fileName={`payment-${receiptData.receiptNumber}.pdf`}
                                className="w-full"
                            >
                                {({ loading: pdfLoading }) => (
                                    <Button className="w-full" disabled={pdfLoading}>
                                        <Download className="w-4 h-4 mr-2" />
                                        {pdfLoading ? 'Generating...' : 'Download Receipt'}
                                    </Button>
                                )}
                            </PDFDownloadLink>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReceiptDialogOpen(false)} className="w-full">
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
