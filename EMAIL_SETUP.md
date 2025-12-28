# Daily Email Setup

This document explains how to set up the daily market overview email workflow.

## Overview

The system generates and sends a daily market overview email to specified recipients at 10 AM every day. The email includes:
- TradingView market heatmap screenshot
- Prestock token performance data
- AI-generated market insights from Perplexity

## Environment Variables

Add the following environment variables to your `.env.local` file or deployment platform:

```bash
# Required: Resend API key for sending emails
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Required: Perplexity API key for market insights
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxx

# Optional: Email sender configuration
EMAIL_FROM=noreply@vaulto.ai
EMAIL_FROM_NAME=Vaulto

# Optional: Cron secret for securing the cron endpoint (recommended for production)
CRON_SECRET=your-random-secret-key-here
```

### Getting API Keys

1. **Resend API Key**: Sign up at [resend.com](https://resend.com) and create an API key in the dashboard
2. **Perplexity API Key**: Sign up at [perplexity.ai](https://perplexity.ai) and get your API key

## API Endpoints

### 1. Generate Email Preview
`GET /api/email/market-overview`
- Generates and returns the HTML email (preview only, doesn't send)

### 2. Send Email Manually
`POST /api/email/send`
- Generates and sends the email to the default recipients
- Can accept custom recipients in the request body (optional):
```json
{
  "recipients": [
    { "email": "charliebc@vaulto.ai" },
    { "email": "david@vaulto.ai" }
  ]
}
```

### 3. Cron Endpoint (Automatic)
`GET /api/cron/send-daily-email`
- Called automatically by Vercel Cron at 10 AM UTC daily
- Can also be called manually for testing
- If `CRON_SECRET` is set, requires `Authorization: Bearer <CRON_SECRET>` header

## Vercel Cron Setup

The `vercel.json` file is configured to run the cron job at 10 AM UTC every day. 

**Note**: The cron schedule uses UTC time. If you need a different timezone, adjust the schedule in `vercel.json`:
- 10 AM EST: `"0 14 * * *"` (EST is UTC-4, but check for daylight saving)
- 10 AM PST: `"0 18 * * *"` (PST is UTC-8, but check for daylight saving)

After deploying to Vercel:
1. The cron job will automatically be registered
2. You can view cron executions in the Vercel dashboard under "Cron Jobs"
3. The cron job runs at the specified time daily

## Current Recipients

The email is sent to:
- charliebc@vaulto.ai
- david@vaulto.ai

To change recipients, edit the `RECIPIENTS` array in `app/api/cron/send-daily-email/route.ts` or pass custom recipients to the `/api/email/send` endpoint.

## Testing

### Test Email Generation
```bash
curl http://localhost:3000/api/email/market-overview
```

### Test Email Sending (Manual)
```bash
curl -X POST http://localhost:3000/api/email/send
```

### Test Cron Endpoint
```bash
curl http://localhost:3000/api/cron/send-daily-email
# Or with auth header if CRON_SECRET is set:
curl -H "Authorization: Bearer your-secret" http://localhost:3000/api/cron/send-daily-email
```

## Troubleshooting

### Email not sending
- Check that `RESEND_API_KEY` is set correctly
- Verify the sender email domain is verified in Resend
- Check Resend dashboard for delivery logs

### Market insights not generating
- Verify `PERPLEXITY_API_KEY` is set correctly
- Check API rate limits and quota

### Cron not running
- Verify `vercel.json` is in the project root
- Check Vercel dashboard for cron job status
- Ensure the deployment includes the cron endpoint

