import express from 'express';
import { handleApiRequest } from '../server/api.js';

const app = express();

app.use(express.json());

function resolveUrl(req: express.Request): string {
  let path = req.originalUrl || req.url || '';

  if (req.query && req.query.__path) {
    path = `/api/${req.query.__path}`;
  } else if (!path.startsWith('/api')) {
    path = `/api${path.startsWith('/') ? '' : '/'}${path}`;
  }

  // Se houver query params e a URL ainda não contém '?', anexa-os
  if (req.query && Object.keys(req.query).length > 0 && !path.includes('?')) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
      if (key !== '__path' && value !== undefined) {
        params.append(key, String(value));
      }
    }
    const qStr = params.toString();
    if (qStr) {
      path += `?${qStr}`;
    }
  }

  return path;
}

app.all('*', async (req, res) => {
  try {
    const targetUrl = resolveUrl(req);
    const method = req.method || 'GET';
    const body = req.body;

    const response = await handleApiRequest(targetUrl, method, body);
    res.status(response.status).json(response.data);
  } catch (err: any) {
    console.error('API Error in Vercel handler:', err);
    res.status(500).json({ error: err.message || 'Erro interno no servidor' });
  }
});

export default app;
