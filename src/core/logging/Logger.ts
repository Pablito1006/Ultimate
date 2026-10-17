export type LogLevel = "debug" | "info" | "warn" | "error";

export type LoggerEnvironment = "development" | "production";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    lower.includes("key") ||
    lower.includes("token") ||
    lower.includes("secret") ||
    lower.includes("password") ||
    lower.includes("apikey") ||
    lower.includes("authorization")
  );
}

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return "[MaxDepth]";
  }
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitize(item, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isSensitiveKey(key) ? "[REDACTED]" : sanitize(nested, depth + 1);
    }
    return out;
  }
  return String(value);
}

class LoggerImpl {
  private minLevel: LogLevel = "debug";

  configure(options: { environment?: LoggerEnvironment; minLevel?: LogLevel }): void {
    if (options.environment) {
      this.minLevel = options.environment === "production" ? "info" : "debug";
    }
    if (options.minLevel) {
      this.minLevel = options.minLevel;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[this.minLevel];
  }

  private write(level: LogLevel, message: string, meta?: unknown): void {
    if (!this.shouldLog(level)) {
      return;
    }
    const prefix = `[MasterMotion][${level.toUpperCase()}]`;
    const payload = meta === undefined ? undefined : sanitize(meta);
    if (level === "error") {
      if (payload !== undefined) {
        console.error(prefix, message, payload);
      } else {
        console.error(prefix, message);
      }
      return;
    }
    if (level === "warn") {
      if (payload !== undefined) {
        console.warn(prefix, message, payload);
      } else {
        console.warn(prefix, message);
      }
      return;
    }
    if (payload !== undefined) {
      console.log(prefix, message, payload);
    } else {
      console.log(prefix, message);
    }
  }

  debug(message: string, meta?: unknown): void {
    this.write("debug", message, meta);
  }

  info(message: string, meta?: unknown): void {
    this.write("info", message, meta);
  }

  warn(message: string, meta?: unknown): void {
    this.write("warn", message, meta);
  }

  error(message: string, meta?: unknown): void {
    this.write("error", message, meta);
  }
}

export const Logger = new LoggerImpl();
