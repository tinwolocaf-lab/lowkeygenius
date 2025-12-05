import { validateEvent } from 'npm:@polar-sh/sdk@0.41.5/webhooks';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { getCorsHeaders, getSafeErrorMessage } from '../_shared/security.ts';

interface PolarSubscriptionData {
  id: string;
  product_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  metadata?: Record<string, string>;
}

interface PolarEvent {
  type: string;
  data: PolarSubscriptionData;
  id: string;
}

interface WebhookValidationResult {
  valid: boolean;
  event?: PolarEvent;
  error?: string;
}

const PRODUCT_TO_PLAN_MAP: Record<string, string> = {
  [Deno.env.get('VITE_POLAR_PRODUCT_PLUS_MONTHLY') || '']: 'PLUS',
  [Deno.env.get('VITE_POLAR_PRODUCT_PLUS_YEARLY') || '']: 'PLUS',
  [Deno.env.get('VITE_POLAR_PRODUCT_PRO_MONTHLY') || '']: 'PRO',
  [Deno.env.get('VITE_POLAR_PRODUCT_PRO_YEARLY') || '']: 'PRO',
  [Deno.env.get('VITE_POLAR_PRODUCT_PRO_MAX_MONTHLY') || '']: 'PRO_MAX',
  [Deno.env.get('VITE_POLAR_PRODUCT_PRO_MAX_YEARLY') || '']: 'PRO_MAX',
};

/**
 * Validate webhook signature
 * Requirements: 6.1, 6.2, 6.4
 * 
 * When secret is configured, signature validation is mandatory.
 * When secret is not configured, logs a warning and operates in degraded mode.
 */
function validateWebhookSignature(
  body: string,
  signature: string | null,
  secret: string | null
): WebhookValidationResult {
  // If no secret configured, operate in degraded mode with warning (Requirement 6.4)
  if (!secret) {
    console.warn('POLAR_WEBHOOK_SECRET not configured - webhook validation disabled (degraded security mode)');
    try {
      const event = JSON.parse(body) as PolarEvent;
      return { valid: true, event };
    } catch {
      return { valid: false, error: 'Invalid JSON payload' };
    }
  }

  // Secret is configured - signature validation is mandatory (Requirement 6.1)
  if (!signature) {
    console.error('Webhook validation failed: Missing signature header');
    return { valid: false, error: 'Missing webhook signature' };
  }

  try {
    const event = validateEvent(body, signature, secret) as PolarEvent;
    return { valid: true, event };
  } catch (validationError) {
    // Log failed validation attempt (Requirement 6.2)
    const errorMessage = validationError instanceof Error ? validationError.message : 'Unknown validation error';
    console.error(`Webhook signature validation failed: ${errorMessage}`);
    return { valid: false, error: 'Invalid webhook signature' };
  }
}

/**
 * Create a hash of the payload for logging (without exposing sensitive data)
 */
function hashPayloadForLogging(body: string): string {
  // Simple hash for logging purposes - just use first/last chars and length
  if (body.length < 20) return `[payload:${body.length}chars]`;
  return `[payload:${body.length}chars,start:${body.substring(0, 10)}...]`;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  // Webhooks typically don't need CORS, but include for consistency
  const corsHeaders = getCorsHeaders(origin, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const webhookSecret = Deno.env.get('POLAR_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body = await req.text();
    const signature = req.headers.get('webhook-signature');

    // Validate webhook signature FIRST (Requirements 6.1, 6.2)
    const validationResult = validateWebhookSignature(body, signature, webhookSecret);
    
    if (!validationResult.valid) {
      // Log the failed attempt with context (Requirement 6.2)
      const sourceIP = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
      console.error(`Webhook validation rejected: source=${sourceIP}, payload=${hashPayloadForLogging(body)}`);
      
      return new Response(
        JSON.stringify({ error: validationResult.error }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const event = validationResult.event!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Idempotency check BEFORE processing (Requirement 6.3)
    const { data: existingEvent, error: idempotencyError } = await supabase
      .from('subscription_events')
      .select('id')
      .eq('polar_event_id', event.id)
      .maybeSingle();

    if (idempotencyError) {
      console.error('Idempotency check failed:', idempotencyError);
      // Continue processing - better to risk duplicate than fail
    }

    if (existingEvent) {
      console.log('Event already processed (idempotency check):', event.id);
      return new Response(JSON.stringify({ success: true, message: 'Event already processed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing webhook event:', event.type, 'id:', event.id);

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

    if (!userId) {
      console.error('No user ID in webhook metadata for event:', event.id);
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
          updates.subscription_period_start = subscriptionData.current_period_start;
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

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId);

        if (updateError) {
          console.error('Failed to update profile:', updateError);
        }

        break;
      }

      case 'subscription.canceled': {
        const isAudioAddon = metadata.is_audio_addon === 'true';

        const { error: updateError } = await supabase
          .from('profiles')
          .update(isAudioAddon 
            ? { audio_addon_enabled: false }
            : { subscription_status: 'canceled' }
          )
          .eq('id', userId);

        if (updateError) {
          console.error('Failed to update profile on cancellation:', updateError);
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
          updates.subscription_period_start = null;
          updates.subscription_ends_at = null;
          updates.billing_cycle = null;
          updates.plan_type = 'FREE';
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId);

        if (updateError) {
          console.error('Failed to update profile on revocation:', updateError);
        }
        break;
      }
    }

    // Record the event for idempotency (Requirement 6.3)
    const { error: insertError } = await supabase.from('subscription_events').insert({
      user_id: userId,
      event_type: event.type,
      polar_subscription_id: event.data.id,
      polar_event_id: event.id,
      payload: event,
    });

    if (insertError) {
      console.error('Failed to record subscription event:', insertError);
      // Don't fail the webhook - the subscription update already succeeded
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    // Log error but don't expose internal details (Requirement 7.2)
    console.error('Webhook processing error:', error);
    
    // Use getSafeErrorMessage to ensure no stack traces or internal paths are exposed
    return new Response(
      JSON.stringify({ error: getSafeErrorMessage(error, 'Webhook processing failed') }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
