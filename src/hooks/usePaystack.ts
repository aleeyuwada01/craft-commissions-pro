import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaystackConfig {
    publicKey: string;
}

interface PaymentData {
    email: string;
    amount: number; // in kobo (₦100 = 10000 kobo)
    reference: string;
    metadata?: any;
}

export function usePaystack(config: PaystackConfig) {
    const [isProcessing, setIsProcessing] = useState(false);

    const initializePayment = async (paymentData: PaymentData, businessId: string) => {
        setIsProcessing(true);

        try {
            // Create payment transaction record
            const { data: transaction, error: txError } = await supabase
                .from('payment_transactions')
                .insert({
                    business_id: businessId,
                    reference: paymentData.reference,
                    amount: paymentData.amount / 100, // Convert to naira
                    gateway: 'paystack',
                    customer_email: paymentData.email,
                    status: 'pending',
                    metadata: paymentData.metadata,
                })
                .select()
                .single();

            if (txError) throw txError;

            // Initialize Paystack popup
            const handler = (window as any).PaystackPop.setup({
                key: config.publicKey,
                email: paymentData.email,
                amount: paymentData.amount,
                ref: paymentData.reference,
                metadata: paymentData.metadata,
                onClose: function () {
                    setIsProcessing(false);
                    toast.info('Payment cancelled');
                },
                callback: async function (response: any) {
                    // Payment successful
                    await verifyPayment(response.reference, businessId);
                },
            });

            handler.openIframe();
        } catch (error: any) {
            console.error('Paystack initialization error:', error);
            toast.error('Failed to initialize payment');
            setIsProcessing(false);
        }
    };

    const verifyPayment = async (reference: string, businessId: string) => {
        try {
            // Update transaction status to verifying
            await supabase
                .from('payment_transactions')
                .update({ status: 'verifying' })
                .eq('reference', reference);

            // Call Edge Function to verify payment on server
            const { data, error } = await supabase.functions.invoke('verify-paystack-payment', {
                body: { reference, businessId },
            });

            if (error) throw error;

            if (data.status === 'success') {
                toast.success('Payment successful!');
                return data;
            } else {
                throw new Error('Payment verification failed');
            }
        } catch (error: any) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed');
            throw error;
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        initializePayment,
        verifyPayment,
        isProcessing,
    };
}

// Generate unique payment reference
export function generatePaymentReference(prefix: string = 'PAY') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}
