import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useServices } from '@/hooks/useServices';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

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

export default function POSSystem() {
    const { id: businessId } = useParams<{ id: string }>();
    const { services, loading } = useServices(businessId);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'paystack' | 'flutterwave'>('cash');

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

        try {
            // Create sale
            const { data: sale, error: saleError } = await supabase
                .from('sales')
                .insert({
                    business_id: businessId,
                    customer_id: selectedCustomer?.id || null,
                    subtotal: calculateSubtotal(),
                    tax_amount: calculateTax(),
                    discount_amount: calculateDiscount(),
                    total_amount: calculateTotal(),
                    payment_method: paymentMethod,
                    payment_status: 'completed',
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
                total: item.unit_price * item.quantity,
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
                    amount: calculateTotal(),
                    payment_method: paymentMethod,
                    status: 'successful',
                });

            if (paymentError) throw paymentError;

            toast.success('Sale completed successfully!');
            clearCart();

            // TODO: Generate and print receipt

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
                                        <div key={item.service.id} className="flex items-center gap-2 p-2 bg-secondary/30 rounded-lg">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{item.service.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatCurrency(item.unit_price)} × {item.quantity}
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
                                    ))
                                )}
                            </div>

                            {/* Summary */}
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

                                    {/* Checkout Button */}
                                    <Button
                                        className="w-full"
                                        size="lg"
                                        onClick={handleCheckout}
                                    >
                                        Complete Sale - {formatCurrency(calculateTotal())}
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
        </div>
    );
}
