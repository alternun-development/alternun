// Alternun status checker — Lambda handler. Zero third-party deps (AWS SDK v3 is in the runtime).
//
// Two entry points:
//   handler        — scheduled: run checkAll(), write status.json + status.html + append history.json to S3.
//   viewerHandler  — optional Function URL: redirect to the S3 page, or return status.json.
//
// Env: STATUS_BUCKET (required), HISTORY_MAX (default 500).
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { checkAll } from './checker.mjs';
import { renderPage } from './page.mjs';

const BUCKET = process.env.STATUS_BUCKET;
const HISTORY_MAX = Number(process.env.HISTORY_MAX || 500);
const s3 = new S3Client({});

async function readJson(key, fallback) {
  try {
    const r = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    return JSON.parse(await r.Body.transformToString());
  } catch {
    return fallback;
  }
}

async function put(key, body, contentType) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'no-store, max-age=0',
    })
  );
}

/** Scheduled entry: probe, persist status + page + history to S3. */
export async function handler() {
  if (!BUCKET) throw new Error('STATUS_BUCKET is not set');
  const data = await checkAll();
  const history = await readJson('history.json', []);
  history.push({
    at: data.generatedAt,
    overall: data.overall,
    prod: data.environments.prod?.status,
    dev: data.environments.dev?.status,
  });

  await Promise.all([
    put('status.json', JSON.stringify(data, null, 2), 'application/json'),
    put('index.html', renderPage(data, 60000), 'text/html; charset=utf-8'),
    put('history.json', JSON.stringify(history.slice(-HISTORY_MAX)), 'application/json'),
  ]);
  return { ok: true, overall: data.overall, generatedAt: data.generatedAt };
}
