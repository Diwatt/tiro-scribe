import { observer } from '@legendapp/state/react';
import { GlobalActivityBar } from './GlobalActivityBar';

// observer version wraps the component so it re-renders when the store changes
export const ObservedGlobalActivityBar = observer(GlobalActivityBar);
