type ToastType = 'info' | 'success' | 'error';

interface ToastFunctions {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

export function useToast(): ToastFunctions {
  const show = (message: string, type: ToastType = 'info'): void => {
    // Simple alert for now, can be upgraded to toast library
    if (type === 'error') {
      alert('Error: ' + message);
    } else if (type === 'success') {
      alert(message);
    } else {
      alert(message);
    }
  };

  return {
    success: (msg) => show(msg, 'success'),
    error: (msg) => show(msg, 'error'),
    info: (msg) => show(msg, 'info')
  };
}
