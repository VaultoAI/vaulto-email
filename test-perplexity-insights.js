// Test script to verify Perplexity insights with the actual implementation
require('dotenv').config({ path: '.env' });

async function testPerplexityInsights() {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  
  if (!apiKey) {
    console.error('PERPLEXITY_API_KEY not found in environment variables');
    process.exit(1);
  }

  console.log('Testing Perplexity Insights API...\n');
  console.log('API Key present:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const prompt = `Generate a concise market overview for ${today}. You MUST provide EXACTLY 5-7 key insights that investors need to know today. Focus on:
- Major market movements and trends
- Key economic indicators or news
- Sector performance highlights
- Important policy or regulatory changes
- Market sentiment and outlook

CRITICAL REQUIREMENTS:
1. ONLY use reputable financial news sources from this whitelist: Bloomberg (bloomberg.com), Reuters (reuters.com), Wall Street Journal (wsj.com), Financial Times (ft.com, financialtimes.com), CNBC (cnbc.com), MarketWatch (marketwatch.com), Yahoo Finance (finance.yahoo.com, yahoo.com), The Economist (economist.com), Forbes (forbes.com), Business Insider (businessinsider.com), or Nasdaq (nasdaq.com). DO NOT use Zacks.com or any other sources outside this whitelist.
2. For each insight, you MUST provide the EXACT, DIRECT URL to the original news article from one of these whitelisted sources. The URL must:
   - Be a complete, valid HTTPS URL
   - Point directly to a specific article page (not a homepage, category page, search results, or general market data page)
   - Have a meaningful article path (e.g., /article-title, /news/article-name, /story/article-id)
   - Come from one of the whitelisted domains above
   - Be accessible and not a broken link
3. You MUST return ONLY valid JSON with no additional text, comments, or markdown formatting.
4. The JSON structure must be exactly:
{
  "insights": [
    {
      "title": "Brief, descriptive title of the insight",
      "description": "2-3 sentence description explaining the market insight",
      "link": "https://exact-direct-url-to-original-news-article.com/article-path"
    }
  ]
}

IMPORTANT: 
- You MUST provide at least 5 insights (preferably 5-7 to account for filtering).
- Return ONLY the JSON object. Do not include any text before or after the JSON.
- Each insight MUST include a valid, direct URL to a reputable news source article.
- Do NOT use sources outside the whitelist.
- DO NOT use Zacks.com under any circumstances.
- Do NOT use URLs that point to homepages, category pages, search results, or general data pages - only direct article URLs with specific article paths.`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'You are a financial market analyst providing concise, actionable market insights for daily email newsletters. Always return responses in valid JSON format. You must ONLY use reputable financial news sources from the whitelist provided (Bloomberg, Reuters, WSJ, Financial Times, CNBC, MarketWatch, Yahoo Finance, The Economist, Forbes, Business Insider, Nasdaq). DO NOT use Zacks.com or any other sources. Ensure all article URLs are direct links to actual articles, not homepages or category pages.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2500,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'market_insights',
            schema: {
              type: 'object',
              properties: {
                insights: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      link: { type: 'string' }
                    },
                    required: ['title', 'description', 'link']
                  }
                }
              },
              required: ['insights']
            }
          }
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status);
      console.error('Error response:', errorText);
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Parsed error:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.error('Error response is not JSON');
      }
      process.exit(1);
    }

    const data = await response.json();
    console.log('\n=== API Response Structure ===');
    console.log('Status:', response.status);
    console.log('Has choices:', !!data.choices);
    console.log('Choices length:', data.choices?.length || 0);
    
    const content = data.choices?.[0]?.message?.content;
    console.log('\n=== Content ===');
    console.log('Has content:', !!content);
    console.log('Content length:', content?.length || 0);
    
    // Extract citations
    let citations = [];
    if (data.search_results && Array.isArray(data.search_results)) {
      citations = data.search_results.map(cite => {
        if (typeof cite === 'string') return cite;
        return cite.url || cite.link || null;
      }).filter(url => url !== null);
      console.log('\n=== Citations Found ===');
      console.log('Number of citations:', citations.length);
      citations.slice(0, 5).forEach((url, i) => {
        console.log(`  ${i + 1}. ${url}`);
      });
    }
    
    if (!content) {
      console.error('\nNo content in response!');
      console.log('Full response:', JSON.stringify(data, null, 2));
      process.exit(1);
    }

    // Clean and parse JSON
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    cleanedContent = cleanedContent.trim();

    let parsedData;
    try {
      parsedData = JSON.parse(cleanedContent);
      console.log('\n=== Parsed JSON ===');
      console.log('Structure:', Object.keys(parsedData));
    } catch (parseError) {
      console.error('\nFailed to parse JSON:', parseError);
      console.error('Content preview:', cleanedContent.substring(0, 500));
      process.exit(1);
    }

    const insights = parsedData.insights || [];
    console.log(`\n=== Insights Returned: ${insights.length} ===\n`);

    // Check for Zacks
    const hasZacks = insights.some(insight => 
      insight.link && insight.link.toLowerCase().includes('zacks.com')
    );
    
    if (hasZacks) {
      console.error('❌ ERROR: Found Zacks.com in insights!');
      insights.forEach((insight, i) => {
        if (insight.link && insight.link.toLowerCase().includes('zacks.com')) {
          console.error(`  Insight ${i + 1}: ${insight.title}`);
          console.error(`  URL: ${insight.link}`);
        }
      });
      process.exit(1);
    }

    // Validate sources
    const REPUTABLE_NEWS_DOMAINS = [
      'bloomberg.com',
      'reuters.com',
      'wsj.com',
      'ft.com',
      'financialtimes.com',
      'cnbc.com',
      'marketwatch.com',
      'yahoo.com',
      'finance.yahoo.com',
      'economist.com',
      'forbes.com',
      'businessinsider.com',
      'nasdaq.com',
      'tradingeconomics.com',
    ];

    insights.forEach((insight, i) => {
      console.log(`\n${i + 1}. ${insight.title}`);
      console.log(`   Description: ${insight.description.substring(0, 100)}...`);
      console.log(`   URL: ${insight.link}`);
      
      // Check if URL is from reputable source
      try {
        const urlObj = new URL(insight.link);
        const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');
        const isReputable = REPUTABLE_NEWS_DOMAINS.some(domain => 
          hostname === domain || hostname.endsWith('.' + domain)
        );
        
        if (isReputable) {
          console.log(`   ✅ Source: ${hostname} (reputable)`);
        } else {
          console.log(`   ❌ Source: ${hostname} (NOT in whitelist!)`);
        }
      } catch (e) {
        console.log(`   ❌ Invalid URL format`);
      }
    });

    console.log(`\n=== Summary ===`);
    console.log(`Total insights: ${insights.length}`);
    console.log(`Zacks.com found: ${hasZacks ? 'YES ❌' : 'NO ✅'}`);
    console.log(`Minimum required: 5`);
    console.log(`Status: ${insights.length >= 5 && !hasZacks ? '✅ PASS' : '❌ FAIL'}`);

  } catch (error) {
    console.error('\nError:', error);
    process.exit(1);
  }
}

testPerplexityInsights();

