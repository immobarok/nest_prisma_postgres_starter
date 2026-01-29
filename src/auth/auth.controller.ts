import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import type { User } from 'src/generated/prisma/client';
import { GetUser } from './decorators/get-user.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ResponseMessage('User registered successfully')
  async register(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.register(createAuthDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // Example of a protected route to test the JWT strategy
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getProfile(@GetUser() user: User) {
    return user;
  }
}
