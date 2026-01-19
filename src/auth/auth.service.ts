import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../user/user.service.js';
import { MailService } from '../mail/mail.service.js';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(email);
    if (user && user.password) {
      const isMatch = await bcrypt.compare(pass, user.password);

      if (isMatch) {
        const { password, ...result } = user;
        return result;
      }
    }
    return null;
  }
  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.displayImage,
          isVerified: user.isVerified,
        },
        token: this.jwtService.sign(payload),
        auth: {
          type: 'Bearer',
          expiresIn: '1h',
        },
      },
    };
  }

  async register(userData: any) {
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await this.usersService.create({
      ...userData,
      emailVerificationToken: verificationToken,
      emailVerificationExpiry: verificationExpiry,
    });

    // Send verification email
    await this.mailService.sendVerificationEmail(user.email, verificationToken);

    const { password, emailVerificationToken, ...userWithoutSensitive } = user;
    return {
      success: true,
      message:
        'Registration successful. Please check your email to verify your account.',
      user: userWithoutSensitive,
    };
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.findByVerificationToken(token);

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    if (
      user.emailVerificationExpiry &&
      user.emailVerificationExpiry < new Date()
    ) {
      throw new BadRequestException('Verification token has expired');
    }

    await this.usersService.markEmailAsVerified(user.id);

    return {
      success: true,
      message: 'Email verified successfully. You can now login.',
    };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.usersService.findOne(email);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.usersService.updateVerificationToken(
      user.id,
      verificationToken,
      verificationExpiry,
    );

    await this.mailService.sendVerificationEmail(user.email, verificationToken);

    return {
      success: true,
      message: 'Verification email sent successfully.',
    };
  }
}
