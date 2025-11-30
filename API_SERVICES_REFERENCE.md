# API Services Reference

## 🧠 AI Services Used

### Google Gemini AI (Course Content Generation)

**Purpose:** Generates course outlines and lesson content

**API Key Required:** `GEMINI_API_KEY`
- Get your key from: https://makersuite.google.com/app/apikey
- Or: https://aistudio.google.com/apikey

**Models Used:**
- **Outline Generation:** `gemini-2.0-flash-exp`
  - Used by: `generate-outline` Edge Function
  - Faster, optimized for structured output (JSON)

- **Lesson Generation:** `gemini-2.5-flash-lite`
  - Used by: `generate-lesson`, `regenerate-lesson` Edge Functions
  - Optimized for longer content generation (markdown)

**Edge Functions using Gemini:**
1. `generate-outline` - Creates course structure with modules and lessons
2. `generate-lesson` - Generates detailed lesson content in markdown
3. `regenerate-lesson` - Regenerates lesson with user's custom instructions
4. `update-outline` - Updates course outline after user edits

---

### Murf AI (Text-to-Speech)

**Purpose:** Converts lesson text to natural-sounding audio

**API Key Required:** `MURF_API_KEY`
- Get your key from: https://murf.ai/
- Dashboard: https://app.murf.ai/

**Voices Used:**
- **Female Voice:** `en-US-natalie` (Narration style)
- **Male Voice:** `en-US-cooper` (Narration style)

**Technical Details:**
- Output format: MP3
- Sample rate: 44100 Hz
- Character limit: 3000 chars per request
- Solution: Automatically chunks long lessons into ~2800 char segments

**Edge Functions using Murf AI:**
1. `generate-audio` - Generates audio for a single lesson
2. `generate-course-audio` - Bulk generates audio for all lessons in a course

---

### Polar.sh (Payment & Subscriptions)

**Purpose:** Handles subscription payments and customer management

**API Keys Required:**
- `POLAR_ACCESS_TOKEN` - For API authentication
- `POLAR_WEBHOOK_SECRET` - For webhook signature verification

**Dashboard:** https://polar.sh/dashboard

**Edge Functions using Polar:**
1. `polar-checkout` - Creates checkout session for subscriptions
2. `polar-portal` - Generates customer portal link for managing subscriptions
3. `polar-webhook` - Receives and processes subscription events

**Subscription Tiers:**
- FREE - Limited courses
- PLUS - More courses
- PRO - Advanced features
- PRO MAX - Unlimited + audio
- Audio Add-on - Can be added to any tier

---

## 📦 Edge Function Summary

| Function | AI Service | Purpose |
|----------|-----------|---------|
| `generate-outline` | Gemini 2.0 Flash | Create course outline |
| `generate-lesson` | Gemini 2.5 Flash Lite | Generate lesson content |
| `regenerate-lesson` | Gemini 2.5 Flash Lite | Regenerate with custom instructions |
| `update-outline` | Gemini 2.0 Flash | Update course structure |
| `generate-audio` | Murf AI | Single lesson audio |
| `generate-course-audio` | Murf AI | Bulk audio generation |
| `polar-checkout` | Polar.sh | Create payment session |
| `polar-portal` | Polar.sh | Customer portal link |
| `polar-webhook` | Polar.sh | Process payment events |

---

## 🔐 Supabase Edge Function Secrets

All secrets must be configured in: **Supabase Dashboard > Edge Functions > Settings**

### Required Secrets:

```bash
# Google Gemini AI
GEMINI_API_KEY=your_google_gemini_api_key_here

# Murf AI Text-to-Speech
MURF_API_KEY=your_murf_api_key_here

# Polar.sh Payments
POLAR_ACCESS_TOKEN=your_polar_access_token_here
POLAR_WEBHOOK_SECRET=your_polar_webhook_secret_here
```

**Note:** These secrets are automatically available to ALL Edge Functions. You don't need to configure them per function.

---

## 🌐 API Endpoints

### Gemini AI
```
Base URL: https://generativelanguage.googleapis.com/v1beta/models/
Endpoint: {model}:generateContent?key={GEMINI_API_KEY}
```

### Murf AI
```
Base URL: https://api.murf.ai/v1
Endpoint: /speech/generate
Authentication: api-key header
```

### Polar.sh
```
Base URL: https://api.polar.sh/v1
Authentication: Bearer token in header
```

---

## 💰 Cost Considerations

### Gemini AI (Google)
- **Free Tier:** 15 requests per minute, 1 million tokens per day
- **Paid Tier:** Pay per token (very affordable)
- **Recommendation:** Free tier is sufficient for most use cases

### Murf AI
- **Free Trial:** 10 minutes of audio generation
- **Paid Plans:** Starting at $19/month for 24 hours of audio
- **Usage:** ~20,000 characters = ~30 minutes of audio

### Polar.sh
- **Free:** No monthly fees
- **Commission:** 5% + Stripe fees on transactions
- **Webhook:** Free

---

## 🔄 Webhook Configuration

### Polar.sh Webhook URL
After deploying Edge Functions, update your Polar webhook URL:

```
https://jvaeqmmlvfcqtupylibk.supabase.co/functions/v1/polar-webhook
```

**Events to subscribe to:**
- `subscription.created`
- `subscription.updated`
- `subscription.cancelled`
- `checkout.created`
- `checkout.updated`

---

## 📊 Rate Limits

### Gemini AI
- Free: 15 RPM (requests per minute)
- Paid: 360 RPM

### Murf AI
- Rate limit: Not publicly documented
- Implemented: 500ms delay between requests in bulk generation

### Polar.sh
- Rate limit: 100 requests per second (generous)

---

## 🐛 Common API Errors

### Gemini API Errors

**Error 429 - Rate Limit:**
```
Solution: Wait 60 seconds or upgrade to paid tier
```

**Error 400 - Invalid Request:**
```
Solution: Check prompt format and model name
```

### Murf AI Errors

**Error 400 - Text too long:**
```
Solution: Already handled - text is auto-chunked to 2800 chars
```

**Error 401 - Invalid API Key:**
```
Solution: Verify MURF_API_KEY in Edge Function secrets
```

### Polar.sh Errors

**Error 401 - Unauthorized:**
```
Solution: Verify POLAR_ACCESS_TOKEN is correct
```

**Webhook signature mismatch:**
```
Solution: Check POLAR_WEBHOOK_SECRET matches dashboard
```

---

## ✅ Testing APIs

### Test Gemini AI
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=YOUR_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Say hello"}]}]}'
```

### Test Murf AI
```bash
curl -X POST "https://api.murf.ai/v1/speech/generate" \
  -H "api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world","voiceId":"en-US-natalie","format":"MP3"}'
```

### Test Polar.sh
```bash
curl "https://api.polar.sh/v1/subscriptions" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📝 Best Practices

1. **Never commit API keys** - Use environment variables
2. **Rotate keys regularly** - Security best practice
3. **Monitor usage** - Set up alerts for quota limits
4. **Handle errors gracefully** - Provide user-friendly messages
5. **Log all API calls** - For debugging and monitoring
6. **Cache when possible** - Reduce API costs
7. **Use webhooks** - Don't poll for subscription updates

---

## 🔗 Useful Links

- **Gemini AI Docs:** https://ai.google.dev/docs
- **Murf AI Docs:** https://murf.ai/api-docs
- **Polar.sh Docs:** https://docs.polar.sh/
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
