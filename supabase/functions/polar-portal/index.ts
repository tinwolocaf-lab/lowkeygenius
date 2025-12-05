import { Polar } from 'npm:@polar-sh/sdk@0.41.5';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import {
  getCorsHeaders,
  validateAuth,
  createErrorResponse,
  createUnauthorizedResponse,
  sanitizeErrorMessage,
} from '../_shared/security.ts';

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin, 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const polarAccessToken = Deno.env.get('POLAR_ACCESS_TOKEN');

    // Validate required environment variables
    if (!supabaseUrl || !supabaseServiceKey || !polarAccessToken) {
      console.error('Missing required environment variables');
      return createErrorResponse(
        'Server configuration error',
        500,
        corsHeaders,
        'INTERNAL_ERROR'
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate authentication (Requirements 1.1, 1.2)
    const authResult = await validateAuth(req, supabase);
    if (authResult.error || !authResult.user) {
      return createUnauthorizedResponse(corsHeaders, authResult.error || 'Unauthorized');
    }

    const userId = authResult.user.id;

    // Get user's Polar customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('polar_customer_id')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Failed to fetch profile:', profileError);
      return createErrorResponse(
        'Failed to fetch user profile',
        500,
        corsHeaders,
        'INTERNAL_ERROR'
      );
    }

    if (!profile?.polar_customer_id) {
      return createErrorResponse(
        'No customer record found',
        404,
        corsHeaders,
        'NOT_FOUND'
      );
    }

    // Create Polar customer portal session
    const polar = new Polar({
      accessToken: polarAccessToken,
    });

    const session = await polar.customerSessions.create({
      customerId: profile.polar_customer_id,
    });

    return new Response(
      JSON.stringify({ url: session.customerPortalUrl }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    // Log error but don't expose internal details (Requirement 7.2)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Customer portal error:', errorMessage);
    
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    
    return createErrorResponse(
      sanitizeErrorMessage(errorMessage),
      500,
      corsHeaders,
      'INTERNAL_ERROR'
    );
  }
});
