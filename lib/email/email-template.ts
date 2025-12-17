// HTML email template generator for market overview

import { PrestockToken } from './prestock-data';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Formats percentage change with color coding
 */
function formatPriceChange(change?: number): { text: string; color: string } {
  if (change === undefined || change === null || isNaN(change)) {
    return { text: 'N/A', color: '#666666' };
  }
  
  const sign = change >= 0 ? '+' : '';
  const color = change >= 0 ? '#00C853' : '#FF1744';
  return {
    text: `${sign}${change.toFixed(2)}%`,
    color,
  };
}

/**
 * Formats volume in human-readable format
 */
function formatVolume(volume: number): string {
  if (volume >= 1e9) {
    return `$${(volume / 1e9).toFixed(2)}B`;
  } else if (volume >= 1e6) {
    return `$${(volume / 1e6).toFixed(2)}M`;
  } else if (volume >= 1e3) {
    return `$${(volume / 1e3).toFixed(2)}K`;
  }
  return `$${volume.toFixed(2)}`;
}

/**
 * Converts image file to base64 data URL
 */
function imageToBase64(imagePath: string): string {
  try {
    // Remove leading slash if present and join with public directory
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    const fullPath = path.join(process.cwd(), 'public', cleanPath);
    const imageBuffer = fs.readFileSync(fullPath);
    const base64 = imageBuffer.toString('base64');
    const ext = path.extname(imagePath).slice(1).toLowerCase();
    let mimeType = `image/${ext}`;
    if (ext === 'webp') {
      mimeType = 'image/webp';
    } else if (ext === 'svg') {
      mimeType = 'image/svg+xml';
    } else if (ext === 'jpg' || ext === 'jpeg') {
      mimeType = 'image/jpeg';
    }
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(`Error converting image to base64: ${imagePath}`, error);
    return '';
  }
}

/**
 * Gets Vaulto logo - tries multiple possible paths
 */
function getVaultoLogo(): string {
  const possiblePaths = [
    '/vaulto-logo.png',
    '/vaulto-logo.svg',
    '/vaulto-logo.jpg',
    '/vaulto-logo.webp',
    '/logo.png',
    '/logo.svg',
  ];
  
  // First try public directory
  for (const logoPath of possiblePaths) {
    const logo = imageToBase64(logoPath);
    if (logo) {
      return logo;
    }
  }
  
  // Then try root directory
  try {
    const rootLogoPath = path.join(process.cwd(), 'smallervaultologo.png');
    if (fs.existsSync(rootLogoPath)) {
      const imageBuffer = fs.readFileSync(rootLogoPath);
      const base64 = imageBuffer.toString('base64');
      return `data:image/png;base64,${base64}`;
    }
  } catch (error) {
    console.error('Error loading Vaulto logo from root:', error);
  }
  
  return '';
}

/**
 * Generates HTML email template
 */
