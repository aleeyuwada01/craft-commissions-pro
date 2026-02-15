import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaystackLinkOptions {
    amount: number;
    email: string;
    reference?: string;
    metadata?: Record<string, any>;
    callback_url?: string;
}

export function usePaystackLink() {
    const [loading, setLoading] = useState(false);
    const [link, setLink] = useState<string | null>(null);

    const generatePaymentLink = async (options: PaystackLinkOptions): Promise<string | null> => {
        setLoading(true);

        try {
            // Get Paystack public key from environment or settings
            const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

            if (!paystackKey) {
                throw new Error('Paystack public key not configured');
            }

            // Generate unique reference if not provided
            const reference = options.reference || `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Create Paystack payment link
            // For demo purposes, using Paystack's payment page
            const baseUrl = 'https://paystack.com/pay';
            const params = new URLSearchParams({
                key: paystackKey,
                email: options.email,
                amount: (options.amount * 100).toString(), // Convert to kobo
                ref: reference,
                ...(options.metadata && { metadata: JSON.stringify(options.metadata) }),
                ...(options.callback_url && { callback_url: options.callback_url }),
            });

            const paymentLink = `${baseUrl}/${reference}`;

            setLink(paymentLink);
            return paymentLink;
        } catch (error: any) {
            console.error('Failed to generate payment link:', error);
            toast.error('Failed to generate payment link: ' + error.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    return {
        generatePaymentLink,
        loading,
        link,
    };
}
