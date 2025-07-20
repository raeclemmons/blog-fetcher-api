export default async function handler(req, res) {
  // Enhanced CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'false');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body || {};
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Test endpoint
    if (url === 'test') {
      return res.status(200).json({ 
        content: 'Backend test successful! Your API is working.',
        url: 'test',
        timestamp: new Date().toISOString()
      });
    }

    console.log('Fetching URL:', url);

    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
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
    console.log('HTML fetched, length:', html.length);

    // Smart content extraction that preserves structure
    let content = html;

    // Remove scripts, styles, and other noise
    content = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '');

    // Extract meaningful content with structure
    const lines = [];
    
    // Extract title
    const titleMatch = content.match(/<title[^>]*>(.*?)<\/title>/i);
    if (titleMatch) {
      lines.push(`TITLE: ${titleMatch[1].trim()}`);
      lines.push('');
    }

    // Extract headings with hierarchy
    const headings = content.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi);
    if (headings) {
      headings.forEach(heading => {
        const level = heading.match(/<h([1-6])/i)[1];
        const text = heading.replace(/<[^>]+>/g, '').trim();
        if (text) {
          lines.push(`${'#'.repeat(parseInt(level))} ${text}`);
          lines.push('');
        }
      });
    }

    // Extract paragraphs
    const paragraphs = content.match(/<p[^>]*>(.*?)<\/p>/gi);
    if (paragraphs) {
      paragraphs.forEach(p => {
        const text = p.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (text && text.length > 20) {
          lines.push(text);
          lines.push('');
        }
      });
    }

    // Extract list items
    const listItems = content.match(/<li[^>]*>(.*?)<\/li>/gi);
    if (listItems) {
      listItems.forEach(li => {
        const text = li.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (text) {
          lines.push(`• ${text}`);
        }
      });
      lines.push('');
    }

    // If structured extraction didn't work, fall back to simple extraction
    if (lines.length < 5) {
      content = content
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (content.length > 100) {
        return res.status(200).json({
          content: content.substring(0, 8000),
          url: url,
          method: 'fallback'
        });
      }
    }

    const finalContent = lines.join('\n').trim();

    if (!finalContent || finalContent.length < 50) {
      throw new Error('Could not extract meaningful content from the URL');
    }

    console.log('Content extracted successfully, length:', finalContent.length);

    return res.status(200).json({
      content: finalContent.substring(0, 8000),
      url: url,
      method: 'structured',
      length: finalContent.length
    });

  } catch (error) {
    console.error('Error:', error.message);
    
    return res.status(500).json({
      error: 'Failed to fetch content',
      details: error.message,
      url: req.body?.url || 'unknown'
    });
  }
}
