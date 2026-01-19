import { Injectable, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/user.dto';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Find a user by email for the Authentication process
  async findOne(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  // Find a user by ID to show profile or related posts
  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { posts: true }, // Includes all posts written by this user
    });
  }

  // Create a new user with a hashed password
  async create(data: CreateUserDto) {
    // Check if user already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        displayImage: data.displayImage,
        isVerified: false,
        emailVerificationToken: data.emailVerificationToken,
        emailVerificationExpiry: data.emailVerificationExpiry,
        role: data.role || 'user',
      },
    });
  }

  // Find user by verification token
  async findByVerificationToken(token: string) {
    // @ts-ignore
    return this.prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });
  }

  // Mark email as verified
  async markEmailAsVerified(userId: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });
  }

  // Update verification token
  async updateVerificationToken(userId: number, token: string, expiry: Date) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: token,
        emailVerificationExpiry: expiry,
      },
    });
  }
}
