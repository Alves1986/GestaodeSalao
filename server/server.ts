import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleApiRequest } from './api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// API Routes
app.all('/api/*', async (req, res) => {
  const response = await handleApiRequest(req.originalUrl, req.method, req.body);
  res.status(response.status).json(response.data);
});

// Static assets in production
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.resolve(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`[Neon Backend] Servidor rodando na porta ${port}`);
});
