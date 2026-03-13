// API Error Handler Utility
// Provides consistent error handling across all API routes

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "APIError";
  }
}

export class ValidationError extends APIError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class NotFoundError extends APIError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends APIError {
  constructor(message: string = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends APIError {
  constructor(message: string = "Forbidden") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends APIError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
    this.name = "ConflictError";
  }
}

// Error handler wrapper for API routes
export function handleAPIError(error: unknown) {
  console.error("API Error:", error);

  if (error instanceof APIError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  // Handle known errors
  if (error instanceof Error) {
    // Don't expose internal error messages in production
    const message = process.env.NODE_ENV === "production"
      ? "服务器内部错误"
      : error.message;

    return {
      error: message,
      code: "INTERNAL_ERROR",
      statusCode: 500,
    };
  }

  // Unknown error
  return {
    error: "未知错误",
    code: "UNKNOWN_ERROR",
    statusCode: 500,
  };
}

// Safe async handler wrapper
export function withErrorHandler(
  handler: (request: Request, ...args: any[]) => Promise<Response>
) {
  return async function (request: Request, ...args: any[]) {
    try {
      return await handler(request, ...args);
    } catch (error) {
      const { error: message, statusCode } = handleAPIError(error);
      return Response.json({ error: message }, { status: statusCode });
    }
  };
}
