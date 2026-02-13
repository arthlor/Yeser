export type AppErrorType = 'auth' | 'network' | 'validation' | 'server' | 'permission' | 'unknown';

export class AppError extends Error {
  type: AppErrorType;
  details?: Record<string, unknown>;

  constructor(type: AppErrorType, message: string, details?: Record<string, unknown>) {
    super(message);
    this.type = type;
    this.details = details;
    this.name = 'AppError';
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Authentication required', details?: Record<string, unknown>) {
    super('auth', message, details);
    this.name = 'AuthError';
  }
}

export class PermissionError extends AppError {
  constructor(message: string = 'Access denied', details?: Record<string, unknown>) {
    super('permission', message, details);
    this.name = 'PermissionError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network error', details?: Record<string, unknown>) {
    super('network', message, details);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation error', details?: Record<string, unknown>) {
    super('validation', message, details);
    this.name = 'ValidationError';
  }
}

export class ServerError extends AppError {
  constructor(message: string = 'Server error', details?: Record<string, unknown>) {
    super('server', message, details);
    this.name = 'ServerError';
  }
}

export class UnknownError extends AppError {
  constructor(message: string = 'Unknown error', details?: Record<string, unknown>) {
    super('unknown', message, details);
    this.name = 'UnknownError';
  }
}

export const isAppError = (error: unknown): error is AppError => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  return 'type' in error && 'message' in error;
};
