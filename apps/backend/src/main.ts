import './env.js';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import {
  ApiExceptionFilter,
  validationException,
} from './common/api-errors.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // En-têtes de sécurité HTTP (HSTS, nosniff, frameguard…) et suppression de X-Powered-By.
  // API JSON sans HTML : la CSP par défaut de helmet n'a pas d'intérêt ici et est désactivée.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  // Serveur du contrat : http://localhost:8080/api
  app.setGlobalPrefix('api');

  // Le front appelle l'API depuis le navigateur (îlots Svelte). Origines séparées par des virgules.
  // Les en-têtes demandés au prévol (Authorization, Prefer du mock) sont autorisés tels quels.
  app.enableCors({
    origin: (process.env.CORS_ORIGIN || 'http://localhost:4321').split(','),
  });

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
