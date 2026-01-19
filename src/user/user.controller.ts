import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './user.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Get current user profile (Protected)
  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async getUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }
}
