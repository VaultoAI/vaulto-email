# Netlify Cron Job Setup Prompt for Comet

## Context

I have a Next.js application deployed on Netlify that needs to run a scheduled cron job daily at 10 AM UTC. The application already has a Next.js API route endpoint that handles the email generation and sending logic. I need you to set up Netlify's scheduled functions to call this endpoint automatically.

## Current Setup

### Existing API Endpoint
The application has a Next.js API route at: `/api/cron/send-daily-email`

**Location**: `app/api/cron/send-daily-email/route.ts`

**Details**:
- Handles GET and POST requests
- Generates and sends a daily market overview email
- Sends emails to: `charliebc@vaulto.ai` and `david@vaulto.ai`
- Uses Resend API for sending emails
- Includes authentication via `CRON_SECRET` environment variable (optional)
- Returns JSON response with success/error status

**Current Authentication**:
- The endpoint checks for `Authorization: Bearer <CRON_SECRET>` header if `CRON_SECRET` env var is set
- If no `CRON_SECRET` is set, the endpoint accepts requests without authentication

### Project Structure
```
/app
  /api
    /cron
      /send-daily-email
        route.ts  (Next.js API route)
/lib
  /email
    generate-email.ts  (Email generation logic)
    send-email.ts      (Email sending via Resend)
```

### Environment Variables Required
These should be configured in Netlify's Environment Variables dashboard:
- `RESEND_API_KEY` - Required: Resend API key for sending emails
- `PERPLEXITY_API_KEY` - Required: Perplexity API key for market insights
- `EMAIL_FROM` - Optional (defaults to noreply@vaulto.ai)
- `EMAIL_FROM_NAME` - Optional (defaults to Vaulto)
- `CRON_SECRET` - Optional but recommended for securing the endpoint (generate a random secret)

## What I Need You To Do

### 1. Create Netlify Scheduled Function

Create a Netlify scheduled function that will:
- Run daily at 10 AM UTC (cron expression: `0 10 * * *`)
- Make an HTTP GET request to the Next.js API route: `/api/cron/send-daily-email`
- Include the `Authorization: Bearer <CRON_SECRET>` header if `CRON_SECRET` is set
- Handle errors and log responses appropriately

**Requirements**:
- The function should be placed in `netlify/functions/send-daily-email/` directory
- Use Netlify's `@netlify/functions` package for scheduled functions
- The function should call the Next.js API route using the site's URL (from `process.env.URL` or similar)
- Handle both success and error cases gracefully
- Include proper logging for debugging

### 2. Update Package Dependencies

If needed, install `@netlify/functions` package:
```bash
npm install @netlify/functions
```

### 3. Update Next.js Configuration (if needed)

The `next.config.js` currently has:
```javascript
const nextConfig = {
  output: 'standalone',
}
```

Ensure this is compatible with Netlify deployment. If Netlify requires different configuration, update accordingly.

### 4. Create Netlify Configuration File (if needed)

Create or update `netlify.toml` with:
- Build settings for Next.js
- Function configuration for the scheduled function
- Any necessary redirects or headers

### 5. Documentation

Update the setup documentation to reflect Netlify-specific instructions, including:
- How to deploy the scheduled function
- How to verify the cron job is working
- How to view logs and debug issues
- How to test the scheduled function locally (if possible)

## Important Considerations

1. **URL Construction**: The Netlify function needs to know the site URL to call the Next.js API route. In Netlify functions, use:
   - `process.env.URL` - The production URL (after deployment)
   - `process.env.DEPLOY_PRIME_URL` - The deploy preview URL
   - Or construct from `process.env.SITE_URL` or similar
   
   The function should construct the full URL like: `${process.env.URL}/api/cron/send-daily-email`

2. **Authentication**: The endpoint supports optional authentication via `CRON_SECRET`. The Netlify function should include this header if the environment variable is set, but should still work if it's not set (for local testing).

3. **Error Handling**: The function should:
   - Log the response from the API endpoint
   - Return appropriate status codes
   - Not throw unhandled errors that could prevent future executions

