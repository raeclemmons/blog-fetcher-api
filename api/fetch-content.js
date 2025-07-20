export default async function handler(req, res) {
  // More comprehensive CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');

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

    // Test response
    if (url === 'test') {
      return res.status(200).json({ 
        content: 'Backend test successful! Your API is working perfectly.',
        url: 'test',
        timestamp: new Date().toISOString()
      });
    }

    // Simple URL fetching
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BlogFetcher/1.0)'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    const content = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000);

    if (content.length < 50) {
      throw new Error('Could not extract meaningful content');
    }

    return res.status(200).json({ 
      content: content,
      url: url,
      length: content.length
    });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Failed to fetch content',
      details: error.message,
      url: req.body?.url
    });
  }
}
