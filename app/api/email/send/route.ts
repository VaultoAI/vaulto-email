// API endpoint to generate and send daily market overview email

import { NextResponse } from 'next/server';
import { generateMarketOverviewEmail } from '@/lib/email/generate-email';
import { sendMarketOverviewEmail } from '@/lib/email/send-email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Default recipients
const DEFAULT_RECIPIENTS = [
  { email: 'charliebc@vaulto.ai' },
  { email: 'david@vaulto.ai' },
];

export async function POST(request?: Request) {
  try {
    let recipients = DEFAULT_RECIPIENTS;

    // Allow custom recipients via request body (optional)
    if (request) {
      try {
        const body = await request.json();
        if (body.recipients && Array.isArray(body.recipients)) {
          recipients = body.recipients;
        }
      } catch {
        // If body parsing fails, use default recipients
      }
    }

    console.log('Generating market overview email...');
    const { html, error: generateError } = await generateMarketOverviewEmail();

    if (generateError || !html) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to generate email', 
          details: generateError || 'No HTML content generated' 
        },
        { status: 500 }
      );
    }

    console.log('Sending email to recipients:', recipients.map(r => r.email).join(', '));
    const sendResult = await sendMarketOverviewEmail(html, recipients);

    if (!sendResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send email',
          details: sendResult.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: sendResult.messageId,
      recipients: recipients.map(r => r.email),
      message: 'Email sent successfully',
    });
  } catch (error) {
    console.error('Error in send email endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also allow GET for easy testing
export async function GET() {
  return POST();
}

