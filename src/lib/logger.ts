// Logging Utility
// Provides structured logging for the application

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";

  private formatEntry(entry: LogEntry): string {
    const { timestamp, level, message, context, error } = entry;
    const base = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

    if (context) {
      return `${base} ${JSON.stringify(context)}`;
    }

    if (error) {
      return `${base}\n${error.stack || error.message}`;
    }

    return base;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
    };

    // In development, log to console with colors
    if (this.isDevelopment) {
      const colors = {
        debug: "\x1b[36m",    // cyan
        info: "\x1b[32m",     // green
        warn: "\x1b[33m",     // yellow
        error: "\x1b[31m",    // red
      };
      const reset = "\x1b[0m";

      console.log(`${colors[level]}${this.formatEntry(entry)}${reset}`);
    } else {
      // In production, log as JSON for log aggregation
      console.log(JSON.stringify(entry));
    }
  }

  debug(message: string, context?: Record<string, any>) {
    this.log("debug", message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log("warn", message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log("error", message, context, error);
  }
}

// Export singleton logger
export const logger = new Logger();

// Request logging helper
export function logRequest(method: string, path: string, statusCode: number, duration: number) {
  logger.info(`${method} ${path}`, {
    statusCode,
    duration: `${duration}ms`,
  });
}

// Error logging helper
export function logError(error: Error, context?: Record<string, any>) {
  logger.error(error.message, error, context);
}
