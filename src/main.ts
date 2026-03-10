import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS - IMPORTANT!
  app.enableCors({
    origin: [process.env.FRONTEND_URL, 'http://localhost:3000'], // Frontend URL
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = configService.getOrThrow<string>('PORT') || 3001;
  await app.listen(port);

  console.log(`🚀 Application running on: http://localhost:${port}/api`);
}
bootstrap();
