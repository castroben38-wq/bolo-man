import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('UNHANDLED_REJECTION:', reason);
});
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('UNCAUGHT_EXCEPTION:', err);
});

async function bootstrap() {
  // eslint-disable-next-line no-console
  console.log('Bootstrap starting... PORT=' + process.env.PORT);
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGINS')?.split(',') || [],
    credentials: true,
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Health check endpoint (available in all environments)
  app.use('/health', (req: any, res: any) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'bolo-man-api',
      version: '1.0.0',
    });
  });

  // Swagger (dev only)
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Bolo-Man API')
      .setDescription('Cameroon-focused Daily Services Platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication & Authorization')
      .addTag('clients', 'Client operations')
      .addTag('providers', 'Provider operations')
      .addTag('bookings', 'Booking management')
      .addTag('payments', 'Payment processing')
      .addTag('subscriptions', 'Subscription management')
      .addTag('contacts', 'Gated contact access')
      .addTag('messaging', 'In-app messaging')
      .addTag('reviews', 'Ratings & Reviews')
      .addTag('admin', 'Admin operations')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  // Railway / cloud platforms inject PORT; fall back to APP_PORT then 3000
  const port =
    configService.get<number>('PORT') ||
    configService.get<number>('APP_PORT') ||
    3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Bolo-Man API running on port ${port}`);
  if (configService.get('NODE_ENV') !== 'production') {
    logger.log(`📚 Swagger docs: http://localhost:${port}/docs`);
  }
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('BOOTSTRAP_FAILED:', err);
  process.exit(1);
});
