import { toast } from 'sonner';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: any): string {
  // Network errors
  if (error.message === 'Failed to fetch' || error.message === 'Network request failed') {
    return 'Unable to connect to server. Please check your internet connection.';
  }

  // API errors with custom messages
  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  // HTTP status code errors
  if (error.statusCode) {
    switch (error.statusCode) {
      case 400:
        return error.message || 'Invalid request. Please check your input.';
      case 401:
        return 'Session expired. Please login again.';
      case 403:
        return 'You don\'t have permission to perform this action.';
      case 404:
        return 'Resource not found.';
      case 409:
        return error.message || 'This resource already exists.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Server error. Please try again or contact support.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }

  // Generic error
  return error.message || 'An unexpected error occurred. Please try again.';
}

export function showError(error: any) {
  const message = handleApiError(error);
  toast.error(message);
}

export function showSuccess(message: string) {
  toast.success(message);
}

export function showInfo(message: string) {
  toast.info(message);
}

export function showWarning(message: string) {
  toast.warning(message);
}
