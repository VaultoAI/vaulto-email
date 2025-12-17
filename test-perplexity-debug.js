// Debug test to see what's happening with Perplexity API
require('dotenv').config({ path: '.env' });

async function testPerplexityDebug() {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  
  if (!apiKey) {
    console.error('PERPLEXITY_API_KEY not found');
    process.exit(1);
  }

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

    const data = await response.json();
    
    // Extract citations
    let citations = [];
    let rawCitations = [];
    
    if (data.search_results && Array.isArray(data.search_results)) {
      rawCitations = data.search_results;
      console.log(`\n=== Found ${rawCitations.length} citations in search_results ===`);
    } else if (data.citations && Array.isArray(data.citations)) {
      rawCitations = data.citations;
      console.log(`\n=== Found ${rawCitations.length} citations in data.citations ===`);
    } else {
      console.log('\n=== No citations found in standard locations ===');
      console.log('Available keys:', Object.keys(data));
    }
    
    if (rawCitations.length > 0) {
      console.log('Sample citation:', JSON.stringify(rawCitations[0], null, 2));
    }
    
    citations = rawCitations.map((cite) => {
      if (typeof cite === 'string') return cite;
      return cite.url || cite.link || cite.href || cite.source_url || cite.article_url || null;
    }).filter(url => url !== null && typeof url === 'string');
    
    console.log(`\n=== Extracted ${citations.length} citation URLs ===`);
    citations.forEach((url, i) => {
      console.log(`${i + 1}. ${url}`);
    });
    
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error('\nNo content in response!');
      return;
    }
    
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    cleanedContent = cleanedContent.trim();
    
    const parsedData = JSON.parse(cleanedContent);
    const insights = parsedData.insights || [];
    
    console.log(`\n=== Parsed ${insights.length} insights ===\n`);
    
    insights.forEach((insight, i) => {
      console.log(`${i + 1}. ${insight.title}`);
      console.log(`   Link in JSON: ${insight.link}`);
      console.log(`   Description: ${insight.description.substring(0, 80)}...`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testPerplexityDebug();

