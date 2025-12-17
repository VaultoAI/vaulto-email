// Test script to verify Perplexity API integration
require('dotenv').config({ path: '.env' });

async function testPerplexity() {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  
  if (!apiKey) {
    console.error('PERPLEXITY_API_KEY not found in environment variables');
    process.exit(1);
  }

  console.log('API Key found, length:', apiKey.length);

  const prompt = `Generate a concise market overview for today. Provide 3-5 key insights that investors need to know today. Format your response EXACTLY as follows:
1. Title of Insight 1
   Content paragraph for insight 1 (2-3 sentences).

2. Title of Insight 2
   Content paragraph for insight 2 (2-3 sentences).

3. Title of Insight 3
   Content paragraph for insight 3 (2-3 sentences).

Use numbered format (1., 2., 3., etc.) with each insight on a new line. Be specific and actionable.`;

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
            content: 'You are a financial market analyst providing concise, actionable market insights for daily email newsletters.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      process.exit(1);
    }

    const data = await response.json();
    console.log('\n=== API Response Structure ===');
    console.log('Has choices:', !!data.choices);
    console.log('Choices length:', data.choices?.length || 0);
    
    const content = data.choices?.[0]?.message?.content;
    console.log('\n=== Content ===');
    console.log('Has content:', !!content);
    console.log('Content length:', content?.length || 0);
    console.log('\n=== Full Content ===');
    console.log(content || 'No content');
    
    if (content) {
      // Test parsing
      const numberedPattern = /^\s*(\d+)\.\s*(.+?)(?=\n\s*\d+\.|\n\n|$)/gms;
      const matches = [];
      let match;
      while ((match = numberedPattern.exec(content)) !== null) {
        matches.push(match[2].trim());
      }
      console.log('\n=== Parsed Insights ===');
      console.log('Number of matches:', matches.length);
      matches.forEach((m, i) => {
        console.log(`\n${i + 1}: ${m.substring(0, 200)}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testPerplexity();

