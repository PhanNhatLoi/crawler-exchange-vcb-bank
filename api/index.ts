import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from '../src/app.module';

let cachedApp: any;

async function bootstrap() {
  const expressApp = express();
  const nestApp = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  nestApp.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: false,
  });
  nestApp.setGlobalPrefix('api/v1');

  await nestApp.init();
  return expressApp;
}

export default async function handler(req: any, res: any) {
  try {
    if (!cachedApp) {
      cachedApp = await bootstrap();
    }

    return cachedApp(req, res);
  } catch (error: any) {
    console.error('Serverless handler crashed', error);
    return res.status(500).json({
      status: 'error',
      message: error?.message || 'Serverless function crashed',
    });
  }
}
