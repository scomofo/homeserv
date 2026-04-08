// Simple structured logger — console-based, no external deps

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  category: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

function emit(entry: LogEntry): void {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]`;
  const line = `${prefix} ${entry.message}`;
  switch (entry.level) {
    case "error":
      console.error(line, entry.data ?? "");
      break;
    case "warn":
      console.warn(line, entry.data ?? "");
      break;
    default:
      console.log(line, entry.data ?? "");
  }
}

function createLogger(category: string) {
  function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    emit({ level, category, message, data, timestamp: new Date().toISOString() });
  }

  return {
    info: (message: string, data?: Record<string, unknown>) => log("info", message, data),
    warn: (message: string, data?: Record<string, unknown>) => log("warn", message, data),
    error: (message: string, data?: Record<string, unknown>) => log("error", message, data),
  };
}

export const authLogger = createLogger("auth");
export const automationLogger = createLogger("automation");
export const deviceLogger = createLogger("device");
export const systemLogger = createLogger("system");
