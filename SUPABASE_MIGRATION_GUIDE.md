# Supabase Migration Guide

## 🎯 Overview

This guide will help you migrate your LearnAI application to the new Supabase instance at `https://jvaeqmmlvfcqtupylibk.supabase.co`.

**Environment variables have already been updated in the `.env` file.**

---

## 📋 Prerequisites

Before starting the migration, ensure you have:

1. Access to your new Supabase project dashboard: https://supabase.com/dashboard/project/jvaeqmmlvfcqtupylibk
2. Your Supabase Service Role Key (found in Project Settings > API)
3. SQL Editor access in the Supabase dashboard

---

## 🗄️ Step 1: Run Database Migrations

You need to execute all 7 migration files in order. Go to **SQL Editor** in your Supabase dashboard and run each migration file one by one:

### Migration 1: Create Initial Schema
**File:** `20251126143444_create_initial_schema.sql`

**What it does:**
- Creates all core database tables (profiles, courses, lessons, notes, user_progress, etc.)
- Sets up Row Level Security (RLS) policies for data protection
- Creates enums for plan types, course levels, subscription status
- Sets up automatic profile creation when users sign up
- Creates indexes for query performance

**Tables created:**
- `profiles` - User profile data with subscription info
- `subscriptions` - Stripe subscription management (legacy, used for tracking)
- `usage_counters` - Monthly usage tracking
- `courses` - Course metadata and outline
- `file_sources` - User-uploaded materials
- `lessons` - Individual lesson content
- `user_progress` - Learning progress tracking
- `notes` - User-saved notes

**⚠️ Copy the entire contents of this file and paste into SQL Editor, then click "Run"**

---

### Migration 2: Fix Security and Performance
**File:** `20251126145151_fix_security_and_performance_issues.sql`

**What it does:**
- Optimizes RLS policies for better query performance
- Adds missing indexes on foreign keys
- Secures database functions against search_path attacks
- Improves security with proper function definitions

**⚠️ Copy the entire contents of this file and paste into SQL Editor, then click "Run"**

---

### Migration 3: Add Subscription Management
**File:** `20251126152756_add_subscription_management.sql`

**What it does:**
- Adds Polar.sh integration columns to profiles table
- Creates `subscription_events` table for webhook logging
- Tracks subscription status, billing cycles, and audio add-on
- Prevents duplicate webhook processing

**New columns in profiles:**
- `polar_customer_id`
- `polar_subscription_id`
- `subscription_status`
- `subscription_ends_at`
- `audio_addon_enabled`
- `audio_addon_trial_used`
- `billing_cycle`

**⚠️ Copy the entire contents of this file and paste into SQL Editor, then click "Run"**

---

### Migration 4: Security Performance Cleanup
**File:** `20251126162548_fix_security_and_performance_issues.sql`

**What it does:**
- Further optimizes RLS policies
- Removes unused indexes to improve write performance
- Cleans up database overhead

**⚠️ Copy the entire contents of this file and paste into SQL Editor, then click "Run"**

---

### Migration 5: Add Theme Preference
**File:** `20251127094536_add_theme_preference.sql`

**What it does:**
- Adds theme customization support (4 themes available)
- Allows users to persist theme preference across devices

**New column in profiles:**
- `theme_preference` - Options: 'pink-light', 'blue-light', 'pink-dark', 'blue-dark'

**⚠️ Copy the entire contents of this file and paste into SQL Editor, then click "Run"**

---

### Migration 6: Add Lesson Editing & Versioning
**File:** `20251128133039_add_lesson_editing_and_versioning.sql`

**What it does:**
- Adds lesson editing capabilities with version history
- Tracks regeneration attempts and custom instructions
- Preserves original AI-generated content

**New columns in lessons:**
- `lesson_status` - draft, generated, edited, approved, needs_regeneration
- `edit_history` - JSON array of all edits
- `regeneration_count` - Number of regeneration attempts
- `custom_instructions` - User instructions for regeneration
- `is_manually_edited` - Boolean flag
- `original_content` - Backup of original AI content

**⚠️ Copy the entire contents of this file and paste into SQL Editor, then click "Run"**

---

### Migration 7: Add Audio Generation Support
**File:** `20251128142056_add_audio_generation_support.sql`

**What it does:**
- Adds audio generation tracking for Murf AI integration
- Creates `audio_generation_jobs` table for bulk audio processing
- Tracks voice type, generation progress, and job status

**New columns in profiles:**
- `audio_addon_expires_at`
- `audio_addon_subscription_id`

**New columns in lessons:**
- `audio_voice_type` - 'male' or 'female'
- `audio_generated_at` - Timestamp of audio generation

**New table: audio_generation_jobs**
- Tracks bulk audio generation progress
- Shows completed/failed lessons
- Stores error messages for debugging

**⚠️ Copy the entire contents of this file and paste into SQL Editor, then click "Run"**

---

## 🪣 Step 2: Create Storage Buckets

The application uses Supabase Storage for audio files. You need to create a storage bucket:

### Create the `lesson-audio` Bucket

