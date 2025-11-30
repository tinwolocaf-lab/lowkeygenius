# 🚀 Quick Migration Checklist

Use this checklist to track your progress migrating to the new Supabase instance.

## ✅ Pre-Migration
- [ ] Access new Supabase dashboard at https://supabase.com/dashboard/project/jvaeqmmlvfcqtupylibk
- [ ] Get Service Role Key from Project Settings > API
- [ ] Review `SUPABASE_MIGRATION_GUIDE.md` for full details

## ✅ Database Setup

### Run Migrations (in order)
- [ ] Migration 1: `20251126143444_create_initial_schema.sql` (Core tables)
- [ ] Migration 2: `20251126145151_fix_security_and_performance_issues.sql` (Security)
- [ ] Migration 3: `20251126152756_add_subscription_management.sql` (Polar.sh)
- [ ] Migration 4: `20251126162548_fix_security_and_performance_issues.sql` (Cleanup)
- [ ] Migration 5: `20251127094536_add_theme_preference.sql` (Themes)
- [ ] Migration 6: `20251128133039_add_lesson_editing_and_versioning.sql` (Editing)
- [ ] Migration 7: `20251128142056_add_audio_generation_support.sql` (Audio)

### Verify Migrations
- [ ] Check all tables exist: `SELECT * FROM information_schema.tables WHERE table_schema = 'public';`
- [ ] Verify RLS is enabled on all tables
- [ ] Test trigger: Sign up and check profile is auto-created

## ✅ Storage Setup
- [ ] Create `lesson-audio` bucket (public)
- [ ] Add policy: "Authenticated users can upload audio"
- [ ] Add policy: "Public read access for audio files"

## ✅ Authentication Setup
- [ ] Enable Email/Password authentication
- [ ] Disable email confirmation
- [ ] Set Site URL: `https://learnself.bolt.host`
- [ ] Add redirect URLs (production + localhost)
- [ ] Enable "Leaked Password Protection"

## ✅ Edge Function Secrets
- [ ] Add `MURF_API_KEY`: `ap2_003bc8a8-0278-49e8-9049-31d5b5996d6c`
- [ ] Add `POLAR_ACCESS_TOKEN`: `polar_oat_WLskrsu0WnvSXEOhZpUeXxrtshEFkhyBbQYCJ0DifLp`
- [ ] Add `POLAR_WEBHOOK_SECRET`: `polar_whs_z2uaj4ahImQ2DIpDzym7BB4FoZAHc19rC7NIJ3rQXR7`
- [ ] Add `OPENAI_API_KEY` (your key)

## ✅ Deploy Edge Functions
- [ ] `generate-outline`
- [ ] `generate-lesson`
- [ ] `regenerate-lesson`
- [ ] `update-outline`
- [ ] `generate-audio`
- [ ] `generate-course-audio`
- [ ] `polar-checkout`
- [ ] `polar-portal`
- [ ] `polar-webhook`

## ✅ Testing

### Basic Functionality
- [ ] Sign up creates profile automatically
- [ ] Login works
- [ ] Can create a course
- [ ] Can view course outline
- [ ] Lessons are generated successfully

### Audio Features (if audio add-on enabled)
- [ ] Single lesson audio generation works
- [ ] Bulk audio generation works
- [ ] Audio files upload to storage
- [ ] Audio playback works in browser

### Subscription Features
- [ ] Can view pricing page
- [ ] Can create checkout session
- [ ] Webhook updates subscription status
- [ ] Can access customer portal

### Security
- [ ] Can only see own courses
- [ ] Can only edit own lessons
- [ ] Can't access other users' data
- [ ] RLS policies work correctly

## ✅ Polar.sh Configuration
- [ ] Update webhook URL to new Edge Function: `https://jvaeqmmlvfcqtupylibk.supabase.co/functions/v1/polar-webhook`
- [ ] Test webhook by creating a test subscription
- [ ] Verify subscription status updates in database

## ✅ Final Steps
- [ ] Build frontend: `npm run build`
- [ ] Deploy to production
- [ ] Monitor logs for errors
- [ ] Set up database backups
- [ ] Configure monitoring/alerts

## 📊 Migration Status

**Environment Variables:** ✅ Updated in `.env` file
**Database:** ⏳ Pending (run migrations)
**Storage:** ⏳ Pending (create bucket)
**Auth:** ⏳ Pending (configure)
**Edge Functions:** ⏳ Pending (deploy)
**Testing:** ⏳ Pending

---

## 🆘 Quick Troubleshooting

**Can't create profile?**
```sql
-- Manually create profile
INSERT INTO profiles (id, email, plan_type)
VALUES ('user-uuid', 'email@example.com', 'FREE');
```

**RLS blocking access?**
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

**Edge Function failing?**
1. Check logs: Edge Functions > [Function] > Logs
2. Verify secrets are set
3. Check CORS headers

**Storage upload fails?**
1. Verify bucket is public
2. Check policies are configured
3. Ensure authenticated user has INSERT permission

---

## 📚 Resources

- **Full Migration Guide:** `SUPABASE_MIGRATION_GUIDE.md`
- **Supabase Dashboard:** https://supabase.com/dashboard/project/jvaeqmmlvfcqtupylibk
- **Supabase Docs:** https://supabase.com/docs
- **Edge Functions Docs:** https://supabase.com/docs/guides/functions
