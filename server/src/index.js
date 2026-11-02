// Local development server. In production the same routes run as a Cloudflare Worker (worker.js).
import express from 'express';
import cors from 'cors';
import { identifyProvider } from './identify.js';
import * as routes from './routes.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '12mb' }));

const send = (res) => ([status, body]) => res.status(status).json(body);

app.get('/api/health', (_req, res) => send(res)(routes.health()));
app.post('/api/identify', async (req, res) => send(res)(await routes.identify(req.body)));
app.get('/api/search', async (req, res) => send(res)(await routes.search(req.query.q)));
app.get('/api/cards/:id', async (req, res) => send(res)(await routes.card(req.params.id)));

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => {
  console.log(`Pokey Fire API on http://localhost:${port} (recognition: ${identifyProvider() || 'off, set XAI_API_KEY'})`);
});
