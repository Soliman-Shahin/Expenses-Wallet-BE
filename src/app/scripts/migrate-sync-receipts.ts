import mongoose from 'mongoose';
import { config } from 'dotenv';

config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/expenses-wallet';

async function migrateSyncReceipts(): Promise<void> {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection is not ready');

  const failures = db.collection('sync_failures');
  const legacy = db.collection('sync_failures_phase8_legacy');
  const legacyRows = await failures.find({ registrationId: { $exists: false } }).toArray();

  if (legacyRows.length) {
    await legacy.deleteMany({});
    await legacy.insertMany(legacyRows);
    await failures.deleteMany({ _id: { $in: legacyRows.map((row) => row._id) } });
  }

  for (const index of await failures.listIndexes().toArray()) {
    const keys = Object.keys(index.key || {});
    if (keys.length === 3 && keys[0] === 'user' && keys[1] === 'entityType' && keys[2] === 'entityId') {
      await failures.dropIndex(index.name);
    }
  }
  await failures.createIndex({ user: 1, registrationId: 1 }, { unique: true });
  await failures.createIndex({ user: 1, operationId: 1 });

  const registrations = db.collection('sync_registrations');
  await registrations.createIndex({ receiptId: 1 }, { unique: true });
  await registrations.createIndex({ user: 1, clientOperationId: 1 }, { unique: true });
}

migrateSyncReceipts()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
