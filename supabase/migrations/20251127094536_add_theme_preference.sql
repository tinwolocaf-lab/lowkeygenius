/*
  # Add Theme Preference Support

  ## Overview
  Adds theme preference functionality to support 4 themes (pink-light, blue-light, pink-dark, blue-dark)
  that persists across sessions and devices for authenticated users.

  ## Changes to `profiles` Table
    - Add `theme_preference` column (text) with constraint for valid values
    - Default value: 'pink-light' to maintain current design
    - Allow users to update their own theme preference via RLS

  ## Security
    - Existing RLS policies on profiles table automatically cover theme_preference updates
    - Users can only update their own theme preference

  ## Notes
    - Theme preference will sync across devices for authenticated users
    - Non-authenticated users will use localStorage for theme persistence
*/

-- Add theme_preference column with constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'theme_preference'
  ) THEN
    ALTER TABLE profiles
    ADD COLUMN theme_preference text NOT NULL DEFAULT 'pink-light'
    CHECK (theme_preference IN ('pink-light', 'blue-light', 'pink-dark', 'blue-dark'));
  END IF;
END $$;

-- Create index for theme preference queries (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_profiles_theme_preference
  ON profiles(theme_preference);