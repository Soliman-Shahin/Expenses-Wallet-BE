import { Response } from "express";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code?: string;
    message: string;
    details?: any;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = "Success",
  statusCode = 200
) => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  };
  res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  errorMessage: string,
  statusCode = 500,
  errorCode?: string,
  details?: any
) => {
  const error: ApiResponse<null>["error"] = {
    code: errorCode,
    message: errorMessage,
  };

  if (details !== undefined) {
    error.details = details;
  }

  const response: ApiResponse<null> = {
    success: false,
    error,
  };

  res.status(statusCode).json(response);
};
