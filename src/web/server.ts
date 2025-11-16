import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create and configure the Express web server
 */
export function createWebServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' })); // Large limit for file contents

  // API routes
  app.use('/api', apiRouter);

  // Serve the React UI (built files)
  const uiDistPath = path.join(__dirname, '../../ui/dist');
  app.use(express.static(uiDistPath));

  // SPA fallback - serve index.html for all other routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(uiDistPath, 'index.html'));
  });

  // Error handling middleware
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Express error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
    });
  });

  return app;
}

/**
 * Start the web server
 */
export async function startWebServer(port: number = 3000): Promise<void> {
  const app = createWebServer();

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.error(`[Reagent] Web server running on http://localhost:${port}`);
      resolve();
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`[Reagent] Port ${port} is already in use`);
        reject(new Error(`Port ${port} is already in use`));
      } else {
        reject(error);
      }
    });
  });
}
