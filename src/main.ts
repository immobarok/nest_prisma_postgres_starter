import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ContextService } from './common/context/context.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // --- 2. Register Global Exception Filter ---
  const httpAdapterHost = app.get(HttpAdapterHost);
  const contextService = app.get(ContextService);
  app.useGlobalFilters(
    new AllExceptionsFilter(httpAdapterHost, contextService),
  );

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
