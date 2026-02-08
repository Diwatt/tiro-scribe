import type { RecorderState } from '../RecorderState';
import type { StopReason } from '../StopReason';

export interface RecordingStatus {
    state: RecorderState;
    sessionId: string | null;
    filePath: string | null;
    reason?: StopReason;
}
