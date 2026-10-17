export type ErrorCode =
  | "APP_ERROR"
  | "PREMIERE_ERROR"
  | "VALIDATION_ERROR"
  | "PERMISSION_ERROR"
  | "NETWORK_ERROR"
  | "TRANSCRIPTION_ERROR"
  | "TEMPLATE_ERROR"
  | "TRANSACTION_ERROR"
  | "COMPATIBILITY_ERROR"
  | "NOT_AVAILABLE";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly userMessage: string;
  readonly details?: unknown;

  constructor(
    code: ErrorCode,
    userMessage: string,
    options?: { cause?: unknown; details?: unknown }
  ) {
    super(userMessage);
    this.name = "AppError";
    this.code = code;
    this.userMessage = userMessage;
    this.details = options?.details;
    if (options?.cause !== undefined) {
      Object.defineProperty(this, "cause", {
        value: options.cause,
        enumerable: false,
        configurable: true,
        writable: true,
      });
    }
  }
}

export class PremiereError extends AppError {
  constructor(userMessage: string, options?: { cause?: unknown; details?: unknown }) {
    super("PREMIERE_ERROR", userMessage, options);
    this.name = "PremiereError";
  }
}

export class ValidationError extends AppError {
  constructor(userMessage: string, options?: { cause?: unknown; details?: unknown }) {
    super("VALIDATION_ERROR", userMessage, options);
    this.name = "ValidationError";
  }
}

export class PermissionError extends AppError {
  constructor(userMessage: string, options?: { cause?: unknown; details?: unknown }) {
    super("PERMISSION_ERROR", userMessage, options);
    this.name = "PermissionError";
  }
}

export class NetworkError extends AppError {
  constructor(userMessage: string, options?: { cause?: unknown; details?: unknown }) {
    super("NETWORK_ERROR", userMessage, options);
    this.name = "NetworkError";
  }
}

export class TranscriptionError extends AppError {
  constructor(userMessage: string, options?: { cause?: unknown; details?: unknown }) {
    super("TRANSCRIPTION_ERROR", userMessage, options);
    this.name = "TranscriptionError";
  }
}

export class TemplateError extends AppError {
  constructor(userMessage: string, options?: { cause?: unknown; details?: unknown }) {
    super("TEMPLATE_ERROR", userMessage, options);
    this.name = "TemplateError";
  }
}

export class TransactionError extends AppError {
  constructor(userMessage: string, options?: { cause?: unknown; details?: unknown }) {
    super("TRANSACTION_ERROR", userMessage, options);
    this.name = "TransactionError";
  }
}

export function toUserMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.userMessage;
  }
  if (error instanceof Error) {
    return error.message || "An unexpected error occurred.";
  }
  return "An unexpected error occurred.";
}
