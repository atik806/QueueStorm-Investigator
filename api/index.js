const { NestFactory } = require('@nestjs/core');
const {
  ValidationPipe, BadRequestException, UnprocessableEntityException,
} = require('@nestjs/common');
const helmet = require('helmet');
const { AppModule } = require('./dist/app.module');
const { AllExceptionsFilter } = require('./dist/common/filters/all-exceptions.filter');
const { LoggingInterceptor } = require('./dist/common/interceptors/logging.interceptor');

let expressApp;

async function getApp() {
  if (expressApp) return expressApp;

  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors();

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    exceptionFactory: (errors) => {
      const messages = errors.map((e) => `${e.property}: ${Object.values(e.constraints || {}).join(', ')}`);
      const message = messages.join('; ');
      const isMissingField = errors.some((e) => e.value === undefined || e.value === null);
      const hasOnlySemanticError = !isMissingField && errors.some((e) => {
        const constraints = Object.keys(e.constraints || {});
        return constraints.some((c) => c === 'isNotEmpty' || c === 'isEnum' || c === 'arrayNotEmpty' || c === 'minLength' || c === 'maxLength');
      });
      if (hasOnlySemanticError) return new UnprocessableEntityException(message);
      return new BadRequestException(message);
    },
  }));

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.init();

  expressApp = app.getHttpAdapter().getInstance();
  return expressApp;
}

module.exports = async function handler(req, res) {
  try {
    const app = await getApp();
    app(req, res);
  } catch (err) {
    console.error('VERCEL_ERROR:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message }));
    }
  }
};
