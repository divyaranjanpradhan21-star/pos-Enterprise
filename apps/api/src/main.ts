import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for Vercel frontend and local development
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Setup Swagger OpenAPI specification
  const config = new DocumentBuilder()
    .setTitle('Enterprise Restaurant POS Platform API')
    .setDescription(
      'Mission-critical modular monolith backend with PostgreSQL RLS, exact decimal financials, and gap-free invoicing.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env['PORT'] || 4000;
  await app.listen(port);
  console.log(`🚀 POS Enterprise Server listening on port http://localhost:${port}`);
  console.log(`📑 Swagger Documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
