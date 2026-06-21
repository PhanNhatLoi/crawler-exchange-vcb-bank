import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from '../src/app.module';
import { setupSwagger } from '../src/swagger';

let cachedApp: express.Express | undefined;

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
  setupSwagger(nestApp);

  await nestApp.init();
  return expressApp;
}

export default async function handler(
  req: express.Request,
  res: express.Response,
) {
  if (!cachedApp) {
    cachedApp = await bootstrap();
  }

  return cachedApp(req, res);
}
