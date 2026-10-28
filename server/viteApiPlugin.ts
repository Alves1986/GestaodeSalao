import { Plugin } from 'vite';
import { handleApiRequest } from './api.js';

export function viteApiPlugin(): Plugin {
  return {
    name: 'vite-plugin-neon-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api')) {
          try {
            let body: any = null;
            if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
              const buffers: any[] = [];
              for await (const chunk of req) {
                buffers.push(chunk);
              }
              const data = Buffer.concat(buffers).toString();
              if (data) {
                try {
                  body = JSON.parse(data);
                } catch {
                  body = data;
                }
              }
            }

            const response = await handleApiRequest(req.url, req.method || 'GET', body);
            res.statusCode = response.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(response.data));
            return;
          } catch (err: any) {
            console.error('Vite API middleware error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
        }
        next();
      });
    },
  };
}
