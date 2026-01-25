import type { RecorderState } from '../RecorderState';
import type { StopReason } from '../StopReason';

export interface StatusChangeEvent {
  state: RecorderState;
  sessionId: string | null;
  filePath: string | null;
  reason?: StopReason;
}
