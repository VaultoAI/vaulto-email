// TradingView heatmap screenshot service using Puppeteer

import puppeteer, { Browser } from 'puppeteer';

let browser: Browser | null = null;

/**
 * Gets or creates a browser instance (reused for efficiency)
 */
async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });
  }
  return browser;
}

/**
 * Closes the browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

/**
 * Captures a screenshot of TradingView heatmap
 * @param heatmapUrl - TradingView heatmap widget URL or page URL
 * @param width - Screenshot width (default: 1200)
 * @param height - Screenshot height (default: 800)
 * @returns Base64 encoded image string
 */
export async function captureTradingViewHeatmap(
  heatmapUrl: string = 'https://www.tradingview.com/widgetembed/?symbol=SPX&interval=D',
  width: number = 1200,
  height: number = 800
): Promise<string> {
  const browserInstance = await getBrowser();
  const page = await browserInstance.newPage();

  try {
    // Set viewport size
    await page.setViewport({ width, height });

    // Navigate to TradingView heatmap
    // Using TradingView's market heatmap widget
    const widgetUrl = heatmapUrl.includes('widgetembed') 
      ? heatmapUrl 
      : `https://www.tradingview.com/widgetembed/?symbol=SPX&interval=D&theme=light&style=1&locale=en&symboledit=1&saveimage=0&toolbarbg=f1f3f6&studies=%5B%5D&hideideas=1&theme=light&style=1&timezone=Etc%2FUTC&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&show_popup_button=1&popup_width=1000&popup_height=650&referral_id=`;

    await page.goto(widgetUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for the chart to load (adjust selector based on TradingView's structure)
    await page.waitForTimeout(3000); // Give time for chart to render

    // Try to wait for specific elements that indicate the chart is loaded
    try {
      await page.waitForSelector('canvas', { timeout: 10000 });
    } catch (e) {
      // Canvas might not be available, continue anyway
      console.warn('Canvas selector not found, proceeding with screenshot');
    }

    // Take screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false,
      encoding: 'base64',
    });

    return screenshot as string;
  } catch (error) {
    console.error('Error capturing TradingView heatmap:', error);
    throw error;
  } finally {
    await page.close();
  }
}

/**
 * Alternative: Capture screenshot from TradingView's market heatmap page
 * This uses the actual heatmap page instead of widget
 */
export async function captureTradingViewMarketHeatmap(
  width: number = 1200,
  height: number = 800
): Promise<string> {
  const browserInstance = await getBrowser();
  const page = await browserInstance.newPage();

  try {
    await page.setViewport({ width, height });

    // Navigate to TradingView stock heatmap with SPX500 configuration
    const heatmapUrl = 'https://www.tradingview.com/heatmap/stock/#%7B%22dataSource%22%3A%22SPX500%22%2C%22blockColor%22%3A%22change%22%2C%22blockSize%22%3A%22market_cap_basic%22%2C%22grouping%22%3A%22sector%22%7D';
    
    await page.goto(heatmapUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for page to load and heatmap to render
    await page.waitForTimeout(5000);

    // Wait for heatmap content to be visible
    try {
      await page.waitForSelector('[class*="heatmap"], [class*="chart"], canvas, svg', { timeout: 10000 });
    } catch (e) {
      console.warn('Heatmap selector not found, proceeding with screenshot');
    }

    // Calculate crop dimensions: remove top 15% and bottom 10%
    const topCropPercent = 0.21;
    const bottomCropPercent = 0.05;
    const cropY = Math.round(height * topCropPercent);
    const cropHeight = Math.round(height * (1 - topCropPercent - bottomCropPercent));

    // Take screenshot of the heatmap section with cropping
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false,
      encoding: 'base64',
      clip: {
        x: 0,
        y: cropY,
        width: width,
        height: cropHeight,
      },
    });

    return screenshot as string;
  } catch (error) {
    console.error('Error capturing TradingView market heatmap:', error);
    throw error;
  } finally {
    await page.close();
  }
}

