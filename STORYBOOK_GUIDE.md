# Storybook Guide - Viewing TiroStatus

## Quick Start

### 1. Start Storybook

Open your terminal and run:

```bash
# For iOS Simulator
pnpm storybook:ios

# For Android Emulator
pnpm storybook:android

# Or just start and choose platform manually
pnpm storybook
```

This will:
- Start the Expo development server
- Launch Storybook UI in your app
- Show you the Storybook interface

### 2. Navigate to TiroStatus

Once Storybook loads, you'll see:

1. **Sidebar Menu** (left side):
   - Look for `Components` folder
   - Click to expand
   - Click on `TiroStatus`

2. **Story List**:
   - You'll see all 13 story variants listed:
     - `Idle` (default)
     - `IdleCharging`
     - `IdleLowBattery`
     - `IdleDifferentModels`
     - `Processing`
     - `ProcessingStarted`
     - `ProcessingAlmostDone`
     - `BatchWaiting`
     - `BatchWaitingLarge`
     - `BatchWaitingSingle`
     - `SetupStarted`
     - `SetupDownloading`
     - `SetupAlmostDone`
     - `SetupDifferentModel`

### 3. View Different States

**Method 1: Click on Story Names**
- Simply tap/click on any story name in the list
- The component will update to show that state

**Method 2: Use Controls Panel**
- Open the **Controls** tab (usually at the bottom)
- You'll see sliders and inputs for:
  - `state` - Dropdown to switch between SETUP, IDLE, PROCESSING, BATCH_WAITING
  - `batteryLevel` - Slider (0 to 1)
  - `isCharging` - Toggle switch
  - `modelName` - Text input
  - `queueCount` - Number input
  - `progress` - Slider (0 to 100)
  - `downloadProgress` - Slider (0 to 100)

### 4. Interactive Features

**Actions Tab:**
- Click the **Actions** tab to see logged events
- Press any button in the component
- You'll see `onPressAction` events logged

**Notes Tab:**
- Click the **Notes** tab to see documentation
- Includes usage examples and component description

## Visual Guide

```
┌─────────────────────────────────────┐
│  Storybook UI                       │
├──────────┬──────────────────────────┤
│          │                          │
│ Sidebar  │   Component Preview      │
│          │                          │
│ Components│   [TiroStatus Card]     │
│  └─ TiroStatus                     │
│     ├─ Idle                         │
│     ├─ IdleCharging                 │
│     ├─ Processing                   │
│     └─ ...                          │
│          │                          │
│          │                          │
│          ├──────────────────────────┤
│          │  Controls | Actions |    │
│          │  Notes                   │
│          │                          │
│          │  [state: IDLE ▼]         │
│          │  [batteryLevel: 0.85]    │
│          │  [isCharging: ☐]         │
└──────────┴──────────────────────────┘
```

## Tips

1. **Switch Stories Quickly:**
   - Use the story list to jump between pre-configured states
   - Each story shows a specific use case

2. **Experiment with Controls:**
   - Change `state` dropdown to see all 4 states
   - Adjust `progress` slider to see progress bar animation
   - Toggle `isCharging` to see battery icon change

3. **Test Interactions:**
   - Click buttons in the component
   - Check Actions tab to see callbacks firing

4. **Read Documentation:**
   - Check Notes tab for component details
   - See usage examples and prop descriptions

## Troubleshooting

**Storybook doesn't load?**
- Make sure you set `STORYBOOK_ENABLED=true` (it's in the script)
- Check that `.rnstorybook/index.tsx` is properly configured
- Verify `TiroStatus.stories.tsx` is imported

**Can't see all stories?**
- Make sure you're in the `Components/TiroStatus` section
- Scroll down in the story list
- Check that all stories are exported in the stories file

**Controls not working?**
- Make sure you're on the Controls tab
- Some props only work in certain states (e.g., `progress` only in PROCESSING)

## Next Steps

Once you're comfortable with TiroStatus:
- Create stories for other components (RecordButton, PipelineWidget, etc.)
- Add more edge cases to existing stories
- Use Storybook for visual regression testing
