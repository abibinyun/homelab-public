import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    timestamp: string;
    requestId?: string;
    [key: string]: any;
  };
}

export class ResponseSerializer {
  static success<T>(res: Response, data: T, meta?: Record<string, any>): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: (res.req as any).id,
        ...meta,
      },
    };
    res.json(response);
  }

  static error(res: Response, statusCode: number, message: string, meta?: Record<string, any>): void {
    const response: ApiResponse = {
      success: false,
      error: message,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: (res.req as any).id,
        ...meta,
      },
    };
    res.status(statusCode).json(response);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }
  ): void {
    const response: ApiResponse<T[]> = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: (res.req as any).id,
        pagination,
      },
    };
    res.json(response);
  }
}
