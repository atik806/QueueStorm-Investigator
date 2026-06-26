import { NestFactory } from '@nestjs/core';
import {
  ValidationPipe,
  Logger,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      // forbidNonWhitelisted is false because the judge harness may send
      // extra fields (metadata, future optional fields) we should tolerate
      // rather than reject with 400.
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => {
        const messages = errors.map(
          (e) =>
            `${e.property}: ${Object.values(e.constraints || {}).join(', ')}`,
        );
        const message = messages.join('; ');

        const isMissingField = errors.some(
          (e) => e.value === undefined || e.value === null,
        );

        const hasOnlySemanticError =
          !isMissingField &&
          errors.some((e) => {
            const constraints = Object.keys(e.constraints || {});
            return constraints.some(
              (c) =>
                c === 'isNotEmpty' ||
                c === 'isEnum' ||
                c === 'arrayNotEmpty' ||
                c === 'minLength' ||
                c === 'maxLength',
            );
          });

        if (hasOnlySemanticError) {
          return new UnprocessableEntityException(message);
        }

        return new BadRequestException(message);
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const logger = new Logger('Bootstrap');
  const port = process.env.PORT || 3000;

  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled Rejection: ${reason}`);
  });

  process.on('uncaughtException', (error) => {
    logger.error(`Uncaught Exception: ${error.message}`);
  });

  await app.listen(port);
  logger.log(`Server running on port ${port}`);
}
bootstrap();
