// Isolated test configuration: never load workspace credentials or remote databases.
jest.mock('dotenv', () => ({ config: jest.fn() }));
process.env.ACCESS_TOKEN_SECRET = 'auth-session-unit-test-secret-only';
process.env.NODE_ENV = 'test';
process.env.REFRESH_TOKEN_EXPIRY_DAYS = '10';
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
let database;
beforeAll(async () => {
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri());
}, 600000);
afterEach(async () => {
  if (mongoose.connection.db) await mongoose.connection.db.dropDatabase();
  jest.restoreAllMocks();
});
afterAll(async () => {
  await mongoose.disconnect();
  if (database) await database.stop();
});
