import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../types/index.js';

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
        next(new ValidationError(messages));
      } else {
        next(error);
      }
    }
  };
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
        next(new ValidationError(messages));
      } else {
        next(error);
      }
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
        next(new ValidationError(messages));
      } else {
        next(error);
      }
    }
  };
}
