import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useServices } from '@/hooks/useServices';
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
import { SaleReceiptPDF } from '@/components/pos/SaleReceiptPDF';
import { toast } from 'sonner';
import {
    ArrowLeft,
    ShoppingCart,
    Search,
    Plus,
    Minus,
    Trash2,
    CreditCard,
    Banknote,
    Smartphone,
    Download,
    CheckCircle,
    UserCircle,
    UserPlus,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';

interface CartItem {
    service: Service;
    quantity: number;
    unit_price: number;
    discount: number;
}

interface Service {
    id: string;
    name: string;
    description: string | null;
    base_price: number;
    image_url?: string | null;
    sku?: string | null;
    tax_rate?: number | null;
}

interface Customer {
    id: string;
    name: string | null;
    phone: string | null;
}

export default function POSSystem() {
    const { id: businessId } = useParams<{ id: string }>();
    const { services, loading } = useServices(businessId);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [businessName, setBusinessName] = useState('');
    const [businessAddress, setBusinessAddress] = useState('');
    const [businessPhone, setBusinessPhone] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'paystack' | 'flutterwave'>('cash');
    const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
    const [lastSaleData, setLastSaleData] = useState<any>(null);
    const [amountPaid, setAmountPaid] = useState('');
    const [showNewCustomer, setShowNewCustomer] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerPhone, setNewCustomerPhone] = useState('');
    const [isAddingCustomer, setIsAddingCustomer] = useState(false);

    useEffect(() => {
        if (!businessId) return;
        // Fetch customers
        supabase
            .from('customers')
            .select('id, name, phone')
            .eq('business_id', businessId)
            .order('name')
            .then(({ data }) => setCustomers(data || []));
        // Fetch business info
        supabase
            .from('business_units')
            .select('name, address, phone')
            .eq('id', businessId)
            .single()
            .then(({ data }) => {
                setBusinessName(data?.name || 'Business');
                setBusinessAddress(data?.address || 'KHALEELUL RAHMAN PLAZA,NEW OFF HIGHER COURT, ROUND ABOUT KATSINA, KATSINA STATE');
                setBusinessPhone(data?.phone || '08063901258, 08036433830, 09037705244, 09060686086');
            });
    }, [businessId]);

    const filteredServices = services.filter(service =>
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (service.sku && service.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const addToCart = (service: Service) => {
        const existingItem = cart.find(item => item.service.id === service.id);

        if (existingItem) {
            setCart(cart.map(item =>
                item.service.id === service.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setCart([...cart, {
                service,
                quantity: 1,
                unit_price: service.base_price,
                discount: 0,
            }]);
        }

        toast.success(`Added ${service.name} to cart`);
    };

    const updateQuantity = (serviceId: string, delta: number) => {
        setCart(cart.map(item => {
            if (item.service.id === serviceId) {
                const newQuantity = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQuantity };
            }
            return item;
        }));
    };

    const removeFromCart = (serviceId: string) => {
        setCart(cart.filter(item => item.service.id !== serviceId));
    };

    const clearCart = () => {
        setCart([]);
        setSelectedCustomer(null);
        setPaymentMethod('cash');
        setAmountPaid('');
    };

    const handleAddCustomer = async () => {
        if (!newCustomerName.trim()) {
            toast.error('Customer name is required');
            return;
        }
        setIsAddingCustomer(true);
        try {
            const { data, error } = await supabase
                .from('customers')
                .insert({
                    business_id: businessId!,
                    name: newCustomerName.trim(),
                    phone: newCustomerPhone.trim() || null,
                })
                .select('id, name, phone')
                .single();
            if (error) throw error;
            setCustomers(prev => [...prev, data]);
            setSelectedCustomer(data);
            setNewCustomerName('');
            setNewCustomerPhone('');
            setShowNewCustomer(false);
            toast.success(`Customer "${data.name}" added!`);
        } catch (error: any) {
            toast.error('Failed to add customer: ' + error.message);
        } finally {
            setIsAddingCustomer(false);
        }
    };

    const updateDiscount = (serviceId: string, discount: number) => {
        setCart(cart.map(item => {
            if (item.service.id === serviceId) {
                return { ...item, discount: Math.max(0, discount) };
            }
            return item;
        }));
    };

    const calculateSubtotal = () => {
        return cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    };

    const calculateTax = () => {
        return cart.reduce((sum, item) => {
            const taxRate = item.service.tax_rate || 0;
            return sum + (item.unit_price * item.quantity * taxRate / 100);
        }, 0);
    };

    const calculateDiscount = () => {
        return cart.reduce((sum, item) => sum + item.discount, 0);
    };

    const calculateTotal = () => {
        return calculateSubtotal() + calculateTax() - calculateDiscount();
    };

    const handleCheckout = async () => {
        if (cart.length === 0) {
            toast.error('Cart is empty');
            return;
        }

        const total = calculateTotal();
        const paid = amountPaid ? parseFloat(amountPaid) : total;
        const balance = Math.max(0, total - paid);
        const paymentStatus = balance > 0 ? 'partial' : 'completed';

        try {
            // Generate sale number
            const { data: saleNumber } = await supabase.rpc('generate_sale_number', {
                p_business_id: businessId!,
            });

            // Create sale
            const { data: sale, error: saleError } = await supabase
                .from('sales')
                .insert({
                    business_id: businessId!,
                    sale_number: saleNumber || `SL-${Date.now()}`,
                    customer_id: selectedCustomer?.id || null,
                    subtotal: calculateSubtotal(),
                    tax_amount: calculateTax(),
                    discount_amount: calculateDiscount(),
                    total_amount: total,
                    amount_paid: paid,
                    balance_due: balance,
                    payment_method: paymentMethod,
                    payment_status: paymentStatus,
                })
                .select()
                .single();

            if (saleError) throw saleError;

            // Create sale items
            const saleItems = cart.map(item => ({
                sale_id: sale.id,
                service_id: item.service.id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount: item.discount,
                tax_amount: (item.service.tax_rate || 0) * item.unit_price * item.quantity / 100,
                total: item.unit_price * item.quantity - item.discount,
            }));

            const { error: itemsError } = await supabase
                .from('sale_items')
                .insert(saleItems);

            if (itemsError) throw itemsError;

            // Create payment record
            const { error: paymentError } = await supabase
                .from('payments')
                .insert({
                    sale_id: sale.id,
                    amount: paid,
                    payment_method: paymentMethod,
                    status: 'successful',
                });

            if (paymentError) throw paymentError;

            // Generate receipt data
            const receiptData = {
                receiptNumber: `RCP-${sale.id.slice(0, 8).toUpperCase()}`,
                date: format(new Date(), 'MMM d, yyyy h:mm a'),
                businessName,
                businessAddress,
                businessPhone,
                customerName: selectedCustomer?.name || 'Walk-in Customer',
                items: cart.map(item => ({
                    name: item.service.name,
                    quantity: item.quantity,
                    unitPrice: item.unit_price,
                    discount: item.discount,
                    total: item.unit_price * item.quantity - item.discount,
                })),
                subtotal: calculateSubtotal(),
                taxAmount: calculateTax(),
                discountAmount: calculateDiscount(),
                totalAmount: total,
                amountPaid: paid,
                balanceDue: balance,
                paymentMethod,
                paymentStatus,
            };

            setLastSaleData(receiptData);
            setReceiptDialogOpen(true);
            toast.success(balance > 0 ? 'Sale recorded with outstanding balance!' : 'Sale completed successfully!');
            clearCart();

        } catch (error: any) {
            console.error('Checkout error:', error);
            toast.error('Failed to complete sale: ' + error.message);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to={`/business/${businessId}`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Point of Sale</h1>
                    <p className="text-sm text-muted-foreground">Quick checkout system</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Products */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                            placeholder="Search products by name or SKU..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Product Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {filteredServices.map(service => (
                            <button
                                key={service.id}
                                onClick={() => addToCart(service)}
                                className="p-4 bg-card border rounded-xl hover:border-primary transition-all text-left"
                            >
                                {service.image_url && (
                                    <img
                                        src={service.image_url}
                                        alt={service.name}
                                        className="w-full h-32 object-cover rounded-lg mb-2"
                                    />
                                )}
                                <p className="font-medium text-sm truncate">{service.name}</p>
                                {service.sku && (
                                    <p className="text-xs text-muted-foreground">SKU: {service.sku}</p>
                                )}
                                <p className="text-primary font-semibold mt-1">
                                    {formatCurrency(service.base_price)}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Cart */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5" />
                                Cart ({cart.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Cart Items */}
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {cart.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">
                                        Cart is empty
                                    </p>
                                ) : (
                                    cart.map(item => (
                                        <div key={item.service.id} className="p-2 bg-secondary/30 rounded-lg space-y-1">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">{item.service.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatCurrency(item.unit_price)} × {item.quantity}
                                                        {item.discount > 0 && (
                                                            <span className="text-green-600 ml-1">(-{formatCurrency(item.discount)})</span>
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7"
                                                        onClick={() => updateQuantity(item.service.id, -1)}
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </Button>
                                                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7"
                                                        onClick={() => updateQuantity(item.service.id, 1)}
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-destructive"
                                                        onClick={() => removeFromCart(item.service.id)}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                            {/* Per-item Discount */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground">Discount:</span>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    placeholder="0"
                                                    value={item.discount || ''}
                                                    onChange={(e) => updateDiscount(item.service.id, parseFloat(e.target.value) || 0)}
                                                    className="h-7 text-xs w-24"
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Summary */}
                            {/* Customer Selection */}
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Customer</p>
                                <Select
                                    value={selectedCustomer?.id || 'walk-in'}
                                    onValueChange={(val) => {
                                        if (val === 'walk-in') {
                                            setSelectedCustomer(null);
                                        } else {
                                            const cust = customers.find(c => c.id === val);
                                            setSelectedCustomer(cust || null);
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Walk-in Customer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="walk-in">
                                            <div className="flex items-center gap-2">
                                                <UserCircle className="w-4 h-4" />
                                                Walk-in Customer
                                            </div>
                                        </SelectItem>
                                        {customers.map(c => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name || 'Anonymous'} {c.phone ? `(${c.phone})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full mt-2"
                                    onClick={() => setShowNewCustomer(!showNewCustomer)}
                                >
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    {showNewCustomer ? 'Cancel' : 'Add New Customer'}
                                </Button>
                                {showNewCustomer && (
                                    <div className="space-y-2 p-3 bg-secondary/30 rounded-lg mt-2">
                                        <Input
                                            placeholder="Customer name *"
                                            value={newCustomerName}
                                            onChange={(e) => setNewCustomerName(e.target.value)}
                                        />
                                        <Input
                                            placeholder="Phone number"
                                            value={newCustomerPhone}
                                            onChange={(e) => setNewCustomerPhone(e.target.value)}
                                        />
                                        <Button
                                            size="sm"
                                            className="w-full"
                                            onClick={handleAddCustomer}
                                            disabled={isAddingCustomer || !newCustomerName.trim()}
                                        >
                                            {isAddingCustomer ? 'Adding...' : 'Save Customer'}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {cart.length > 0 && (
                                <>
                                    <div className="space-y-2 pt-4 border-t">
                                        <div className="flex justify-between text-sm">
                                            <span>Subtotal:</span>
                                            <span>{formatCurrency(calculateSubtotal())}</span>
                                        </div>
                                        {calculateTax() > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span>Tax:</span>
                                                <span>{formatCurrency(calculateTax())}</span>
                                            </div>
                                        )}
                                        {calculateDiscount() > 0 && (
                                            <div className="flex justify-between text-sm text-green-600">
                                                <span>Discount:</span>
                                                <span>-{formatCurrency(calculateDiscount())}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between font-bold text-lg pt-2 border-t">
                                            <span>Total:</span>
                                            <span className="text-primary">{formatCurrency(calculateTotal())}</span>
                                        </div>
                                    </div>

                                    {/* Payment Method */}
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Payment Method</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setPaymentMethod('cash')}
                                                className="justify-start"
                                            >
                                                <Banknote className="w-4 h-4 mr-2" />
                                                Cash
                                            </Button>
                                            <Button
                                                variant={paymentMethod === 'card' ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setPaymentMethod('card')}
                                                className="justify-start"
                                            >
                                                <CreditCard className="w-4 h-4 mr-2" />
                                                Card
                                            </Button>
                                            <Button
                                                variant={paymentMethod === 'transfer' ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setPaymentMethod('transfer')}
                                                className="justify-start"
                                            >
                                                <Smartphone className="w-4 h-4 mr-2" />
                                                Transfer
                                            </Button>
                                            <Button
                                                variant={paymentMethod === 'paystack' ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setPaymentMethod('paystack')}
                                                className="justify-start"
                                            >
                                                Paystack
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Amount Paid (Part Payment) */}
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Amount Paid</p>
                                        <Input
                                            type="number"
                                            min="0"
                                            placeholder={`Full: ${formatCurrency(calculateTotal())}`}
                                            value={amountPaid}
                                            onChange={(e) => setAmountPaid(e.target.value)}
                                        />
                                        {amountPaid && parseFloat(amountPaid) < calculateTotal() && (
                                            <div className="p-2 bg-amber-50 dark:bg-amber-950 rounded text-xs">
                                                <p className="text-amber-700 dark:text-amber-300 font-medium">
                                                    ⚠ Part Payment — Balance: {formatCurrency(calculateTotal() - parseFloat(amountPaid))}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Checkout Button */}
                                    <Button
                                        className="w-full"
                                        size="lg"
                                        onClick={handleCheckout}
                                    >
                                        {amountPaid && parseFloat(amountPaid) < calculateTotal()
                                            ? `Record Part Payment - ${formatCurrency(parseFloat(amountPaid))}`
                                            : `Complete Sale - ${formatCurrency(calculateTotal())}`
                                        }
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={clearCart}
                                    >
                                        Clear Cart
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Receipt Dialog */}
            <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-5 h-5" />
                            {lastSaleData?.balanceDue > 0 ? 'Part Payment Recorded!' : 'Sale Completed!'}
                        </DialogTitle>
                    </DialogHeader>
                    {lastSaleData && (
                        <div className="space-y-4">
                            <div className={`p-4 rounded-lg text-center ${lastSaleData.balanceDue > 0
                                ? 'bg-amber-50 dark:bg-amber-950'
                                : 'bg-green-50 dark:bg-green-950'
                                }`}>
                                <p className={`text-2xl font-bold ${lastSaleData.balanceDue > 0 ? 'text-amber-600' : 'text-green-600'
                                    }`}>
                                    {formatCurrency(lastSaleData.totalAmount)}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {lastSaleData.paymentMethod.toUpperCase()} Payment
                                </p>
                            </div>

                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Receipt:</span>
                                    <span className="font-mono">{lastSaleData.receiptNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Customer:</span>
                                    <span>{lastSaleData.customerName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Amount Paid:</span>
                                    <span className="font-semibold text-green-600">{formatCurrency(lastSaleData.amountPaid)}</span>
                                </div>
                                {lastSaleData.balanceDue > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Balance Due:</span>
                                        <span className="font-semibold text-red-600">{formatCurrency(lastSaleData.balanceDue)}</span>
                                    </div>
                                )}
                            </div>

                            <PDFDownloadLink
                                document={<SaleReceiptPDF data={lastSaleData} />}
                                fileName={`receipt-${lastSaleData.receiptNumber}.pdf`}
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
