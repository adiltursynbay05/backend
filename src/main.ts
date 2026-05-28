import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';
import { loadEnv, validateRequiredEnv } from './env';

const defaultAllowedOriginPatterns = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/[\w-]+\.onrender\.com$/,
  /^https:\/\/[\w-]+\.vercel\.app$/,
  /^https:\/\/[\w-]+\.netlify\.app$/,
  /^https:\/\/[\w-]+\.github\.io$/,
];

function getAllowedOrigins() {
  return (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isAllowedOrigin(origin: string | undefined, allowedOrigins: string[]) {
  if (!origin) return true;
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    return true;
  }

  return defaultAllowedOriginPatterns.some((pattern) => pattern.test(origin));
}

async function bootstrap() {
  loadEnv();
  validateRequiredEnv(['OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY']);

  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const allowedOrigins = getAllowedOrigins();

  app.setGlobalPrefix('api');
  app.use(json({ limit: '1mb' }));
  app.enableCors({
    credentials: true,
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin is not allowed by CORS: ${origin}`));
    },
  });

  const port = process.env.PORT ?? 5000;
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
}
void bootstrap();
