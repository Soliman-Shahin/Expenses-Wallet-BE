import { handleError } from ".";
import { Request, NextFunction, Response } from "express"; // Assuming you're using Express

// Constants for header names
const REFRESH_TOKEN_HEADER = "refresh-token";
const ACCESS_TOKEN_HEADER = "access-token";

// Helper function for sending user and tokens
const sendUserAndTokens = async (
  req: Request,
  res: Response,
  user: any,
  next: NextFunction
): Promise<void> => {
  try {
    const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
    if (!ACCESS_TOKEN_SECRET) {
      throw new Error(
        "ACCESS_TOKEN_SECRET is not defined in environment variables"
      );
    }

    // Generate and send tokens in the response headers
    const [refreshToken, accessToken] = await generateAndSendTokens(
      res,
      user,
      ACCESS_TOKEN_SECRET
    );
    // Send user in the response body
    res.json(user);
  } catch (error: any) {
    handleError(error, req, res, next);
  }
};

// Helper function for generating and sending tokens
const generateAndSendTokens = async (
  res: Response,
  user: any,
  accessTokenSecret: string
): Promise<string[]> => {
  // Generate refresh token and save it in the user's session
  const refreshToken = await user.createSession();
  // Generate access token using secret key
  const accessToken = await user.generateAccessAuthToken(accessTokenSecret);
  // Send tokens in the response headers
  res
    .setHeader(REFRESH_TOKEN_HEADER, refreshToken)
    .setHeader(ACCESS_TOKEN_HEADER, accessToken);
  // Return tokens as an array
  return [refreshToken, accessToken];
};

export { sendUserAndTokens };
