import { Request, Response, NextFunction } from "express";
import authService from "../services/auth.service.js";
import storageRepository from "../repositories/storage.repository.js";
import { UnauthorizedError } from "../types/index.js";


export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      throw new UnauthorizedError();
    }

    const session = await authService.validateSession(token);

    // Get user ID from database
    const user = await storageRepository.getUserByUsername(session.username);
    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    const isAdmin = session.username === 'admin';

    const dbRole = (user as any).role || (isAdmin ? 'admin' : 'client');

    req.user = {
      username: session.username,
      userId: (user as any).id,
      isAdmin,
      role: dbRole,
      clientId: (user as any).client_id || undefined,
    };

    next();
  } catch (error) {
    next(error);
  }
}
