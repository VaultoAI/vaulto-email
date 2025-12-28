const { schedule } = require('@netlify/functions');

// Netlify scheduled function to trigger the daily email cron job
const handler = schedule('0 10 * * *', async (event, context) => {
  console.log('Starting scheduled email job...');
  
  try {
    // Get the site URL from Netlify environment variables
    const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:3000';
    const endpoint = `${siteUrl}/api/cron/send-daily-email`;
    
    console.log(`Calling endpoint: ${endpoint}`);
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Add Authorization header if CRON_SECRET is set
    if (process.env.CRON_SECRET) {
      headers['Authorization'] = `Bearer ${process.env.CRON_SECRET}`;
      console.log('Authorization header added');
    }
    
    // Make HTTP GET request to the Next.js API route
    const response = await fetch(endpoint, {
      method: 'GET',
      headers,
    });
    
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', data);
    
    if (response.ok) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Successfully triggered daily email',
          data,
        }),
      };
    } else {
      console.error('Error from API endpoint:', data);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          message: 'Failed to trigger daily email',
          error: data,
        }),
      };
    }
  } catch (error) {
    console.error('Error triggering scheduled email:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal error triggering daily email',
        error: error.message,
      }),
    };
  }
});

module.exports = { handler };
