import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DetailedLoggingInterceptor } from './common/interceptor/detailed-logging.interceptor';
import { CustomResponseFilter } from './common/filter/logging-exception.filter';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new DetailedLoggingInterceptor());
  app.useGlobalFilters(new CustomResponseFilter());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 ~ App is running on: http://localhost:${port}/api/v1`);
}
bootstrap();
