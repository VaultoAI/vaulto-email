// Test the parsing function with actual Perplexity response
const content = `1. U.S. Equities Mixed as Cyclical Sectors Lag  
   U.S. stocks traded **mostly lower**, with the Dow down about 0.6% and the S&P 500 off 0.2%, while the Nasdaq eked out a 0.2% gain, highlighting continued leadership from tech over cyclicals.[1] Energy, healthcare, and real estate were the weakest S&P sectors, signaling investors are rotating away from rate‑sensitive and commodity‑linked names.[1]

2. Labor Data Clouds Near-Term Fed Cut Expectations  
   November nonfarm payrolls rose **64,000**, beating expectations, but October saw a large **105,000 job decline** and unemployment ticked up to **4.6%**, slightly above forecasts.[1] This mixed picture is dampening optimism for an imminent Fed rate cut, with markets pricing only about a one‑in‑four chance of a quarter‑point move at the next key meeting.[1]

3. Energy Under Pressure as Oil Hits Multi-Year Low  
   U.S. crude dropped to its **lowest level since June 2021**, driving a sharp selloff in energy equities.[1] The Energy Select Sector SPDR fell 3.1%, with majors like Exxon Mobil and Chevron down 2–3%, creating short‑term downside risk for the sector but potentially more attractive entry points for long‑term buyers.[1]`;

function parseInsights(content) {
  const insights = [];
  
  if (!content || content.trim().length === 0) {
    return insights;
  }

  console.log('Parsing content, length:', content.length);
  
  // Strategy 1: Look for numbered lists
  const numberedPattern = /^\s*(\d+)\.\s*([\s\S]+?)(?=\n\s*\d+\.\s|$)/gm;
  let match;
  const matches = [];
  
  numberedPattern.lastIndex = 0;
  
  while ((match = numberedPattern.exec(content)) !== null) {
    console.log('\nMatch found:', match[0].substring(0, 150));
    const fullText = match[2];
    // Split by newlines but preserve content (don't filter empty lines yet)
    const allLines = fullText.split('\n');
    
    console.log('All lines:', allLines.length);
    console.log('All lines content:', allLines.map(l => `"${l}"`).slice(0, 5));
    
    // First non-empty line is the title
    let title = '';
    let titleIndex = -1;
    for (let i = 0; i < allLines.length; i++) {
      const trimmed = allLines[i].trim();
      if (trimmed.length > 0) {
        title = trimmed.replace(/^[-*•]\s*/, '').replace(/\*\*/g, '').trim();
        titleIndex = i;
        break;
      }
    }
    
    console.log('Title index:', titleIndex);
    console.log('Title:', title);
    
    // All lines after the title are content (including indented lines)
    const contentLines = allLines.slice(titleIndex + 1)
      .map(l => l.trim())
      .filter(l => l.length > 0);
    
    console.log('Content lines:', contentLines.length);
    console.log('Content lines preview:', contentLines.slice(0, 3));
    
    let contentText = contentLines.join(' ').replace(/\*\*/g, '').trim();
    
    console.log('Content text length:', contentText.length);
    console.log('Content preview:', contentText.substring(0, 150));
    
    if (title.length > 0) {
      matches.push({
        title: title,
        content: contentText || 'Market insight details.',
      });
    }
  }
  
  console.log('\n=== Results ===');
  console.log('Found', matches.length, 'insights');
  matches.forEach((m, i) => {
    console.log(`\n${i + 1}. ${m.title}`);
    console.log(`   ${m.content.substring(0, 100)}...`);
  });
  
  return matches;
}

parseInsights(content);

