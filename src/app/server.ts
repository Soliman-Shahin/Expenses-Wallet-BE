import logger from './services/logger.service';
import { config } from 'dotenv';
import { connectToDB } from './db';
import { configureExpressApp } from './app';

const DEFAULT_PORT = 3000;

/**
 * Validate that all required environment variables are set
 * @throws Error if any required variable is missing
 */
function validateEnvironmentVariables(): void {
  const required = [
    'MONGO_URI',
    'ACCESS_TOKEN_SECRET',
    'REFRESH_TOKEN_SECRET',
    'ENCRYPTION_KEY',
    'SECRET_KEY',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        'Please check your .env file and ensure all required variables are set.\n' +
        'See .env.example for reference.'
    );
  }

  // Validate encryption key length (should be 64 hex characters = 32 bytes)
  const encryptionKey = process.env.ENCRYPTION_KEY!;
  if (encryptionKey.length < 64) {
    logger.warn(
      '[WARNING] ENCRYPTION_KEY should be at least 64 characters (32 bytes) for AES-256.\n' +
        "Generate a secure key with: node -e \"logger.info(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }

  logger.info('[server]: Environment variables validated successfully ✓');
}

async function startServer() {
  try {
    config();

    // Validate environment variables before starting
    validateEnvironmentVariables();

    await connectToDB();

    const app = configureExpressApp();

    const port = process.env.PORT ?? DEFAULT_PORT;
    app.listen(port, () => {
      logger.info(`[server]: Server is running at http://localhost:${port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error as Error);
    process.exit(1);
  }
}

startServer().catch((error) => {
  logger.error('Failed to start server:', error as Error);
  process.exit(1);
});
