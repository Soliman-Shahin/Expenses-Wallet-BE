import mongoose from 'mongoose';
import { config } from 'dotenv';
import { UserNotification } from '../models/user-notification.model';

config();

const SUPERSEDED_INDEXES = [
  'userId_1_readAt_1_createdAt_-1',
  'userId_1_createdAt_-1__id_-1',
];

async function migrateNotificationIndexes(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI must be defined');

  await mongoose.connect(uri);
  const collection = UserNotification.collection;
  const existing = await collection.indexes();
  const existingNames = new Set(existing.map((index) => index.name));

  for (const indexName of SUPERSEDED_INDEXES) {
    if (existingNames.has(indexName)) await collection.dropIndex(indexName);
  }

  await UserNotification.createIndexes();
  await mongoose.disconnect();
}

migrateNotificationIndexes().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
