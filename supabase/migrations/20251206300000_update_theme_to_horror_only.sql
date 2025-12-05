/*
  # Update Theme Preference to Horror Only

  This migration updates the theme system to only support the horror theme
  for the Kiroween Halloween hackathon costume contest entry.

  ## Changes
  1. Drop the old constraint first (to allow 'horror' value)
  2. Update all existing theme_preference values to 'horror'
  3. Add new constraint that only allows 'horror'
  4. Update the default value to 'horror'
*/

-- Step 1: Drop the existing constraint first
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_theme_preference_check;

-- Step 2: Update all existing users to use horror theme
UPDATE profiles
SET theme_preference = 'horror'
WHERE theme_preference != 'horror' OR theme_preference IS NULL;

-- Step 3: Add new constraint that only allows 'horror'
ALTER TABLE profiles
ADD CONSTRAINT profiles_theme_preference_check
CHECK (theme_preference = 'horror');

-- Step 4: Update the default value to 'horror'
ALTER TABLE profiles
ALTER COLUMN theme_preference SET DEFAULT 'horror';
