import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from '../src/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Crawler Exchange API')
    .setDescription('API documentation for crawler exchange service')
    .setVersion('1.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(nestApp, swaggerConfig);
  SwaggerModule.setup('docs', nestApp, swaggerDocument, {
    jsonDocumentUrl: 'docs-json',
    customCssUrl: 'https://unpkg.com/swagger-ui-dist/swagger-ui.css',
    customJs: [
      'https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js',
      'https://unpkg.com/swagger-ui-dist/swagger-ui-standalone-preset.js',
    ],
    swaggerOptions: {
      url: '/docs-json',
    },
  });

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
