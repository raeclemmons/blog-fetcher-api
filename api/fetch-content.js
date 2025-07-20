export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log('Fetching URL:', url);

    // Use fetch with proper error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BlogFetcher/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log('HTML length:', html.length);
    
    // Enhanced content extraction
    let content = html
      // Remove scripts and styles
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // Remove comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove all HTML tags
      .replace(/<[^>]*>/g, ' ')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim();

    // If content is too short, try a different approach
    if (content.length < 100) {
      // Try to extract just text nodes
      const textMatch = html.match(/>([^<]+)</g);
      if (textMatch) {
        content = textMatch
          .map(match => match.replace(/^>|<$/g, '').trim())
          .filter(text => text.length > 10)
          .join(' ')
          .substring(0, 5000);
      }
    }

    content = content.substring(0, 8000); // Limit content length

    if (!content || content.length < 50) {
      return res.status(400).json({ 
        error: 'Could not extract meaningful content from the URL',
        debug: {
          htmlLength: html.length,
          contentLength: content.length,
          url: url
        }
      });
    }

    console.log('Extracted content length:', content.length);

    res.status(200).json({ 
      content: content,
      url: url,
      length: content.length
    });

  } catch (error) {
    console.error('Error fetching content:', error);
    
    let errorMessage = 'Failed to fetch content from URL';
    if (error.name === 'AbortError') {
      errorMessage = 'Request timed out - the website took too long to respond';
    } else if (error.message.includes('fetch')) {
      errorMessage = 'Could not connect to the URL - it may be down or block automated requests';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: error.message,
      url: req.body?.url
    });
  }
}
