# Sync receipt migration

This is a one-time maintenance migration for databases that ran an earlier
uncommitted Phase 8 SyncFailure schema. The repository history shows the
SyncFailure and SyncRegistration model files are not present at `HEAD`, so a
shared database cannot be inferred to contain these collections from Git
history alone. Treat any database where the earlier work was exercised as
requiring this migration; a clean database needs no legacy cleanup.

## Preconditions

- Confirm the target database and backup it.
- Quiesce sync writes for the duration of the migration.
- Do not run this against production until the backup and rollback plan are
  approved.

## Command

From `Madar-Flow-BE/`, with `MONGO_URI` set in the execution
environment (without committing it), run:

```text
npx ts-node src/app/scripts/migrate-sync-receipts.ts
```

The script archives and removes legacy `sync_failures` rows that do not have
a server registration identity in `sync_failures_phase8_legacy`, drops the
obsolete `(user, entityType, entityId)` unique index, and creates/verifies the
new SyncFailure and SyncRegistration indexes. It is safe to rerun: legacy
rows are replaced in the archive and index creation is idempotent.

The migration never promotes `operationId` into trusted registration
authority.

## Verification and recovery

Verify that `sync_failures` contains no documents missing `registrationId`,
that `(user, registrationId)` is unique, and that `sync_registrations` has
unique `receiptId` and `(user, clientOperationId)` indexes. If validation
fails, stop application traffic, restore the backup, and investigate before
retrying. Legacy rows can be reviewed in the archive collection; they are not
notification-authoritative.
