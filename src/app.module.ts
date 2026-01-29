/**
 * app.module.ts
 */
import {
  BadRequestException,
  MiddlewareConsumer,
  Module,
  NestModule,
  ValidationPipe,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ContextModule } from './common/context/context.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { APP_INTERCEPTOR, APP_PIPE, Reflector } from '@nestjs/core';
import { ResponseStandardizationInterceptor } from './common/interceptors/response-standardization.interceptor';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [ContextModule, ConfigModule.forRoot(), AuthModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseStandardizationInterceptor,
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        exceptionFactory: (errors) => {
          return new BadRequestException(errors);
        },
      }),
    },
    Reflector,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, RequestLoggerMiddleware)
      .forRoutes('*path');
  }
}
