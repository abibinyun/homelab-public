import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        username: string;
        userId: number;
        isAdmin: boolean;
        role?: string;
        clientId?: number;
      };
      id?: string;
    }
  }
}
