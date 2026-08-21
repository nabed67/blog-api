import type { User as PrismaUser } from 'generated/prisma/client';

export interface User extends Omit<PrismaUser, 'password'> {}
