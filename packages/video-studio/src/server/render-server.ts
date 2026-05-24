import express, { type Express } from 'express';
import cors from 'cors';
import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.RENDER_PORT ?? 3001;
const PROJECT_ROOT = path.resolve(__dirname, '..');

interface RenderRequest {
  composition: string;
  codec: 'h264' | 'h265' | 'prores';
  width: number;
  height: number;
  fps: number;
  duration?: number;
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Get available compositions
app.get('/compositions', (req, res) => {
  void (async () => {
    try {
      const bundled = await bundle({
        entryPoint: path.join(PROJECT_ROOT, 'index.tsx'),
        webpackOverride: (config) => config,
      });

      const compositions = await getCompositions(bundled);

      res.json({
        compositions: compositions.map((c) => ({
          id: c.id,
          width: c.width,
          height: c.height,
          fps: c.fps,
          durationInFrames: c.durationInFrames,
        })),
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  })();
});

// Render video endpoint
app.post('/render', (req, res) => {
  void (async () => {
    try {
      const body = req.body as Partial<RenderRequest>;
      const {
        composition: compositionId,
        codec = 'h264',
        width = 1440,
        height = 810,
        fps = 30,
      } = body;

      if (!compositionId) {
        res.status(400).json({ error: 'composition is required' });
        return;
      }

      const bundled = await bundle({
        entryPoint: path.join(PROJECT_ROOT, 'index.tsx'),
        webpackOverride: (config) => config,
      });

      const composition = await selectComposition({
        serveUrl: bundled,
        id: compositionId,
      });

      const outputPath = path.join(PROJECT_ROOT, `output-${Date.now()}.mp4`);
      const selectedComposition = {
        ...composition,
        width,
        height,
        fps,
      };

      await renderMedia({
        composition: selectedComposition,
        serveUrl: bundled,
        codec,
        outputLocation: outputPath,
        onProgress: (progress) => {
          console.log(`Rendering: ${Math.round(progress.progress * 100)}%`);
        },
      });

      res.json({ success: true, outputPath });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  })();
});

export default app;

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`Render server running on http://localhost:${PORT}`);
  });
}
