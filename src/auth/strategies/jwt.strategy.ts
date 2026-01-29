import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../common/context/prisma.service'; // Adjust path

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod', // Ideally strictly env
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    // The payload.sub is the user id we signed in auth.service
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      omit: { password: true },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    // Exclude password from the user object returned to the request context
    const { ...result } = user;
    return result;
  }
}
