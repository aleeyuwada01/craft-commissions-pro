import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FlutterwaveVerificationResponse {
    status: string;
    message: string;
    data: {
        status: string;
        tx_ref: string;
        amount: number;
        currency: string;
        payment_type: string;
        created_at: string;
    };
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { tx_ref, businessId } = await req.json();

        if (!tx_ref || !businessId) {
            throw new Error('Missing required parameters');
        }

        // Initialize Supabase
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Get Flutterwave secret key
        const { data: business, error: businessError } = await supabaseClient
            .from('business_units')
            .select('flutterwave_secret_key')
            .eq('id', businessId)
            .single();

        if (businessError || !business?.flutterwave_secret_key) {
            throw new Error('Flutterwave credentials not configured');
        }

        // Verify with Flutterwave API
        const verifyResponse = await fetch(
            `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${tx_ref}`,
            {
                headers: {
                    Authorization: `Bearer ${business.flutterwave_secret_key}`,
                },
            }
        );

        const verifyData: FlutterwaveVerificationResponse = await verifyResponse.json();

        if (verifyData.status !== 'success' || verifyData.data.status !== 'successful') {
            throw new Error('Payment verification failed');
        }

        // Update transaction
        const { error: updateError } = await supabaseClient
            .from('payment_transactions')
            .update({
                status: 'successful',
                gateway_response: verifyData.data,
            })
            .eq('reference', tx_ref);

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
