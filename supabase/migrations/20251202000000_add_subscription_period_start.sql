-- Add subscription_period_start to track when the current billing cycle started
-- This is used to calculate course limits for subscribed users
-- FREE users have lifetime limits (no period tracking needed)
-- Subscribed users (PLUS, PRO) have limits that reset each billing cycle

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_period_start timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN profiles.subscription_period_start IS 'Start of current subscription billing period. Used to calculate course limits for subscribed users.';
