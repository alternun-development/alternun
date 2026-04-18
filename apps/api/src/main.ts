import './bootstrap-env';
import 'reflect-metadata';
import { initMigrations } from '../scripts/run-migrations-lambda';
import { createApp } from './common/bootstrap/create-app';

async function bootstrap(): Promise<void> {
  // Run pending database migrations before starting API
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  await initMigrations();

  const app = await createApp();
  const port = Number(process.env.PORT ?? 8082);
  const host =
    process.env.HOST ?? (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
  await app.listen(port, host);
}

void bootstrap();
