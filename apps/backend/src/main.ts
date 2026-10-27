import './env.js';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import {
  ApiExceptionFilter,
  validationException,
} from './common/api-errors.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Serveur du contrat : http://localhost:8080/api
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      // retire les champs absents des DTOs, et renvoie 400 s'il y en a
      whitelist: true,
      forbidNonWhitelisted: true,
      // instancie les DTOs (conversion des query params, valeurs par défaut)
      transform: true,
      exceptionFactory: validationException,
    }),
  );
  await app.listen(process.env.PORT ?? 8080);
}
await bootstrap();
