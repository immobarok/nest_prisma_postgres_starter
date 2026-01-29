import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/context/prisma.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { User } from 'src/generated/prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @InjectQueue('email-queue') private emailQueue: Queue,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async register(createAuthDto: CreateAuthDto) {
    const { email, password, fullName } = createAuthDto;

    // 1. Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // 2. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await this.cacheManager.set(
      `auth:registration:${email}`,
      hashedPassword,
      60000,
    );

    // 3. Create the user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        role: 'USER',
        avatarUrl: '',
      },
    });

    // 3.1. Send a welcome email
    await this.emailQueue.add('send-welcome-email', {
      email: user.email,
      fullName: user.fullName,
    });

    // 4. Return token
    return this.generateToken(user);
  }

  // ... rest of the file (login, generateToken) remains the same
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, `${user.password}`);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateToken(user);
  }

  private async generateToken(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const hashedPassword = await this.cacheManager.get(
      `auth:registration:${user.email}`,
    );
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      hashedPassword,
    };
  }
}
