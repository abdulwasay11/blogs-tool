import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const uploads = join(process.cwd(), 'uploads');
  if (!existsSync(uploads)) mkdirSync(uploads, { recursive: true });

  app.setGlobalPrefix('api');
  app.useBodyParser('json', { limit: '10mb' });
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .map((origin) => origin.replace(/\/+$/, ''))
    .filter(Boolean);
  app.enableCors({
    origin: (origin, callback) => {
      const normalizedOrigin = origin?.replace(/\/+$/, '');
      const allowed =
        !normalizedOrigin ||
        allowedOrigins.includes(normalizedOrigin) ||
        allowedOrigins.includes('*') ||
        normalizedOrigin.endsWith('.vercel.app');
      if (allowed) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by CORS'));
    },
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useStaticAssets(uploads, { prefix: '/uploads' });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Pressroom API running on http://localhost:${port}/api`);
}
bootstrap();
