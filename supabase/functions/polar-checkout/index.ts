import { Polar } from 'npm:@polar-sh/sdk@0.41.5';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CheckoutRequest {
  productId: string;
  billingCycle: 'monthly' | 'yearly';
  isAudioAddon?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const polarAccessToken = Deno.env.get('POLAR_ACCESS_TOKEN')!;
    const appUrl = Deno.env.get('VITE_APP_URL') || 'http://localhost:5173';

    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { productId, billingCycle, isAudioAddon }: CheckoutRequest = await req.json();

    const { data: profile } = await supabase
      .from('profiles')
      .select('polar_customer_id, full_name')
      .eq('id', user.id)
      .maybeSingle();

    const polar = new Polar({
      accessToken: polarAccessToken,
    });

    let customerId = profile?.polar_customer_id;

    if (!customerId) {
      const customer = await polar.customers.create({
        email: user.email!,
        name: profile?.full_name || user.email!.split('@')[0],
        metadata: {
          supabase_user_id: user.id,
        },
      });

      customerId = customer.id;

      await supabase
        .from('profiles')
        .update({ polar_customer_id: customerId })
        .eq('id', user.id);
    }

    const checkout = await polar.checkouts.create({
      paymentProcessor: 'stripe',
      products: [productId],
      customerId: customerId,
      successUrl: `${appUrl}/checkout/success?session_id={CHECKOUT_ID}`,
      metadata: {
        supabase_user_id: user.id,
        billing_cycle: billingCycle,
        is_audio_addon: isAudioAddon ? 'true' : 'false',
      },
    });

    return new Response(
      JSON.stringify({ url: checkout.url }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Checkout error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create checkout' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});