1. Go to **Storage** in your Supabase dashboard
2. Click **"New bucket"**
3. Set the following:
   - **Name:** `lesson-audio`
   - **Public bucket:** ✅ **Enabled** (audio files need to be publicly accessible)
   - Click **"Create bucket"**

### Configure Bucket Policies

After creating the bucket, you need to set up access policies:

1. Click on the `lesson-audio` bucket
2. Go to **Policies** tab
3. Click **"New Policy"**

**Policy 1: Allow authenticated users to upload**
- **Policy name:** `Authenticated users can upload audio`
- **Allowed operations:** INSERT
- **Target roles:** authenticated
- **USING expression:** `(bucket_id = 'lesson-audio')`
- **WITH CHECK expression:** `(bucket_id = 'lesson-audio')`

**Policy 2: Allow public read access**
- **Policy name:** `Public read access for audio files`
- **Allowed operations:** SELECT
- **Target roles:** public
- **USING expression:** `(bucket_id = 'lesson-audio')`

---

## 🔐 Step 3: Configure Authentication

### Email/Password Authentication

1. Go to **Authentication** > **Providers**
2. Ensure **Email** is enabled
3. **Disable** "Confirm email" (the app doesn't use email confirmation)
4. Set **Site URL:** `https://learnself.bolt.host`
5. Add **Redirect URLs:**
   - `https://learnself.bolt.host`
   - `https://learnself.bolt.host/login`
   - `https://learnself.bolt.host/signup`
   - `http://localhost:5173` (for local development)

### Password Protection

1. Go to **Authentication** > **Settings**
2. Scroll to **Password Protection**
3. **Enable** "Leaked Password Protection" (checks against HaveIBeenPwned.org)

---

## 🔧 Step 4: Configure Edge Functions

The application uses 8 Supabase Edge Functions. You need to configure environment secrets for them.

### Required Secrets

Go to **Edge Functions** > **Settings** and add these secrets:

1. **MURF_API_KEY**
   - Value: `ap2_003bc8a8-0278-49e8-9049-31d5b5996d6c`
   - Used by: `generate-audio`, `generate-course-audio`

2. **POLAR_ACCESS_TOKEN**
   - Value: `polar_oat_WLskrsu0WnvSXEOhZpUeXxrtshEFkhyBbQYCJ0DifLp`
   - Used by: `polar-webhook`, `polar-checkout`, `polar-portal`

3. **POLAR_WEBHOOK_SECRET**
   - Value: `polar_whs_z2uaj4ahImQ2DIpDzym7BB4FoZAHc19rC7NIJ3rQXR7`
   - Used by: `polar-webhook`

4. **GEMINI_API_KEY** (required for course generation)
   - Value: Your Google Gemini API key
   - Used by: `generate-outline`, `generate-lesson`, `regenerate-lesson`, `update-outline`
   - Get your key from: https://makersuite.google.com/app/apikey
   - Models used: `gemini-2.0-flash-exp` (outline) and `gemini-2.5-flash-lite` (lessons)

**Note:** These secrets are automatically available to all Edge Functions. You don't need to configure them per function.

---

## 🚀 Step 5: Deploy Edge Functions

The application has 8 Edge Functions that need to be deployed:

1. **generate-outline** - Generates course outline from user input
2. **generate-lesson** - Generates individual lesson content
3. **regenerate-lesson** - Regenerates lesson with custom instructions
4. **update-outline** - Updates course outline after user edits
5. **generate-audio** - Generates audio for a single lesson
6. **generate-course-audio** - Bulk generates audio for entire course
7. **polar-checkout** - Creates Polar.sh checkout session
8. **polar-portal** - Generates customer portal link
9. **polar-webhook** - Handles Polar.sh webhook events

### Deployment Options

**Option A: Using the Supabase CLI (Recommended)**

If you have the Supabase CLI installed:

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref jvaeqmmlvfcqtupylibk

# Deploy all functions
supabase functions deploy generate-outline
supabase functions deploy generate-lesson
supabase functions deploy regenerate-lesson
supabase functions deploy update-outline
supabase functions deploy generate-audio
supabase functions deploy generate-course-audio
supabase functions deploy polar-checkout
supabase functions deploy polar-portal
supabase functions deploy polar-webhook
```

**Option B: Manual Deployment via Dashboard**

If you don't have CLI access, the Edge Functions are already coded and will be deployed automatically when the application connects to the new Supabase instance.

---

## ✅ Step 6: Verify the Migration

After completing all steps, verify everything is working:

### 1. Test Authentication
- Sign up with a new account
- Verify profile is created in the `profiles` table
- Check that the trigger works (SQL Editor: `SELECT * FROM profiles;`)

### 2. Test Database Access
- Log in to your application
- Create a test course
- Verify it appears in the `courses` table
- Check that RLS policies work (you can only see your own courses)

### 3. Test Storage
- Generate a course with lessons
- Try generating audio for a lesson
- Verify audio files appear in the `lesson-audio` bucket
- Test that audio playback works

### 4. Test Edge Functions
- Try generating a course outline (should call `generate-outline` function)
- Generate a lesson (should call `generate-lesson` function)
- If you have the audio add-on, test audio generation

### 5. Test Subscriptions
- Go to Settings > Subscription
- Try upgrading to a paid plan
- Verify the webhook is called and subscription is updated

---

## 🔄 Step 7: Migrate Existing Data (Optional)

If you have existing data in the old Supabase instance, you'll need to migrate it:

### Export from Old Database

1. Go to your old Supabase dashboard
2. SQL Editor > New Query
3. Export each table:

```sql
-- Export profiles
SELECT * FROM profiles;

-- Export courses
SELECT * FROM courses;

-- Export lessons
SELECT * FROM lessons;

-- Export user_progress
SELECT * FROM user_progress;

-- Export notes
SELECT * FROM notes;
```

4. Save the results as CSV files

### Import to New Database

1. Go to your new Supabase dashboard
2. Table Editor > Select table
3. Click "Insert" > "Import data"
4. Upload the CSV files

**⚠️ Important:** You'll need to handle user authentication separately. Users will need to sign up again, or you can migrate `auth.users` data using pg_dump/restore.

---

## 🐛 Troubleshooting

### Issue: "Profile not found" error
**Solution:** The `handle_new_user()` trigger might not have fired. Manually insert a profile:
```sql
INSERT INTO profiles (id, email, plan_type)
VALUES ('user-uuid-here', 'user@email.com', 'FREE');
```

### Issue: "Access denied" or RLS errors
**Solution:** Verify RLS policies are enabled:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```
All tables should have `rowsecurity = true`

### Issue: Edge Functions not working
**Solution:**
1. Check that secrets are configured (Edge Functions > Settings)
2. Check function logs (Edge Functions > Select function > Logs)
3. Verify CORS headers are set correctly

### Issue: Storage upload fails
**Solution:**
1. Verify bucket exists and is public
2. Check storage policies are configured
3. Ensure authenticated users have INSERT permission

### Issue: Audio generation fails
**Solution:**
1. Verify MURF_API_KEY is set in Edge Function secrets
2. Check `audio_generation_jobs` table for error messages
3. Verify lessons have `markdown_content` populated

---

## 📝 Environment Variables Summary

The following environment variables are already configured in your `.env` file:

```env
# New Supabase Instance
VITE_SUPABASE_URL=https://jvaeqmmlvfcqtupylibk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2YWVxbW1sdmZjcXR1cHlsaWJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0Nzk5MzQsImV4cCI6MjA4MDA1NTkzNH0.BJlmPmbhkECjXyGxRkskq_g0U3WB9R01EBGV8KbgiQw

# Application
VITE_APP_URL=https://learnself.bolt.host

# Polar.sh (Payment Provider)
POLAR_ACCESS_TOKEN=polar_oat_WLskrsu0WnvSXEOhZpUeXxrtshEFkhyBbQYCJ0DifLp
POLAR_WEBHOOK_SECRET=polar_whs_z2uaj4ahImQ2DIpDzym7BB4FoZAHc19rC7NIJ3rQXR7
VITE_POLAR_ORGANIZATION_ID=41d48a22-3a03-4c73-b9f9-71f74c51dcd5

# Polar Product IDs
VITE_POLAR_PRODUCT_PLUS_MONTHLY=ac1d48a3-04d9-4045-8c6e-e98facf247b4
VITE_POLAR_PRODUCT_PLUS_YEARLY=915aa2d2-848a-49c6-bb99-48eb3834a8bd
VITE_POLAR_PRODUCT_PRO_MONTHLY=dfd2624b-7ace-4d43-84ce-3cbbe9013c1e
VITE_POLAR_PRODUCT_PRO_YEARLY=11417160-dcf3-44f2-8fc5-c4c82651cc99
VITE_POLAR_PRODUCT_PRO_MAX_MONTHLY=da024e59-0c53-4e2f-91e5-d42a127b2fcb
VITE_POLAR_PRODUCT_PRO_MAX_YEARLY=da024e59-0c53-4e2f-91e5-d42a127b2fcb
VITE_POLAR_PRODUCT_AUDIO_ADDON=f6f2d157-3d2f-4f29-8839-8d62447999d8

# Murf AI (Text-to-Speech)
MURF_API_KEY=ap2_003bc8a8-0278-49e8-9049-31d5b5996d6c
```

---

## 🎉 Migration Complete!

Once you've completed all steps, your application should be fully migrated to the new Supabase instance. The frontend will automatically connect to the new database using the updated environment variables.

### Next Steps:

1. Test all features thoroughly
2. Monitor Edge Function logs for any errors
3. Set up database backups in Supabase dashboard
4. Configure alerts for critical errors
5. Update your Polar.sh webhook URL to point to the new Edge Function

**New Webhook URL for Polar.sh:**
```
https://jvaeqmmlvfcqtupylibk.supabase.co/functions/v1/polar-webhook
```

---

## 📞 Support

If you encounter issues during migration:

1. Check the Supabase logs (Dashboard > Logs)
2. Review Edge Function logs (Edge Functions > Function name > Logs)
3. Check browser console for frontend errors
4. Verify all migration files ran successfully

For urgent issues, refer to the troubleshooting section above.
