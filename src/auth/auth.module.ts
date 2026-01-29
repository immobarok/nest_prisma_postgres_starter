import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ContextModule } from '../common/context/context.module'; // To import PrismaService
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ContextModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod',
      signOptions: { expiresIn: '1d' },
    }),
    BullModule.registerQueue({ name: 'email-queue' }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtStrategy, PassportModule],
})
export class AuthModule {}
