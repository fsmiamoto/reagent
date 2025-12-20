import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'http';
import { apiRouter } from './routes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_WEB_SERVER_PORT = 3636;

export function getWebServerPort(): number {
  const portFromEnv = process.env.REAGENT_PORT && Number.parseInt(process.env.REAGENT_PORT, 10);

  if (portFromEnv && Number.isNaN(portFromEnv)) {
    throw new Error(`Couldn't parse port from envvar: ${process.env.REAGENT_PORT}`);
  }

  return portFromEnv || DEFAULT_WEB_SERVER_PORT;
}

export { DEFAULT_PORT, getPort } from '../config';

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

export async function startWebServer(
  port: number
): Promise<{ server: Server; port: number }> {
  const app = createWebServer();

  try {
    const server = await new Promise<Server>((resolve, reject) => {
      const srv = app.listen(port, () => resolve(srv));
      srv.on('error', reject);
    });

    console.error(`[Reagent] Web server running on http://localhost:${port}`);
    return { server, port };
  } catch (error: any) {
    if (error.code === 'EADDRINUSE') {
      throw new Error(`Port ${port} is already in use`);
    }
    throw error;
  }
}
