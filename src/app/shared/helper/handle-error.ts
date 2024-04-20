import { Response, Request, NextFunction } from "express";
// Base custom error class
class BaseError extends Error {
  code: string;

  constructor(name: string, code: string, message: string) {
    super(message);
    this.name = name;
    this.code = code;
  }
}

// NotFoundError class
class NotFoundError extends BaseError {
  constructor(message: string) {
    super("NotFoundError", "ENOENT", message);
  }
}

// ValidationError class
class ValidationError extends BaseError {
  constructor(message: string) {
    super("ValidationError", "EVALID", message);
  }
}

// Improved error handler
const handleError = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction // You might not use it, but it needs to be there for error handling middleware
) => {
  // Determine the status code based on error type
  const statusCode =
    error instanceof NotFoundError
      ? 404
      : error instanceof ValidationError
      ? 400
      : 500;

  // Send the error response
  res.status(statusCode).send({
    status: statusCode,
    message: error.message || "An unexpected error occurred",
  });
};

export { handleError, NotFoundError, ValidationError };
