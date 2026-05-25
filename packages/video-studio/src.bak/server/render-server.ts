import express from 'express';
import cors from 'cors';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.RENDER_PORT || 3001;
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
app.get('/compositions', async (req, res) => {
  try {
    const bundled = await bundle({
      entryPoint: path.join(PROJECT_ROOT, 'index.tsx'),
      webpackOverride: (config) => config,
    });

    const compositions = await selectComposition({
      serveUrl: bundled,
      id: undefined,
    });

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
});

// Render video endpoint
app.post('/render', async (req, res) => {
  try {
    const {
      composition,
      codec = 'h264',
      width = 1440,
      height = 810,
      fps = 30,
    }: RenderRequest = req.body;

    if (!composition) {
      return res.status(400).json({ error: 'composition is required' });
    }

    const bundled = await bundle({
      entryPoint: path.join(PROJECT_ROOT, 'index.tsx'),
      webpackOverride: (config) => config,
    });

    const outputPath = path.join(PROJECT_ROOT, `output-${Date.now()}.mp4`);

    await renderMedia({
      composition,
      serveUrl: bundled,
      codec,
      width,
      height,
      fps,
      outputLocation: outputPath,
      onProgress: (progress) => {
        console.log(`Rendering: ${Math.round(progress * 100)}%`);
      },
    });

    res.json({ success: true, outputPath });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default app;

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`Render server running on http://localhost:${PORT}`);
  });
}