4. **Timeout**: Email generation involves:
   - Capturing TradingView screenshots (uses Puppeteer)
   - Fetching data from multiple APIs
   - Generating HTML email
   - Sending via Resend API
   
   This may take 30-60 seconds. Ensure the Netlify function timeout is sufficient (default is 10 seconds, may need to increase to 26 seconds for free tier, or 60+ seconds for paid).

5. **Dependencies**: Make sure Puppeteer and other dependencies work correctly in Netlify's serverless environment. Netlify Functions run in a Node.js environment, but may need special configuration for Puppeteer. Note: The Puppeteer usage is in the Next.js API route, not the Netlify function itself, so this should be handled by Netlify's Next.js runtime.

6. **Next.js on Netlify**: Netlify supports Next.js apps. The Next.js API routes should work normally. The scheduled function just needs to make an HTTP request to trigger the API route - it doesn't need to import or execute the Next.js code directly.

## Expected Function Structure

The Netlify scheduled function should look something like:

```javascript
// netlify/functions/send-daily-email/send-daily-email.js
const { schedule } = require('@netlify/functions');

const handler = schedule('0 10 * * *', async (event, context) => {
  try {
    // Get site URL - use URL for production, or DEPLOY_PRIME_URL for previews
    const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
    if (!siteUrl) {
      throw new Error('Site URL not found in environment variables');
    }

    // Construct API endpoint URL
    const apiUrl = `${siteUrl}/api/cron/send-daily-email`;
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Add authentication header if CRON_SECRET is set
    if (process.env.CRON_SECRET) {
      headers['Authorization'] = `Bearer ${process.env.CRON_SECRET}`;
    }

    // Make HTTP GET request to the Next.js API route
    // Note: fetch is available in Node.js 18+ (Netlify's default)
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: headers,
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('API endpoint returned error:', data);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Failed to send email', details: data }),
      };
    }

    console.log('Email sent successfully:', data);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Email sent successfully', data }),
    };
  } catch (error) {
    console.error('Error in scheduled function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message 
      }),
    };
  }
});

module.exports = { handler };
```

**Note**: This example uses `fetch` which is available in Node.js 18+. Netlify Functions use Node.js 18 by default. If you need to support older versions, you can use the `node-fetch` package or native `https` module instead.

## Testing

After implementation:
1. Test the function can call the API endpoint correctly
2. Verify authentication works (if CRON_SECRET is set)
3. Test error handling
4. Verify logs are accessible in Netlify dashboard
5. Manually trigger the scheduled function to verify it works before waiting for the scheduled time

## Additional Notes

- The Next.js app uses TypeScript, but the Netlify function can be JavaScript
- The application already has all the email generation logic - we just need to trigger it via cron
- The cron schedule is: `0 10 * * *` (10 AM UTC daily)
- Consider timezone adjustments if needed (currently set to UTC)

## Current Schedule

- **Time**: 10 AM UTC daily
- **Cron Expression**: `0 10 * * *`
- **Recipients**: charliebc@vaulto.ai, david@vaulto.ai

## Implementation Checklist

Please ensure the following:

- [ ] Create `netlify/functions/send-daily-email/` directory
- [ ] Create the scheduled function file (JavaScript)
- [ ] Install `@netlify/functions` package if needed
- [ ] Update or create `netlify.toml` with proper configuration
- [ ] Ensure function timeout is sufficient (26+ seconds for Netlify)
- [ ] Test the function locally if possible
- [ ] Verify the function calls the correct Next.js API route
- [ ] Handle authentication header correctly (with or without CRON_SECRET)
- [ ] Add proper error handling and logging
- [ ] Document how to verify the cron job is running in Netlify dashboard

## Deployment Steps

After implementation, the deployment process should be:
1. Push code to repository
2. Netlify will automatically detect and deploy
3. The scheduled function will be registered automatically
4. Function will run at the scheduled time (10 AM UTC daily)
5. View logs in Netlify dashboard under Functions > Scheduled Functions

## Verification

After deployment, verify:
1. Check Netlify dashboard for the scheduled function
2. Manually trigger the function once to test (if possible)
3. Check function logs for any errors
4. Verify email is received by recipients
5. Monitor the next scheduled execution

Please implement this setup and ensure everything is configured correctly for Netlify deployment.

