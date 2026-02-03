---
description: "Use dependency injection for external dependencies like loggers, services, and utilities"
alwaysApply: true
---

# Dependency Injection

**Rule**: Always use dependency injection for external dependencies (loggers, services, utilities) instead of importing them directly. Classes that receive injected dependencies must follow TypeScript visibility and code organization (`typescript-visibility.md`, `typescript-code-organization.md`).

## Why

- **Testability**: Easy to inject mocks for unit testing
- **Flexibility**: Swap implementations without changing class internals
- **Decoupling**: Classes don't depend on concrete implementations
- **Maintainability**: Clear dependencies make code easier to understand and modify

## Pattern

### Export Type Alias (Not Interface)

Use a type alias extracted from the actual implementation, not a custom interface:

```typescript
// In Logger.ts
import {logger as reactNativeLogger} from 'react-native-logs';

type ReactNativeLogger = ReturnType<typeof reactNativeLogger.createLogger>;

export class AppLogger {
    private static instance: ReactNativeLogger | null = null;

    public static getInstance(): ReactNativeLogger {
        if (!AppLogger.instance) {
            AppLogger.instance = reactNativeLogger.createLogger({...});
        }
        return AppLogger.instance;
    }
}

// Export type alias for dependency injection
export type LoggerInterface = ReactNativeLogger;
```

### Inject via Constructor

```typescript
import { AppLogger, LoggerInterface } from '../Service/Logger';

class MyService {
    private loggerInstance!: LoggerInterface;

    public constructor(logger: LoggerInterface = AppLogger.getInstance()) {
        this.loggerInstance = logger;
    }

    public doSomething(): void {
        this.loggerInstance.info('Doing something');
    }
}
```

### Export Singleton with Default

```typescript
// Export singleton instance (uses default logger)
export const myService = new MyService();

// Can also create instances with custom logger for testing
export function createMyService(logger: LoggerInterface): MyService {
    return new MyService(logger);
}
```

## Examples

❌ **Don't: Direct imports in class methods**

```typescript
import { AppLogger } from '../Service/Logger';

class MyService {
    doSomething(): void {
        AppLogger.getInstance().info('Doing something'); // ❌ Direct usage
    }
}
```

❌ **Don't: Define custom interfaces**

```typescript
// ❌ Don't create custom interfaces
export interface Logger {
    debug: (message: string, data?: any) => void;
    info: (message: string, data?: any) => void;
    error: (message: string, data?: any) => void;
    warn: (message: string, data?: any) => void;
}
```

✅ **Do: Use type alias from implementation**

```typescript
// ✅ In Logger.ts - extract type from actual implementation
export type LoggerInterface = ReturnType<typeof reactNativeLogger.createLogger>;
```

✅ **Do: Inject via constructor with type alias**

```typescript
import { AppLogger, LoggerInterface } from '../Service/Logger';

class MyService {
    private loggerInstance: LoggerInterface;

    constructor(logger: LoggerInterface = AppLogger.getInstance()) {
        this.loggerInstance = logger;
    }

    doSomething(): void {
        this.loggerInstance.info('Doing something'); // ✅ Use injected logger
    }
}
```

## What to Inject

- **Loggers**: Always inject loggers (see `AudioRecording` example)
- **Services**: Other service classes that the class depends on
- **Utilities**: Helper functions that might need mocking in tests
- **Configurations**: Settings and configuration objects

## What NOT to Inject

- **Framework APIs**: React hooks, React Native APIs (use directly)
- **Standard Library**: Built-in Node/JS APIs (Date, Math, etc.)
- **Type-only imports**: TypeScript types and interfaces

## Testing Example

```typescript
// In tests, inject mock logger that matches LoggerInterface type
const mockLogger: LoggerInterface = {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    // ... other methods from react-native-logs logger
} as LoggerInterface;

const service = new MyService(mockLogger);
service.doSomething();

expect(mockLogger.info).toHaveBeenCalledWith('Doing something');
```

## Reference Implementation

See `src/Service/AudioRecording.ts` for a complete example of dependency injection with logger.
