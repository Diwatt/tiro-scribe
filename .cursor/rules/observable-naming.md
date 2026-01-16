---
description: "Naming convention for Legend-State observables - do not use $ suffix"
alwaysApply: true
---

# Observable State Naming Convention

**Rule: Do NOT use `$` suffix for observable state variables**

## Rationale
- Keeps naming consistent and clean
- Avoids confusion with other reactive libraries that use `$` convention
- Makes code more readable

## Examples

✅ **Correct:**
```typescript
class MyStore {
    private state: Observable<MyState>;
    
    constructor() {
        this.state = observable<MyState>({...});
    }
    
    getState(): Observable<MyState> {
        return this.state;
    }
}
```

❌ **Incorrect:**
```typescript
class MyStore {
    private state$: Observable<MyState>;  // ❌ Don't use $ suffix
    
    constructor() {
        this.state$ = observable<MyState>({...});
    }
}
```

## When Returning from Hooks

✅ **Correct:**
```typescript
export function useMyStore() {
    const state = myStore.getState();
    
    return {
        state: state,  // ✅ No $ suffix
        // ... other properties
    };
}
```

❌ **Incorrect:**
```typescript
export function useMyStore() {
    const state$ = myStore.getState();  // ❌ Don't use $ suffix
    
    return {
        state$: state$,  // ❌ Don't use $ suffix
    };
}
```
