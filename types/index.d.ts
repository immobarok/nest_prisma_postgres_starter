import { Request as ExpressRequest } from 'express';
import { Role } from 'src/generated/prisma/enums';
export interface RequestWithUser extends ExpressRequest {
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string;
    dueDate: Date;
    role: Role;
  };
}
