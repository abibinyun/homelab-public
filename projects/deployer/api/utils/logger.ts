type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  requestId?: string;
  [key: string]: any;
}

class Logger {
  private log(level: LogLevel, message: string, meta?: LogContext): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(meta && { meta }),
    };

    const output = JSON.stringify(logEntry);

    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'debug':
        console.debug(output);
        break;
      default:
        console.log(output);
    }
  }

  info(message: string, meta?: LogContext): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: LogContext): void {
    this.log('warn', message, meta);
  }

  error(message: string, error?: Error | any, meta?: LogContext): void {
    this.log('error', message, {
      ...meta,
      error: error?.message,
      stack: error?.stack,
    });
  }

  debug(message: string, meta?: LogContext): void {
    this.log('debug', message, meta);
  }
}

export default new Logger();
