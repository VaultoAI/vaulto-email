// Email sending utility using Resend

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailRecipient {
  email: string;
  name?: string;
}

/**
 * Sends the market overview email to specified recipients
 */
export async function sendMarketOverviewEmail(
  htmlContent: string,
  recipients: EmailRecipient[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not found in environment variables');
    return {
      success: false,
      error: 'RESEND_API_KEY not configured',
    };
  }

  const fromEmail = process.env.EMAIL_FROM || 'noreply@vaulto.ai';
  const fromName = process.env.EMAIL_FROM_NAME || 'Vaulto';

  try {
    const result = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: recipients.map(r => r.email),
      subject: `Daily Market Overview - ${new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`,
      html: htmlContent,
    });

    if (result.error) {
      console.error('Resend API error:', result.error);
      return {
        success: false,
        error: result.error.message || 'Unknown error from Resend',
      };
    }

    console.log('Email sent successfully:', result.data?.id);
    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

