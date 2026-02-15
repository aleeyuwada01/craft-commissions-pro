import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaystackVerificationResponse {
    status: boolean;
    message: string;
    data: {
        status: string;
        reference: string;
        amount: number;
        gateway_response: string;
        paid_at: string;
        channel: string;
    };
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { reference, businessId } = await req.json();

        if (!reference || !businessId) {
            throw new Error('Missing required parameters');
        }

        // Initialize Supabase client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Get Paystack secret key from business settings
        const { data: business, error: businessError } = await supabaseClient
            .from('business_units')
            .select('paystack_secret_key')
            .eq('id', businessId)
            .single();

        if (businessError || !business?.paystack_secret_key) {
            throw new Error('Paystack credentials not configured');
        }

        // Verify payment with Paystack API
        const verifyResponse = await fetch(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${business.paystack_secret_key}`,
                },
            }
        );

        const verifyData: PaystackVerificationResponse = await verifyResponse.json();

        if (!verifyData.status || verifyData.data.status !== 'success') {
            throw new Error('Payment verification failed');
        }

        // Update payment transaction
        const { error: updateError } = await supabaseClient
            .from('payment_transactions')
            .update({
                status: 'successful',
                gateway_response: verifyData.data,
            })
            .eq('reference', reference);

        if (updateError) {
            console.error('Failed to update transaction:', updateError);
        }

        return new Response(
            JSON.stringify({
                status: 'success',
                data: verifyData.data,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    } catch (error) {
        console.error('Error:', error);
        return new Response(
            JSON.stringify({
                status: 'error',
                message: error.message,
            }),
            {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
});
