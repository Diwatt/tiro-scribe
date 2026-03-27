# Storybook Configuration

This directory contains the Storybook configuration for React Native.

## Usage

To run Storybook:

```tiro-scribe/.rnstorybook/README.md#L1-8
# Start Storybook in development mode
pnpm run storybook

# Start Storybook on iOS
pnpm run storybook:ios

# Start Storybook on Android
pnpm run storybook:android
```

## Adding New Stories

Create a `.stories.tsx` file next to your component:

```tiro-scribe/.rnstorybook/README.md#L10-28
import type {Meta, StoryObj} from '@storybook/react-native';
import {YourComponent} from './YourComponent';

const meta: Meta<typeof YourComponent> = {
    title: 'Components/YourComponent',
    component: YourComponent,
};

export default meta;
type Story = StoryObj<typeof YourComponent>;

export const Default: Story = {
    args: {
        // Your component props
    },
};
```

Then import it in `.storybook/index.tsx`:

```tiro-scribe/.rnstorybook/README.md#L30-34
configure(() => {
    require('../src/Components/YourComponent.stories');
}, module);
```

## Configuration Files

- `main.ts` - Storybook main configuration (stories glob, addons)
- `preview.tsx` - Global decorators and parameters
- `index.tsx` - Storybook UI root component