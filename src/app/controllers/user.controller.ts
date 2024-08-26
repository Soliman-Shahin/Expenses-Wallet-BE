// Import the required modules
import bcrypt from 'bcryptjs';
import { NextFunction, Request, Response } from 'express';
import { omit } from 'lodash';
import { IUserModel, User, UserDocument } from '../models';
import { handleError, sendUserAndTokens } from '../shared/helper';

interface CustomRequest extends Request {
  userObject: IUserModel;
}

// Get the environment variables
const { SALT_ROUNDS } = process.env;

// Constants for header names
const ACCESS_TOKEN_HEADER = 'access-token';

// Define a type for the user credentials
type UserCredentials = { email: string; password: string };

// Define a function to validate the user credentials
const validateUserCredentials = async (
  credentials: UserCredentials
): Promise<UserDocument> => {
  // Destructure the email and password from the credentials
  const { email, password } = credentials;

  // Find the user by email
  const user = await User.findOne({ email });

  // Throw an error if the user is not found
  if (!user) {
    throw new Error('User not found');
  }

  // Compare the password with the hashed password
  const isPasswordMatch = await bcrypt.compare(password, user.password);

  // Throw an error if the password is invalid
  if (!isPasswordMatch) {
    throw new Error('Invalid Password');
  }

  // Return the user if everything is valid
  return user;
};

/**

POST /signup

Purpose: Sign up a new user */
const signUp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as UserCredentials;

    // Check if the email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already used' });
    }

    // Handle Google signup if a Google token is provided in the request
    const googleToken = req.body.googleToken;
    if (googleToken) {
      // Verify Google token and extract user information
      // Perform necessary actions to sign up or log in the user with Google
      // You can use libraries like `google-auth-library` for token verification
      // Example: const ticket = await client.verifyIdToken({ idToken: googleToken, audience: GOOGLE_CLIENT_ID });
      // For simplicity we will just set some dummy data here
      const profile = {
        name: 'John Doe',
        imageUrl: '/path/to/image.jpg',
      };

      // Create a new user with the given email and profile info
      const user = new User({
        email,
        profile,
      });

      // Save the user to the database
      await user.save();

      // Send back the created user without the sensitive password field
      return res.status(201).json({ user: omit(user.toJSON(), ['password']) });
    } else {
      // Hash the password using bcrypt and salt rounds
      const hashedPassword = await bcrypt.hash(password, Number(SALT_ROUNDS));
      const newUser = new User({ email, password: hashedPassword });
      await newUser.save();
      await sendUserAndTokens(req, res, newUser, next);
    }
  } catch (error: any) {
    handleError(error, req, res, next);
  }
};

/**

POST /users/login

Purpose: Login */
const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the user’s email and password from the request body
    const credentials = req.body as UserCredentials;

    // Validate the user credentials and get the user object
    const user = await validateUserCredentials(credentials);

    // Use helper function to send user and tokens
    await sendUserAndTokens(req, res, user, next);
  } catch (error: any) {
    handleError(error, req, res, next);
  }
};

/**

GET /users/me/access-token
Purpose: generates and returns an access token */
const userAccessToken = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    // we know that the user/caller is authenticated and we have the user_id and user object available to us
    const accessToken = await req.userObject.generateAccessAuthToken();
    res.header(ACCESS_TOKEN_HEADER, accessToken).send({ accessToken });
  } catch (error: any) {
    handleError(error, req, res, next);
  }
};

export { login, signUp, userAccessToken };
