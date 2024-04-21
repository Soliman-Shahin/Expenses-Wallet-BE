import mongoose, { Connection } from "mongoose";
import dotenv from "dotenv";

// Initialize dotenv to use environment variables
dotenv.config();

// Define an interface for the configuration
interface DbConfig {
  uri: string;
}

// Load configuration from environment variables
const loadConfig = (): DbConfig => {
  const uri =
    process.env.MONGO_URI ||
    "mongodb+srv://admin:admin123@expenses-wallet.8ewvkfz.mongodb.net/?retryWrites=true&w=majority&appName=Expenses-Wallet";
  if (!uri) {
    throw new Error("MONGO_URI must be defined in environment variables");
  }
  return { uri };
};

// Implementing a Database class to encapsulate the connection logic
class Database {
  private static instance: Database;
  private config: DbConfig;
  private connection: Connection | null = null;

  private constructor(config: DbConfig) {
    this.config = config;
  }

  // Singleton pattern to ensure only one instance is created
  public static getInstance(): Database {
    if (!Database.instance) {
      const config = loadConfig();
      Database.instance = new Database(config);
    }
    return Database.instance;
  }

  // Connect to the database asynchronously
  public async connect(): Promise<void> {
    if (!this.connection || this.connection.readyState === 0) {
      try {
        console.log("[database]: Connecting to MongoDB...");
        await mongoose.connect(this.config.uri, {});
        this.connection = mongoose.connection;
        this.connection.on("error", this.onError);
        this.connection.on("open", this.onOpen);
      } catch (error) {
        this.handleError(error);
      }
    }
  }

  private onError = (error: any): void => {
    console.error("Error while attempting to connect to MongoDB:", error);
    process.exit(1);
  };

  // Error handler for database connection
  private handleError = (error: any): void => {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  };

  // Success handler for database connection
  private onOpen = (): void => {
    console.log("[database]: Connected to MongoDB successfully!");
  };
}

// Export a function to connect to the database
const connectToDB = async (): Promise<void> => {
  const database = Database.getInstance();
  await database.connect();
};

export { connectToDB };
