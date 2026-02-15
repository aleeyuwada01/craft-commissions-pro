import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ArrowLeft, CreditCard, Save } from 'lucide-react';

export default function PaymentSettings() {
    const { id: businessId } = useParams<{ id: string }>();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');
    const [paymentInstructions, setPaymentInstructions] = useState('');
    const [paystackEnabled, setPaystackEnabled] = useState(false);

    useEffect(() => {
        fetchPaymentSettings();
    }, [businessId]);

    const fetchPaymentSettings = async () => {
        if (!businessId) return;

        const { data, error } = await supabase
            .from('payment_settings')
            .select('*')
            .eq('business_id', businessId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error(error);
        } else if (data) {
            setBankName(data.bank_name || '');
            setAccountNumber(data.account_number || '');
            setAccountName(data.account_name || '');
            setPaymentInstructions(data.payment_instructions || '');
            setPaystackEnabled(data.paystack_enabled || false);
        }

        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);

        try {
            const { error } = await supabase
                .from('payment_settings')
                .upsert({
                    business_id: businessId,
                    bank_name: bankName,
                    account_number: accountNumber,
                    account_name: accountName,
                    payment_instructions: paymentInstructions,
                    paystack_enabled: paystackEnabled,
                    updated_at: new Date().toISOString(),
                });

            if (error) throw error;

            toast.success('Payment settings saved successfully!');
        } catch (error: any) {
            toast.error('Failed to save settings: ' + error.message);
        } finally {
            setSaving(false);
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
        <div className="max-w-4xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to={`/business/${businessId}/settings`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Payment Settings</h1>
                    <p className="text-sm text-muted-foreground">
                        Configure payment details for booking receipts
                    </p>
                </div>
            </div>

            {/* Bank Account Details */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Bank Account Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        These details will be included in booking receipts sent to customers for bank transfer payments.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Bank Name</Label>
                            <Input
                                value={bankName}
                                onChange={(e) => setBankName(e.target.value)}
                                placeholder="e.g., First Bank of Nigeria"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Account Number</Label>
                            <Input
                                value={accountNumber}
                                onChange={(e) => setAccountNumber(e.target.value)}
                                placeholder="e.g., 0123456789"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label>Account Name</Label>
                            <Input
                                value={accountName}
                                onChange={(e) => setAccountName(e.target.value)}
                                placeholder="e.g., Business Name Ltd"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Payment Instructions (Optional)</Label>
                        <Textarea
                            value={paymentInstructions}
                            onChange={(e) => setPaymentInstructions(e.target.value)}
                            placeholder="Add any additional payment instructions for customers..."
                            rows={4}
                        />
                        <p className="text-xs text-muted-foreground">
                            These instructions will appear on the booking receipt
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Paystack Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>Online Payment Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label>Enable Paystack Payment Links</Label>
                            <p className="text-sm text-muted-foreground">
                                Include Paystack payment link in booking receipts
                            </p>
                        </div>
                        <Switch
                            checked={paystackEnabled}
                            onCheckedChange={setPaystackEnabled}
                        />
                    </div>

                    {paystackEnabled && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                💡 When enabled, booking receipts will include a Paystack payment link that customers can use to pay online instantly.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Settings'}
                </Button>
            </div>
        </div>
    );
}
