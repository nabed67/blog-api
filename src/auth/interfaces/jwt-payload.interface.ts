import { User } from './user.interface';

export interface JwtPayload {
  sub: number;
  email: string;
  role: User['role'];
}
