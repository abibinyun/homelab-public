import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/index.js';
import { ResponseSerializer } from '../utils/response.js';
import logger from '../utils/logger.js';

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    logger.warn('Operational error', {
      requestId: req.id,
      statusCode: err.statusCode,
      message: err.message,
      path: req.path,
    });

    ResponseSerializer.error(res, err.statusCode, err.message);
    return;
  }

  // Unexpected errors
  logger.error('Unexpected error', err, { requestId: req.id, path: req.path });

  ResponseSerializer.error(res, 500, 'Internal server error');
}

export function notFoundHandler(_req: Request, res: Response): void {
  ResponseSerializer.error(res, 404, 'Route not found');
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
