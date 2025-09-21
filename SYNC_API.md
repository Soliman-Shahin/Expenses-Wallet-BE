# Sync API Documentation

This document describes the synchronization API endpoints for the Expenses Wallet application.

## Overview

The sync API provides endpoints for synchronizing data between the client and server, handling conflicts, and managing offline operations.

## Base URL

```
/v1/sync
```

## Authentication

All endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Endpoints

### 1. Pull Data

**GET** `/sync/pull`

Pulls sync data from the server.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lastSyncTime` | string (ISO8601) | No | Last sync timestamp |
| `entityType` | string | No | Entity type filter (expense, category, user) |
| `limit` | number | No | Maximum number of entities (1-100, default: 50) |
| `offset` | number | No | Number of entities to skip (default: 0) |

#### Response

```json
{
  "entities": [
    {
      "_id": "string",
      "_entityType": "expense|category|user",
      "_lastModified": "2024-01-15T10:30:00Z",
      "_version": 1,
      "_syncStatus": "synced",
      // ... entity data
    }
  ],
  "conflicts": [],
  "lastSyncTime": "2024-01-15T10:30:00Z",
  "hasMore": false,
  "totalCount": 25
}
```

### 2. Push Data

**POST** `/sync/push`

Pushes sync data to the server.

#### Request Body

```json
{
  "entities": [
    {
      "_id": "string",
      "_entityType": "expense|category|user",
      "_lastModified": "2024-01-15T10:30:00Z",
      "_version": 1,
      "_isDeleted": false,
      // ... entity data
    }
  ]
}
```

#### Response

```json
{
  "success": true,
  "conflicts": []
}
```

### 3. Bulk Sync

**POST** `/sync/bulk`

Performs bulk sync operation.

#### Request Body

```json
{
  "entities": [
    // ... array of entities
  ]
}
```

#### Response

```json
{
  "success": true,
  "results": [
    {
      "success": true,
      "entity": {},
      "conflict": false
    }
  ]
}
```

### 4. Get Conflicts

**GET** `/sync/conflicts`

Retrieves user conflicts.

#### Response

```json
[
  {
    "entityId": "string",
    "entityType": "expense|category|user",
    "localData": {},
    "serverData": {},
    "resolution": "local|server|merge",
    "timestamp": "2024-01-15T10:30:00Z"
  }
]
```

### 5. Resolve Conflict

**POST** `/sync/conflicts/resolve`

Resolves a conflict.

#### Request Body

```json
{
  "entityId": "string",
  "entityType": "expense|category|user",
  "resolution": "local|server|merge",
  "mergedData": {} // Optional, required for merge resolution
}
```

#### Response

```json
{
  "success": true
}
```

### 6. Get Sync Metadata

**GET** `/sync/metadata`

Retrieves sync metadata.

#### Response

```json
{
  "lastSyncTime": "2024-01-15T10:30:00Z",
  "totalEntities": 100,
  "pendingCount": 5,
  "conflictCount": 2,
  "errorCount": 0,
  "isOnline": true,
  "isSyncing": false
}
```

### 7. Update Sync Metadata

**PUT** `/sync/metadata`

Updates sync metadata.

#### Request Body

```json
{
  "lastSyncTime": "2024-01-15T10:30:00Z",
  "totalEntities": 100,
  "pendingCount": 5,
  "conflictCount": 2,
  "errorCount": 0,
  "isOnline": true,
  "isSyncing": false
}
```

#### Response

```json
{
  "success": true
}
```

### 8. Force Sync

**POST** `/sync/force-sync`

Forces sync of all data.

#### Response

```json
{
  "success": true,
  "message": "Sync completed. 25 entities synced."
}
```

### 9. Get Sync Status

**GET** `/sync/status`

Gets current sync status.

#### Response

```json
{
  "metadata": {},
  "conflicts": 2,
  "isOnline": true,
  "lastSyncTime": "2024-01-15T10:30:00Z",
  "pendingCount": 5,
  "conflictCount": 2,
  "errorCount": 0
}
```

### 10. Cleanup Sync Data

**DELETE** `/sync/cleanup`

Cleans up old sync data.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `olderThanDays` | number | No | Days threshold (1-365, default: 30) |

#### Response

```json
{
  "success": true
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request

```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "entityType",
      "message": "Invalid entity type"
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 429 Too Many Requests

```json
{
  "success": false,
  "message": "Too many sync requests. Please try again later.",
  "retryAfter": 900
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Sync operation failed",
  "error": "Internal server error"
}
```

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per user
- **Headers**: 
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

## Sync Headers

All sync endpoints include the following headers:

- `X-Sync-Version`: API version (1.0.0)
- `X-Sync-Timestamp`: Response timestamp
- `Cache-Control`: no-cache, no-store, must-revalidate
- `Pragma`: no-cache
- `Expires`: 0

## Data Models

### Sync Entity

```typescript
interface SyncEntity {
  _id: string;
  _entityType: 'expense' | 'category' | 'user';
  _lastModified: Date;
  _version: number;
  _syncStatus: 'synced' | 'pending' | 'conflict' | 'error' | 'offline';
  _isDeleted?: boolean;
  _conflictData?: any;
  _clientId?: string;
  // ... entity-specific fields
}
```

### Conflict Resolution

```typescript
interface ConflictResolution {
  entityId: string;
  entityType: string;
  localData: any;
  serverData: any;
  resolution: 'local' | 'server' | 'merge';
  mergedData?: any;
  timestamp: Date;
}
```

## Best Practices

1. **Pull before Push**: Always pull data before pushing to avoid conflicts
2. **Batch Operations**: Use bulk sync for multiple entities
3. **Conflict Resolution**: Resolve conflicts promptly to maintain data consistency
4. **Rate Limiting**: Respect rate limits to avoid throttling
5. **Error Handling**: Implement proper error handling and retry logic
6. **Offline Support**: Cache data locally for offline operations

## Examples

### Basic Sync Flow

```javascript
// 1. Pull data from server
const pullResponse = await fetch('/v1/sync/pull?lastSyncTime=2024-01-15T10:00:00Z', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { entities, conflicts } = await pullResponse.json();

// 2. Process conflicts
for (const conflict of conflicts) {
  const resolution = await resolveConflict(conflict);
  await fetch('/v1/sync/conflicts/resolve', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(resolution)
  });
}

// 3. Push local changes
const pushResponse = await fetch('/v1/sync/push', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ entities: localEntities })
});
```

### Conflict Resolution

```javascript
// Resolve conflict using local data
await fetch('/v1/sync/conflicts/resolve', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    entityId: 'expense_123',
    entityType: 'expense',
    resolution: 'local'
  })
});

// Resolve conflict using merged data
await fetch('/v1/sync/conflicts/resolve', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    entityId: 'expense_123',
    entityType: 'expense',
    resolution: 'merge',
    mergedData: {
      description: 'Updated description',
      amount: 50.00,
      // ... other fields
    }
  })
});
```
