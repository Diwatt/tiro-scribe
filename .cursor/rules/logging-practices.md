---
description: "Logging best practices - logger handles timestamps automatically"
alwaysApply: true
---

# Logging Practices

**Rule**: Never add `timestamp` fields to log calls. The logger automatically handles timestamps.

## Why

- **Consistency**: Logger configuration (`printDate: true`, `dateFormat: 'time'`) ensures uniform timestamp formatting
- **DRY Principle**: Avoid duplicating timestamp logic in every log call
- **Maintainability**: Centralized timestamp handling makes it easier to change format globally
- **Performance**: Logger handles timestamps more efficiently than manual `new Date().toISOString()` calls

## Pattern

The logger (`AppLogger`) is configured with:
- `printDate: true` - Automatically includes timestamps
- `dateFormat: 'time'` - Formats timestamps consistently

## Examples

❌ **Don't: Add manual timestamp fields**

```typescript
logger.debug('Starting process', {
    step: 'initialization',
    timestamp: new Date().toISOString(), // ❌ Remove this
});

logger.info('Status changed', {
    state: 'active',
    previousState: 'inactive',
    timestamp: new Date().toISOString(), // ❌ Remove this
});

logger.error('Operation failed', {
    error: errorMessage,
    code: errorCode,
    timestamp: new Date().toISOString(), // ❌ Remove this
});
```

✅ **Do: Let the logger handle timestamps**

```typescript
logger.debug('Starting process', {
    step: 'initialization',
});

logger.info('Status changed', {
    state: 'active',
    previousState: 'inactive',
});

logger.error('Operation failed', {
    error: errorMessage,
    code: errorCode,
});
```

## Logger Configuration

The logger automatically includes timestamps in the output. See `src/Service/Logger.ts`:

```typescript
AppLogger.instance = reactNativeLogger.createLogger({
    // ... other config
    dateFormat: 'time',
    printDate: true,
});
```

## What to Include in Log Data

Include only **relevant context data**:
- State values
- IDs (sessionId, userId, etc.)
- Error details (message, code, stack)
- Operation parameters
- Status information

**Never include:**
- `timestamp` - Logger handles this automatically
- `new Date().toISOString()` - Logger handles this automatically
