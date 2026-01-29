import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithUser } from 'types';

export const GetUser = createParamDecorator(
  (data: keyof RequestWithUser['user'] | undefined, ctx: ExecutionContext) => {
    const request: RequestWithUser = ctx.switchToHttp().getRequest();
    // request.user is populated by the JwtStrategy validate method
    if (data) {
      return request.user[data];
    }
    return request.user;
  },
);
