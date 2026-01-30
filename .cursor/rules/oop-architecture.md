---
description: "OOP-first architecture pattern - all hooks must return class instances with Legend-State observables"
alwaysApply: true
---

# OOP-First Architecture

**Rule: All hooks must return class instances with Legend-State observables**

## Principles

- Store classes should use OOP patterns and follow TypeScript visibility and code organization (`typescript-visibility.md`, `typescript-code-organization.md`)
- State should be managed via Legend-State observables
- Hooks should return class instances, not plain objects
- Components should use `observer()` wrapper for reactivity

## Pattern

### Store Class Structure

```typescript
import {observable, Observable} from '@legendapp/state';

interface MyStoreState {
    // state properties
}

class MyStore {
    // --- Properties (public → protected → private) ---
    private state!: Observable<MyStoreState>;

    // --- Constructor ---
    public constructor() {
        this.state = observable<MyStoreState>({
            // initial state
        });
    }

    // --- Methods (public → protected → private) ---
    public getState(): Observable<MyStoreState> {
        return this.state;
    }

    public getSomeValue(): SomeType {
        return this.state.someValue.get();
    }

    public async doSomething(): Promise<void> {
        this.state.someValue.set(newValue);
    }
}

// Export singleton instance
export const myStore = new MyStore();
```

### Hook Pattern

```typescript
export function useMyStore() {
    const state = myStore.getState();

    return {
        // State values (access these in components wrapped with observer() for reactivity)
        get someValue() {
            return state.someValue.get();
        },
        // State observable for direct access (use in observer components)
        state: state,
        // Methods
        doSomething: myStore.doSomething.bind(myStore),
    };
}
```

### Component Usage

```typescript
import {observer} from '@legendapp/state/react';

export const MyComponent: React.FC = observer(() => {
    const {someValue, doSomething} = useMyStore();
    
    return (
        // component JSX
    );
});
```
