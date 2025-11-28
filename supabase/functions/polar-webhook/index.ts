import { validateEvent } from 'npm:@polar-sh/sdk@0.41.5/webhooks';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, webhook-signature',
};

interface PolarEvent {
  type: string;
  data: any;
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
        const subscription = event.data;
        const productId = subscription.product_id;
        const isAudioAddon = metadata.is_audio_addon === 'true';
        const billingCycle = metadata.billing_cycle || 'monthly';

        const updates: any = {
          polar_subscription_id: subscription.id,
          subscription_status: subscription.status,
          subscription_ends_at: subscription.current_period_end,
          billing_cycle: billingCycle,
        };

        if (isAudioAddon) {
          updates.audio_addon_enabled = true;
          if (!metadata.trial_used) {
            updates.audio_addon_trial_used = true;
          }
        } else {
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
        const subscription = event.data;
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'canceled',
          })
          .eq('id', userId);
        break;
      }

      case 'subscription.revoked': {
        const isAudioAddon = metadata.is_audio_addon === 'true';
        const updates: any = {
          polar_subscription_id: null,
          subscription_status: null,
          subscription_ends_at: null,
          billing_cycle: null,
        };

        if (isAudioAddon) {
          updates.audio_addon_enabled = false;
        } else {
          updates.plan_type = 'FREE';
          updates.audio_addon_enabled = false;
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
  } catch (error) {
    console.error('Webhook error:', error);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({
        error: error.message || 'Webhook processing failed',
        details: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});