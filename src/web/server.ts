import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'http';
import { apiRouter } from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createWebServer() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  app.use('/api', apiRouter);

  const uiDistPath = path.join(__dirname, '../../ui/dist');
  app.use(express.static(uiDistPath));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(uiDistPath, 'index.html'));
  });

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Express error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
    });
  });

  return app;
}

export async function startWebServer(preferredPort: number, maxAttempts: number): Promise<Server> {
  const app = createWebServer();

  for (let i = 0; i < maxAttempts; i++) {
    const port = preferredPort + i;

    try {
      const server = await new Promise<Server>((resolve, reject) => {
        const srv = app.listen(port, () => resolve(srv));
        srv.on('error', reject);
      });

      console.error(`[Reagent] Web server running on http://localhost:${port}`);
      return server;
    } catch (error: any) {
      if (error.code === 'EADDRINUSE' && i < maxAttempts - 1) {
        continue;
      }
    }
  }

  throw new Error(`Failed to start web server after ${maxAttempts} attempts`);
}
