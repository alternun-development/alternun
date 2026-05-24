#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const PUBLIC_DIR = path.resolve(PROJECT_ROOT, 'public');
const PORT = process.env.STUDIO_PORT || 3000;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'AIRS Studio' });
});

// Studio dashboard route
app.get('/', (req, res) => {
  res.sendFile(path.resolve(PUBLIC_DIR, 'studio.html'));
});

// Remotion composition route
app.get('/remote', (req, res) => {
  res.sendFile(path.resolve(PUBLIC_DIR, 'index.html'));
});

// API endpoint for recording data
app.get('/api/recordings', (req, res) => {
  const recordings = JSON.parse(
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('video_recordings') || '[]'
      : '[]'
  );
  res.json(recordings);
});

app.post('/api/recordings', express.json(), (req, res) => {
  const { name, composition, duration, frameCount } = req.body;
  const recording = {
    id: `rec-${Date.now()}`,
    name,
    composition,
    duration,
    frameCount,
    createdAt: new Date().toISOString(),
  };
  res.json({ success: true, recording });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🎬 AIRS Studio Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  📍 Studio Dashboard: http://localhost:${PORT}
  📍 Remotion Composition: http://localhost:${PORT}/remote
  🏥 Health Check: http://localhost:${PORT}/health

  📁 Project Root: ${PROJECT_ROOT}
  📁 Public Dir: ${PUBLIC_DIR}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);

  // Start Remotion in the background (auto-select port if unavailable)
  console.log('🎥 Starting Remotion Studio (auto-detecting port)...\n');
  const remotion = spawn('remotion', ['preview', 'src/index.tsx'], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
  });

  remotion.on('error', (err) => {
    console.error('Failed to start Remotion:', err);
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down AIRS Studio...');
  process.exit(0);
});
