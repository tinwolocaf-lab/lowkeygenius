import { validateEvent } from 'npm:@polar-sh/sdk@0.41.5/webhooks';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, webhook-signature',
};

interface PolarSubscriptionData {
  id: string;
  product_id: string;
  status: string;
  current_period_end: string;
  metadata?: Record<string, string>;
}

interface PolarEvent {
  type: string;
  data: PolarSubscriptionData;
  id: string;
}

const PRODUCT_TO_PLAN_MAP: Record<string, string> = {
  [Deno.env.get('VITE_POLAR_PRODUCT_PLUS_MONTHLY') || '']: 'PLUS',
  [Deno.env.get('VITE_POLAR_PRODUCT_PLUS_YEARLY') || '']: 'PLUS',
  [Deno.env.get('VITE_POLAR_PRODUCT_PRO_MONTHLY') || '']: 'PRO',
  [Deno.env.get('VITE_POLAR_PRODUCT_PRO_YEARLY') || '']: 'PRO',
  [Deno.env.get('VITE_POLAR_PRODUCT_PRO_MAX_MONTHLY') || '']: 'PRO_MAX',
  [Deno.env.get('VITE_POLAR_PRODUCT_PRO_MAX_YEARLY') || '']: 'PRO_MAX',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const webhookSecret = Deno.env.get('POLAR_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const body = await req.text();
    console.log('Received webhook:', body);

    let event: PolarEvent;

    if (webhookSecret) {
      const signature = req.headers.get('webhook-signature');
      if (!signature) {
        console.error('Missing webhook signature, parsing without validation');
        event = JSON.parse(body) as PolarEvent;
      } else {
        try {
          event = validateEvent(body, signature, webhookSecret) as PolarEvent;
        } catch (validationError) {
          console.error('Webhook validation failed:', validationError);
          event = JSON.parse(body) as PolarEvent;
        }
      }
    } else {
      console.warn('POLAR_WEBHOOK_SECRET not set, skipping validation');
      event = JSON.parse(body) as PolarEvent;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingEvent } = await supabase
      .from('subscription_events')
      .select('id')
      .eq('polar_event_id', event.id)
      .maybeSingle();

    if (existingEvent) {
      console.log('Event already processed:', event.id);
      return new Response(JSON.stringify({ success: true, message: 'Event already processed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Event type:', event.type);
    console.log('Event data:', JSON.stringify(event.data));

    if (!event.type.startsWith('subscription.')) {
      console.log('Ignoring non-subscription event:', event.type);
      return new Response(
        JSON.stringify({ success: true, message: 'Event ignored' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const metadata = event.data.metadata || {};
    const userId = metadata.supabase_user_id;

    console.log('Metadata:', JSON.stringify(metadata));
    console.log('User ID:', userId);

    if (!userId) {
      console.error('No user ID in webhook metadata');
      return new Response(
        JSON.stringify({ error: 'Missing user ID in metadata' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    switch (event.type) {
      case 'subscription.created':
      case 'subscription.updated':
      case 'subscription.active': {
        const subscriptionData = event.data;
        const productId = subscriptionData.product_id;
        const isAudioAddon = metadata.is_audio_addon === 'true';
        const billingCycle = metadata.billing_cycle || 'monthly';

        const updates: Record<string, string | boolean | null> = {};

        if (isAudioAddon) {
          updates.audio_addon_enabled = true;
          updates.audio_addon_subscription_id = subscriptionData.id;
          updates.audio_addon_expires_at = subscriptionData.current_period_end;
          if (!metadata.trial_used) {
            updates.audio_addon_trial_used = true;
          }
        } else {
          updates.polar_subscription_id = subscriptionData.id;
          updates.subscription_status = subscriptionData.status;
          updates.subscription_ends_at = subscriptionData.current_period_end;
          updates.billing_cycle = billingCycle;

          const planType = PRODUCT_TO_PLAN_MAP[productId];
          if (planType) {
            updates.plan_type = planType;
          }
          if (planType === 'PRO_MAX') {
            updates.audio_addon_enabled = true;
          }
        }

        await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId);

        break;
      }

      case 'subscription.canceled': {
        const isAudioAddon = metadata.is_audio_addon === 'true';

        if (isAudioAddon) {
          await supabase
            .from('profiles')
            .update({
              audio_addon_enabled: false,
            })
            .eq('id', userId);
        } else {
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'canceled',
            })
            .eq('id', userId);
        }
        break;
      }

      case 'subscription.revoked': {
        const isAudioAddon = metadata.is_audio_addon === 'true';
        const updates: Record<string, string | boolean | null> = {};

        if (isAudioAddon) {
          updates.audio_addon_enabled = false;
          updates.audio_addon_subscription_id = null;
          updates.audio_addon_expires_at = null;
        } else {
          updates.polar_subscription_id = null;
          updates.subscription_status = null;
          updates.subscription_ends_at = null;
          updates.billing_cycle = null;
          updates.plan_type = 'FREE';
        }

        await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId);
        break;
      }
    }

    await supabase.from('subscription_events').insert({
      user_id: userId,
      event_type: event.type,
      polar_subscription_id: event.data.id,
      polar_event_id: event.id,
      payload: event,
    });

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Webhook processing failed';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error stack:', errorStack);
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: errorStack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});