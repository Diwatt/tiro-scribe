import type { AudioFileEntry } from './AudioFileEntry';
import type { AudioIngest } from './AudioIngest';
import type { AudioNotification } from './AudioNotification';
import type { EncounterFixture } from './EncounterFixture';

/** Dataclass holding the full observable snapshot of {@link AudioState}. */
export class AudioStateSnapshot {
    public readonly sourceDirectory: string;
    public readonly files: AudioFileEntry[];
    public readonly isLoading: boolean;
    public readonly lastResult: AudioIngest | null;
    public readonly lastError: string | null;
    public readonly lastFixture: EncounterFixture | null;
    public readonly lastTherapistUuid: string | null;
    public readonly notification: AudioNotification | null;
    public readonly therapistSourcePath: string;
    public readonly segmentStart: string;
    public readonly segmentEnd: string;

    private constructor() {
        this.sourceDirectory = '';
        this.files = [];
        this.isLoading = false;
        this.lastResult = null;
        this.lastError = null;
        this.lastFixture = null;
        this.lastTherapistUuid = null;
        this.notification = null;
        this.therapistSourcePath = '';
        this.segmentStart = '';
        this.segmentEnd = '';
    }

    public static create(): AudioStateSnapshot {
        return new AudioStateSnapshot();
    }
}
