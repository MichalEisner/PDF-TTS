const http = require('http');
const https = require('https');

const PORT = 8010;

http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Only proxy translate_tts requests
  if (!req.url.startsWith('/translate_tts')) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const targetUrl = 'https://translate.google.com' + req.url;
  console.log(`Proxying request to: ${targetUrl}`);

  https.get(targetUrl, (proxyRes) => {
    // Keep only necessary headers, remove security ones that might break CORS
    const headers = { ...proxyRes.headers };
    delete headers['content-security-policy'];
    delete headers['x-frame-options'];
    
    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res);
  }).on('error', (err) => {
    console.error('Proxy error:', err);
    res.writeHead(500);
    res.end('Proxy Error');
  });
}).listen(PORT, () => {
  console.log(`Custom CORS proxy running on http://localhost:${PORT}`);
  console.log(`Target: https://translate.google.com`);
});
