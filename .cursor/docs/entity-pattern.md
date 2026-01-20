# Entity Pattern (Drizzle ORM)

## Overview

The Entity folder follows the exact same architectural pattern as the old Model folder, but adapted for Drizzle ORM instead of WatermelonDB.

## Pattern Comparison

### Old Model (WatermelonDB)
```typescript
import {Model} from '@nozbe/watermelondb';
import {field, date} from '@nozbe/watermelondb/decorators';

export class QueueItem extends Model {
    public static readonly tableName = 'queue_items';
    public static readonly schemaSpec = { /* ... */ };
    
    @field('status')
    public status!: QueueItemStatus;
    
    @date('created_at')
    public createdAt!: Date;
    
    public get isProcessable(): boolean {
        return this.status === QueueItemStatus.PENDING;
    }
}
```

### New Entity (Drizzle ORM)
```typescript
import type {QueueItem as QueueItemSchema} from '@Database/schema';

export class QueueItem {
    public static readonly tableName = 'queue_items';
    
    public readonly status: QueueItemStatus;
    public readonly createdAt: Date;
    
    constructor(data: QueueItemSchema) {
        this.status = data.status as QueueItemStatus;
        this.createdAt = new Date(data.createdAt);
    }
    
    public get isProcessable(): boolean {
        return this.status === QueueItemStatus.PENDING;
    }
    
    public static fromDatabase(data: QueueItemSchema): QueueItem {
        return new QueueItem(data);
    }
}
```

## Entities Created

| Entity | Features | Business Logic |
|--------|----------|----------------|
| **QueueItem** | Processing queue management | `isProcessable` getter |
| **Therapist** | Therapist accounts | `getProjectionKey()` method |
| **Subject** | Patient/subject data | Privacy-preserving biocode |
| **Encounter** | Therapy sessions | `isActive`, `isCompleted`, `duration` getters |
| **TranscriptionSegment** | Whisper transcripts | `hasHighConfidence`, time formatting |

## Key Features

### ✅ Same Structure
- Static `tableName` property
- Instance properties matching database schema
- Business logic methods preserved
- Helper getters maintained
- Interface contract (`InterfaceEntity`)

### ✅ Same Patterns
```typescript
// Constructor pattern
constructor(data: SchemaType) { }

// Factory method
static fromDatabase(data: SchemaType): Entity { }

// Conversion method
toDatabase(): SchemaType { }

// Business logic
public get helperMethod(): ReturnType { }
```

### ✅ OOP Principles
- Encapsulation: readonly properties
- Single Responsibility: entity wraps database record + logic
- Interface Segregation: `InterfaceEntity` contract
- Dependency Inversion: depends on schema types, not concrete DB

## Usage Examples

### Old Way (WatermelonDB)
```typescript
import {database} from '@Service/Database';
import {QueueItem} from '@Model/QueueItem';
import {Q} from '@nozbe/watermelondb';

const collection = database.collections.get<QueueItem>('queue_items');
const items = await collection.query(Q.where('status', 'pending')).fetch();

const isProcessable = items[0].isProcessable; // Use helper
```

### New Way (Drizzle + Entity)
```typescript
import {database} from '@Service/Database';
import {queueItems} from '@Database/schema';
import {QueueItem} from '@Entity/QueueItem';
import {eq} from 'drizzle-orm';

const records = await database
    .select()
    .from(queueItems)
    .where(eq(queueItems.status, 'pending'));

const items = records.map(QueueItem.fromDatabase);
const isProcessable = items[0].isProcessable; // Same helper!
```

## File Structure

```
src/Entity/
├── InterfaceEntity.ts       # Contract interface
├── QueueItem.ts            # Queue processing entity
├── Therapist.ts            # Therapist account entity
├── Subject.ts              # Subject/patient entity
├── Encounter.ts            # Therapy session entity
├── TranscriptionSegment.ts # Whisper transcript entity
└── index.ts                # Public exports
```

## Benefits Over Old Model

1. ✅ **Type Safety**: Full TypeScript inference from schema
2. ✅ **Immutability**: `readonly` properties prevent accidental mutations
3. ✅ **Explicit Conversion**: `fromDatabase()` / `toDatabase()` methods
4. ✅ **No Decorators**: Simpler, no experimental features needed
5. ✅ **Same API**: Business logic methods work exactly the same

## Path Aliases

```typescript
// tsconfig.json & babel.config.js
"@Entity/*": ["src/Entity/*"]

// Usage
import {QueueItem} from '@Entity/QueueItem';
import {Therapist, Subject, Encounter} from '@Entity';
```

## Migration Path

When migrating code from old Model to new Entity:

1. **Change import**:
   ```typescript
   // Old
   import {QueueItem} from '@Model/QueueItem';
   
   // New
   import {QueueItem} from '@Entity/QueueItem';
   ```

2. **Wrap database records**:
   ```typescript
   // After Drizzle query
   const records = await database.select().from(queueItems);
   const entities = records.map(QueueItem.fromDatabase);
   ```

3. **Use same business logic**:
   ```typescript
   // Works exactly the same!
   if (entity.isProcessable) { /* ... */ }
   const key = therapist.getProjectionKey(password);
   ```

## Design Principles

The Entity pattern maintains:
- **Clean Architecture**: Business logic separate from database
- **OOP Principles**: Encapsulation, Single Responsibility
- **Type Safety**: Full compile-time type checking
- **Testability**: Easy to mock and test
- **Consistency**: Same patterns across all entities
