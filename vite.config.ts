import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'https'
import type { IncomingMessage, ServerResponse } from 'http'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'google-tts-proxy',
      configureServer(server) {
        server.middlewares.use((req: IncomingMessage, res: ServerResponse, next) => {
          if (req.url?.startsWith('/translate_tts')) {
            const targetUrl = 'https://translate.google.com' + req.url;
            console.log(`[Proxy] Routing to: ${targetUrl}`);
            
            https.get(targetUrl, (proxyRes) => {
              const headers = { ...proxyRes.headers };
              delete headers['content-security-policy'];
              delete headers['x-frame-options'];
              // Add CORS headers
              headers['access-control-allow-origin'] = '*';
              
              res.writeHead(proxyRes.statusCode || 200, headers);
              proxyRes.pipe(res);
            }).on('error', (err) => {
              console.error('[Proxy] Error:', err);
              res.statusCode = 500;
              res.end('Proxy Error');
            });
          } else {
            next();
          }
        });
      }
    }
  ],
})
