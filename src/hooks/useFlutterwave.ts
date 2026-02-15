import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FlutterwaveConfig {
    publicKey: string;
}

interface PaymentData {
    email: string;
    phone_number?: string;
    name: string;
    amount: number; // in naira
    tx_ref: string;
    currency?: string;
    metadata?: any;
}

export function useFlutterwave(config: FlutterwaveConfig) {
    const [isProcessing, setIsProcessing] = useState(false);

    const initializePayment = async (paymentData: PaymentData, businessId: string) => {
        setIsProcessing(true);

        try {
            // Create payment transaction record
            const { data: transaction, error: txError } = await supabase
                .from('payment_transactions')
                .insert({
                    business_id: businessId,
                    reference: paymentData.tx_ref,
                    amount: paymentData.amount,
                    gateway: 'flutterwave',
                    customer_email: paymentData.email,
                    status: 'pending',
                    metadata: paymentData.metadata,
                })
                .select()
                .single();

            if (txError) throw txError;

            // Initialize Flutterwave
            const modal = (window as any).FlutterwaveCheckout({
                public_key: config.publicKey,
                tx_ref: paymentData.tx_ref,
                amount: paymentData.amount,
                currency: paymentData.currency || 'NGN',
                payment_options: 'card, banktransfer, ussd',
                customer: {
                    email: paymentData.email,
                    phone_number: paymentData.phone_number || '',
                    name: paymentData.name,
                },
                customizations: {
                    title: 'Payment',
                    description: 'Complete your payment',
                },
                callback: async function (response: any) {
                    if (response.status === 'successful') {
                        await verifyPayment(response.tx_ref, businessId);
                    }
                    modal.close();
                },
                onclose: function () {
                    setIsProcessing(false);
                    toast.info('Payment cancelled');
                },
            });
        } catch (error: any) {
            console.error('Flutterwave initialization error:', error);
            toast.error('Failed to initialize payment');
            setIsProcessing(false);
        }
    };

    const verifyPayment = async (tx_ref: string, businessId: string) => {
        try {
            // Update transaction status
            await supabase
                .from('payment_transactions')
                .update({ status: 'verifying' })
                .eq('reference', tx_ref);

            // Call Edge Function to verify
            const { data, error } = await supabase.functions.invoke('verify-flutterwave-payment', {
                body: { tx_ref, businessId },
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
