import { User } from 'src/users/interfaces/user.interface';

export interface JwtPayload {
  sub: number;
  email: string;
  role: User['role'];
}
