import { Schema, model, Document, Model } from "mongoose";
import _ from "lodash";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "dotenv";
config();

enum SignupType {
  Normal = "normal",
  Facebook = "facebook",
  Google = "google",
}

const TOKEN_SETTINGS = {
  CUSTOM_JWT: "51778657246321226641fsdklafjasdkljfsklfjd7148924065",
  EXPIRATION_TIME: "1h",
  ALGORITHM: "HS256",
  LENGTH: 64,
};

const jwtSecret = process.env.ACCESS_TOKEN_SECRET ?? TOKEN_SETTINGS.CUSTOM_JWT;

interface IUserSession {
  token: string;
  expiresAt: number;
}

interface UserDocument extends Document {
  userId?: string;
  socialId?: string;
  signupType: SignupType;
  email: string;
  password: string;
  username?: string;
  image?: string;
  emailVerified?: boolean;
  sessions: IUserSession[];
  createSession(): Promise<string>;
  generateAccessAuthToken(): Promise<string>;
}

interface IUserModel extends Model<UserDocument> {
  findByIdAndToken(id: string, token: string): Promise<UserDocument | null>;
  hasRefreshTokenExpired(expiresAt: number): boolean;
}

// Define the user schema
const UserSchema = new Schema<UserDocument>(
  {
    userId: String,
    socialId: String,
    signupType: {
      type: String,
      enum: Object.values(SignupType),
      default: SignupType.Normal,
    },
    email: {
      type: String,
      required: true,
      minlength: 1,
      trim: true,
      unique: true,
    },
    password: { type: String, required: true, minlength: 8 },
    username: String,
    image: String,
    emailVerified: Boolean,
    sessions: [
      {
        token: { type: String, required: true },
        expiresAt: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

// *** Instance methods ***
UserSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();

  // return the document except the password and sessions (these shouldn't be made available)
  return _.omit(userObject, ["password", "sessions"]);
};

UserSchema.methods.generateAccessAuthToken = async function (): Promise<string> {
  try {
    // Ensure the payload is an object, secret is a string, and options are correctly typed
    const token: string = jwt.sign(
      { _id: this._id.toHexString() },
      jwtSecret,
      { expiresIn: "1h", algorithm: "HS256" } // SignOptions including algorithm
    );
    return token;
  } catch (error) {
    throw new Error(`JWT Sign Error: ${error}`);
  }
};

UserSchema.methods.createRefreshToken = async function (): Promise<string> {
  const buf = crypto.randomBytes(TOKEN_SETTINGS.LENGTH);
  return buf.toString("hex");
};

UserSchema.methods.createSession = async function (): Promise<string> {
  const refreshToken = await this.createRefreshToken();
  await saveSessionToDatabase(this, refreshToken);
  return refreshToken;
};

/* MODEL METHODS (static methods) */
// UserSchema.statics.getJWTSecret = () => jwtSecret;

UserSchema.statics.findByIdAndToken = async function (
  id: string,
  token: string
): Promise<UserDocument | null> {
  return this.findOne({ _id: id, "sessions.token": token });
};

UserSchema.statics.hasRefreshTokenExpired = function (
  expiresAt: number
): boolean {
  return Date.now() / 1000 > expiresAt;
};

/* HELPER METHODS */
const saveSessionToDatabase = async (user: any, refreshToken: any) => {
  // This function saves a session to the database
  // It takes the user document and the refresh token as parameters
  // It updates the user document with the refresh token and its expiration time
  // It returns a promise that resolves with the refresh token or rejects with an error

  try {
    const expiresAt = generateRefreshTokenExpiryTime();

    // Initialize user.sessions as an empty array
    user.sessions = [];

    user.sessions.push({ token: refreshToken, expiresAt });

    await user.save();

    // Returned the refresh token directly
    return refreshToken;
  } catch (error) {
    throw error;
  }
};

const generateRefreshTokenExpiryTime = () => {
  // This function calculates the expiration time of a refresh token
  // It returns the expiration time as a timestamp in seconds

  // Used a constant for the number of days until the token expires
  const DAYS_UNTIL_EXPIRE = 10;
  // Used a mathematical expression to calculate the number of seconds
  const secondsUntilExpire = DAYS_UNTIL_EXPIRE * 24 * 60 * 60;
  // Used a constant for the conversion factor from milliseconds to seconds
  const MILLISECONDS_TO_SECONDS = 1000;
  // Divided the current time by the conversion factor
  const currentTimeInSeconds = Date.now() / MILLISECONDS_TO_SECONDS;
  // Added the number of seconds until expire to the current time
  return currentTimeInSeconds + secondsUntilExpire;
};

// Create the user model using generics
const User = model<UserDocument, IUserModel>("User", UserSchema);
export { User, UserDocument };
