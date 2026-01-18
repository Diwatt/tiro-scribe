---
description: "React component typing standards - explicit props with JSX.Element return types"
alwaysApply: true
---

# React Component Typing Standards

## Core Principle
**Use explicit prop types with plain function components. Avoid `React.FC` unless you need its specific features (displayName, defaultProps, static properties).**

## Required Pattern

### ✅ CORRECT: Explicit Props + Return Type

```typescript
// Named function
interface ComponentProps {
    title: string;
    onPress: () => void;
    children?: React.ReactNode; // Explicit children when needed
}

export function Component({ title, onPress, children }: ComponentProps): React.JSX.Element {
    return <View>...</View>;
}

// Arrow function
export const Component = ({ title, onPress }: ComponentProps): React.JSX.Element => {
    return <View>...</View>;
}

// With HOC (observer, memo, etc.)
export const Component = observer((props: ComponentProps): React.JSX.Element => {
    return <View>...</View>;
});

// Components that can return null
export function ConditionalComponent(props: Props): React.JSX.Element | null {
    if (!props.show) return null;
    return <View>...</View>;
}
```

### ❌ AVOID: React.FC Pattern

```typescript
// Don't use React.FC as default
export const Component: React.FC<Props> = (props) => {
    return <View>...</View>;
};
```

## Rules

1. **Always define explicit prop interfaces/types** - Use `interface` for component props
2. **Use `JSX.Element` for return types** - Or let TypeScript infer (preferred for simple components)
3. **Make children explicit** - Include `children?: React.ReactNode` in props when needed
4. **Use `React.FC` only when needed** - Only for components requiring `displayName`, `defaultProps`, or static properties
5. **Be consistent** - Use the same pattern across the entire codebase

## When to Use React.FC

Only use `React.FC` when you need:
- `displayName` for debugging
- `defaultProps` (rare in modern React)
- Static properties on the component
- Generic component typing with constraints

Example:
```typescript
interface GenericComponentProps<T> {
    data: T;
}

export const GenericComponent = <T,>(
    props: GenericComponentProps<T>
): JSX.Element => {
    // ...
};
```

## Return Type Guidelines

- **Simple components**: Let TypeScript infer (no explicit return type)
- **Complex components**: Use `React.JSX.Element`
- **Conditional rendering**: Use `React.JSX.Element | null`
- **Never use `React.ReactElement`** - Too narrow, excludes valid returns

## Examples for Tiro Scribe

```typescript
// Screen component
interface HomeScreenProps {
    // No props needed? Use empty interface or omit
}

export const HomeScreen = observer((props: HomeScreenProps): React.JSX.Element => {
    // ...
});

// Component with props
interface RecordButtonProps {
    isRecording: boolean;
    onPress: () => void;
    disabled?: boolean;
}

export function RecordButton({ isRecording, onPress, disabled }: RecordButtonProps): React.JSX.Element {
    // ...
}

// Component with children
interface CardProps {
    title: string;
    children?: React.ReactNode;
}

export function Card({ title, children }: CardProps): React.JSX.Element {
    return <View>{children}</View>;
}
```