export function generateEmailTemplate(
  tradingViewScreenshotBase64: string,
  prestockTokens: PrestockToken[],
  date: Date = new Date(),
  marketInsights: Array<{ title: string; description: string; link: string }> = []
): string {
  const dateString = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Sort prestock tokens by 24hr growth (highest to lowest)
  const sortedPrestockTokens = [...prestockTokens].sort((a, b) => {
    const aChange = a.priceChange24h ?? -Infinity;
    const bChange = b.priceChange24h ?? -Infinity;
    return bChange - aChange; // Descending order (highest first)
  });

  // Generate Prestock rows
  const prestockRows = sortedPrestockTokens
    .map((token) => {
      const logoBase64 = imageToBase64(token.logoPath);
      const priceChange = formatPriceChange(token.priceChange24h);
      const volumeFormatted = formatVolume(token.volumeUSD);
      const marketCap = token.marketCapFormatted || 'N/A';

      return `
        <tr style="border-bottom: 1px solid #e0e0e0;">
          <td style="padding: 10px; vertical-align: middle;">
            <img src="${logoBase64}" alt="${token.name}" style="width: 36px; height: 36px; border-radius: 6px; object-fit: contain;" />
          </td>
          <td style="padding: 10px; vertical-align: middle; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #1a1a1a;">
            ${token.name}
          </td>
          <td style="padding: 10px; vertical-align: middle; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; font-weight: 600; color: ${priceChange.color};">
            ${priceChange.text}
          </td>
          <td style="padding: 10px; vertical-align: middle; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #1a1a1a;">
            ${marketCap}
          </td>
          <td style="padding: 10px; vertical-align: middle; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #1a1a1a;">
            ${volumeFormatted}
          </td>
        </tr>
      `;
    })
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Market Overview - ${dateString}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td style="padding: 0;">
        <!-- Main Container -->
        <table role="presentation" style="width: 100%; max-width: 800px; margin: 0 auto; background-color: #ffffff; border-collapse: collapse;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 30px 30px; background-color: #ffffff; border-bottom: 2px solid #e0e0e0;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="vertical-align: top;">
                    ${(() => {
                      const vaultoLogo = getVaultoLogo();
                      return vaultoLogo ? `<img src="${vaultoLogo}" alt="Vaulto" style="max-width: 200px; height: auto; margin-bottom: 20px; display: block;" />` : '';
                    })()}
                    <h1 style="margin: 0 0 10px 0; font-size: 32px; font-weight: 700; color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; text-align: left;">
                      Daily Market Overview
                    </h1>
                    <p style="margin: 0; font-size: 16px; color: #666666; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; text-align: left;">
                      ${dateString}
                    </p>
                  </td>
                  <td style="vertical-align: bottom; text-align: right;">
                    <div style="display: inline-block; text-align: right;">
                      ${(() => {
                        const searchLogo = imageToBase64('/search-logo.png');
                        const swapLogo = imageToBase64('/swap-logo.png');
                        const mainLogo = imageToBase64('/main-logo.png');
                        return `
                          <a href="https://search.vaulto.ai" style="display: inline-block; margin-left: 8px; vertical-align: middle;" target="_blank" rel="noopener noreferrer">
                            ${searchLogo ? `<img src="${searchLogo}" alt="Vaulto Search" style="height: 32px; width: auto; display: block;" />` : ''}
                          </a>
                          <a href="https://app.vaulto.ai" style="display: inline-block; margin-left: 8px; vertical-align: middle;" target="_blank" rel="noopener noreferrer">
                            ${swapLogo ? `<img src="${swapLogo}" alt="Vaulto Swap" style="height: 32px; width: auto; display: block;" />` : ''}
                          </a>
                          <a href="https://vaulto.ai" style="display: inline-block; margin-left: 8px; vertical-align: middle;" target="_blank" rel="noopener noreferrer">
                            ${mainLogo ? `<img src="${mainLogo}" alt="Main Site" style="height: 32px; width: auto; display: block;" />` : ''}
                          </a>
                        `;
                      })()}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- TradingView Heatmap Section -->
          <tr>
            <td style="padding: 40px 30px; background-color: #ffffff;">
              <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Market Heatmap
              </h2>
              <div style="text-align: center;">
                <img src="data:image/png;base64,${tradingViewScreenshotBase64}" alt="Stock Market Heatmap" style="width: 100%; max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
              </div>
            </td>
          </tr>
          
          <!-- Prestock Gains Section -->
          <tr>
            <td style="padding: 30px 30px; background-color: #ffffff;">
              <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 600; color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Top Prestock Performers
              </h2>
              <!-- Prestock Table -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #ffffff;">
                <!-- Table Header -->
                <tr style="background-color: #f8f9fa; border-bottom: 1px solid #e0e0e0;">
                  <th style="padding: 8px 10px; text-align: left; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 11px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 0.3px;">
                    Logo
                  </th>
                  <th style="padding: 8px 10px; text-align: left; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 11px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 0.3px;">
                    Company
                  </th>
                  <th style="padding: 8px 10px; text-align: left; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 11px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 0.3px;">
                    24hr Change
                  </th>
                  <th style="padding: 8px 10px; text-align: left; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 11px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 0.3px;">
                    Market Cap
                  </th>
                  <th style="padding: 8px 10px; text-align: left; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 11px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 0.3px;">
                    Volume (24h)
                  </th>
                </tr>
                ${prestockRows}
              </table>
            </td>
          </tr>
          
          <!-- Market Overview Section -->
          ${marketInsights.length > 0 ? `
          <tr>
            <td style="padding: 40px 30px; background-color: #ffffff;">
              <h2 style="margin: 0 0 30px 0; font-size: 24px; font-weight: 600; color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Market Overview
              </h2>
              
              ${marketInsights.map((insight, index) => `
                <div style="margin-bottom: ${index < marketInsights.length - 1 ? '30px' : '0'}; padding-bottom: ${index < marketInsights.length - 1 ? '30px' : '0'}; border-bottom: ${index < marketInsights.length - 1 ? '1px solid #e0e0e0' : 'none'};">
                  <h3 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 600; color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                    ${insight.title}
                  </h3>
                  <p style="margin: 0 0 10px 0; font-size: 16px; line-height: 1.6; color: #333333; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                    ${insight.description}
                  </p>
                  <a href="${insight.link}" style="display: inline-block; font-size: 14px; color: #0066cc; text-decoration: underline; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;" target="_blank" rel="noopener noreferrer">
                    Read more →
                  </a>
                </div>
              `).join('')}
            </td>
          </tr>
          ` : ''}
          
          <!-- Footer -->
          <tr>
            <td style="padding: 15px 30px; background-color: #f8f9fa; border-top: 1px solid #e0e0e0;">
              <!-- Social Media Icons -->
              <div style="text-align: center; margin-bottom: 8px;">
                <a href="https://discord.gg/VaultoAI" style="display: inline-block; margin: 0 8px; text-decoration: none;" target="_blank" rel="noopener noreferrer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" fill="#000000"/>
                  </svg>
                </a>
                <a href="https://instagram.com/VaultoAI" style="display: inline-block; margin: 0 8px; text-decoration: none;" target="_blank" rel="noopener noreferrer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" fill="#000000"/>
                  </svg>
                </a>
                <a href="https://twitter.com/VaultoAI" style="display: inline-block; margin: 0 8px; text-decoration: none;" target="_blank" rel="noopener noreferrer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" fill="#000000"/>
                  </svg>
                </a>
                <a href="https://linkedin.com/company/Vaulto" style="display: inline-block; margin: 0 8px; text-decoration: none;" target="_blank" rel="noopener noreferrer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#000000"/>
                  </svg>
                </a>
              </div>

              <!-- Footer Links -->
              <div style="text-align: center; margin-bottom: 6px;">
                <a href="https://vaulto.ai" style="display: inline-block; margin: 0 8px; font-size: 12px; color: #666666; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;" target="_blank" rel="noopener noreferrer">
                  Home
                </a>
                <span style="color: #cccccc; margin: 0 4px;">|</span>
                <a href="https://search.vaulto.ai/privacy-policy.html" style="display: inline-block; margin: 0 8px; font-size: 12px; color: #666666; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;" target="_blank" rel="noopener noreferrer">
                  Privacy
                </a>
                <span style="color: #cccccc; margin: 0 4px;">|</span>
                <a href="https://search.vaulto.ai/terms-of-service.html" style="display: inline-block; margin: 0 8px; font-size: 12px; color: #666666; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;" target="_blank" rel="noopener noreferrer">
                  Terms
                </a>
                <span style="color: #cccccc; margin: 0 4px;">|</span>
                <a href="{{unsubscribe_url}}" style="display: inline-block; margin: 0 8px; font-size: 12px; color: #666666; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                  Unsubscribe
                </a>
              </div>

              <!-- Company Info & Copyright -->
              <div style="text-align: center; margin-bottom: 6px;">
                <p style="margin: 0; font-size: 11px; color: #999999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.4;">
                  © ${new Date().getFullYear()} Vaulto. All rights reserved. Data provided by <a href="https://jup.ag" style="color: #999999; text-decoration: underline;" target="_blank" rel="noopener noreferrer">Jupiter API</a>${marketInsights.length > 0 ? ' and <a href="https://www.perplexity.ai" style="color: #999999; text-decoration: underline;" target="_blank" rel="noopener noreferrer">Perplexity AI</a>' : ''}
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return html;
}

