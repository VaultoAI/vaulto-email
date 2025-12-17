// API endpoint to generate daily market overview email

import { NextResponse } from 'next/server';
import { captureTradingViewMarketHeatmap, closeBrowser } from '@/lib/email/tradingview-screenshot';
import { fetchAllPrestockData } from '@/lib/email/prestock-data';
import { generateEmailTemplate } from '@/lib/email/email-template';
import { fetchMarketInsights } from '@/lib/email/perplexity-insights';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Fetch TradingView heatmap screenshot
    console.log('Capturing TradingView heatmap...');
    const tradingViewScreenshot = await captureTradingViewMarketHeatmap(1200, 800);

    // Fetch Prestock token data
    console.log('Fetching Prestock token data...');
    const prestockTokens = await fetchAllPrestockData();

    // Fetch market insights from Perplexity
    console.log('Fetching market insights from Perplexity...');
    const marketInsights = await fetchMarketInsights();
    console.log(`Fetched ${marketInsights.length} market insights from Perplexity`);

    // Generate HTML email
    console.log('Generating email template...');
    const htmlEmail = generateEmailTemplate(
      tradingViewScreenshot,
      prestockTokens,
      new Date(),
      marketInsights
    );

    // Clean up browser instance
    await closeBrowser();

    // Return HTML email
    return new NextResponse(htmlEmail, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error generating market overview email:', error);
    
    // Ensure browser is closed on error
    try {
      await closeBrowser();
    } catch (closeError) {
      console.error('Error closing browser:', closeError);
    }

    return NextResponse.json(
      { error: 'Failed to generate market overview email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

