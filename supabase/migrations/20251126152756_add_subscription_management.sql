/*
  # Add Subscription Management for Polar.sh Integration

  ## Overview
  This migration adds comprehensive subscription management capabilities to support 
  Polar.sh payment integration with multiple subscription tiers and audio add-on feature.

  ## 1. New Columns Added to `profiles` Table
    - `polar_customer_id` (text, nullable) - Links user to Polar customer record
    - `polar_subscription_id` (text, nullable) - Current active subscription ID in Polar
    - `subscription_status` (text, nullable) - Subscription state: active, canceled, past_due, etc.
    - `subscription_ends_at` (timestamptz, nullable) - When current subscription period ends
    - `audio_addon_enabled` (boolean, default false) - Whether audio generation is enabled
    - `audio_addon_trial_used` (boolean, default false) - Track if 7-day audio trial was used
    - `billing_cycle` (text, nullable) - Payment frequency: monthly or yearly

  ## 2. New Table: `subscription_events`
    - Logs all webhook events from Polar for audit trail and debugging
    - Prevents duplicate event processing using unique polar_event_id
    - Stores full payload for troubleshooting

  ## 3. Indexes
    - Index on polar_customer_id for fast customer lookups
    - Index on polar_subscription_id for quick subscription queries
    - Index on user_id in subscription_events for event history

  ## 4. Security
    - Enable RLS on subscription_events table
    - Users can only view their own subscription events
    - Only authenticated users can access subscription data

  ## 5. Important Notes
    - Subscription status follows Polar's event lifecycle
    - Audio add-on trial tracked to prevent abuse (one trial per user)
    - Billing cycle determines pricing (yearly gets 20% discount)
    - Subscription events provide complete audit trail
*/

-- Add subscription-related columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS polar_customer_id text,
ADD COLUMN IF NOT EXISTS polar_subscription_id text,
ADD COLUMN IF NOT EXISTS subscription_status text,
ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz,
ADD COLUMN IF NOT EXISTS audio_addon_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS audio_addon_trial_used boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS billing_cycle text;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_polar_customer_id ON profiles(polar_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_polar_subscription_id ON profiles(polar_subscription_id);

-- Create subscription_events table for webhook logging
CREATE TABLE IF NOT EXISTS subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  polar_subscription_id text,
  polar_event_id text UNIQUE NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create index on user_id for event history queries
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_polar_subscription_id ON subscription_events(polar_subscription_id);

-- Enable RLS on subscription_events
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own subscription events
CREATE POLICY "Users can view own subscription events"
  ON subscription_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Service role can insert subscription events (for webhooks)
CREATE POLICY "Service role can insert subscription events"
  ON subscription_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);