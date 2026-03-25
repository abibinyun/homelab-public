import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface OptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
  successMessage?: string;
  errorMessage?: string;
}

export function useOptimisticUpdate<T>() {
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(
    async (
      updateFn: () => Promise<T>,
      optimisticUpdate: () => void,
      rollback: () => void,
      options?: OptimisticUpdateOptions<T>
    ) => {
      setIsLoading(true);
      
      // Apply optimistic update immediately
      optimisticUpdate();

      try {
        const result = await updateFn();
        
        if (options?.successMessage) {
          toast.success(options.successMessage);
        }
        
        options?.onSuccess?.(result);
        return result;
      } catch (error: any) {
        // Rollback on error
        rollback();
        
        const message = options?.errorMessage || error.message || 'Operation failed';
        toast.error(message);
        
        options?.onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { execute, isLoading };
}

// Hook for debounced actions (e.g., search)
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useState(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  });

  return debouncedValue;
}

// Hook for retry logic
export function useRetry() {
  const retry = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      maxRetries: number = 3,
      delay: number = 1000
    ): Promise<T> => {
      let lastError: any;
      
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await fn();
        } catch (error) {
          lastError = error;
          
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
          }
        }
      }
      
      throw lastError;
    },
    []
  );

  return { retry };
}
