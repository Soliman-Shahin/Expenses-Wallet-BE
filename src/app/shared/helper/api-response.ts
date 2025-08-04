import { Response } from 'express';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code?: string;
    message: string;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Success',
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
  errorCode?: string
) => {
  const response: ApiResponse<null> = {
    success: false,
    error: {
      code: errorCode,
      message: errorMessage,
    },
  };
  res.status(statusCode).json(response);
};
