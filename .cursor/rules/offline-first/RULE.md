---
description: "Offline-first architecture and WatermelonDB usage patterns"
alwaysApply: false
globs: ["**/database/**/*.ts", "**/features/**/hooks/**/*.ts"]
---

# Offline-First Architecture Rules

## WatermelonDB Usage

This project uses WatermelonDB for offline-first data storage and synchronization.

## Database Schema

- Define schemas in `src/database/schema.ts`
- Use `tableSchema` for each table
- Index frequently queried columns
- Use `isOptional: true` for nullable fields

## Data Flow

1. **Local First**: All data is written to local database first
2. **Queue for Sync**: Processed payloads are queued in `sync_queue` table
3. **Background Sync**: Sync queue is processed when network is available
4. **Conflict Resolution**: Use server timestamp as source of truth

## Sync Queue Pattern

```typescript
// Add to queue after processing
const payload: ProcessingPayload = await processAudio(...);
await database.write(async () => {
  await database.collections.get('sync_queue').create((record) => {
    record.payload = JSON.stringify(payload);
    record.status = 'pending';
    record.retryCount = 0;
  });
});
```

## Offline Indicators

- Check network status before attempting sync
- Show offline indicator in UI when network is unavailable
- Retry failed syncs with exponential backoff
- Mark records as `synced: true` after successful upload

## Error Handling

- Network errors should not crash the app
- Failed syncs should remain in queue
- Implement retry logic with max retry count
- Log sync failures for debugging (without PII)

## State Management

- Use Zustand for UI state
- Use WatermelonDB for persistent data
- Sync Zustand state with WatermelonDB when needed
- Keep processing queue in Zustand for real-time UI updates

## Data Models

- Create WatermelonDB models for each table
- Use `@nozbe/with-observables` for reactive queries
- Implement `@relation` for foreign keys
- Use `@field` decorators for computed properties
