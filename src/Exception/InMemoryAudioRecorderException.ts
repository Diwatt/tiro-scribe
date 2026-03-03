/**
 * InMemoryAudioRecorderException - errors specific to in-memory recordings.
 *
 * Using a dedicated exception class lets callers distinguish recorder failures
 * from other kinds of errors (permissions, audio subsystem, etc.).
 */

import { TiroScribeException } from './TiroScribeException';

export class InMemoryAudioRecorderException extends TiroScribeException {
    public constructor(message: string, code = 'IN_MEMORY_AUDIO_RECORDER') {
        super(message, code);
        this.name = 'InMemoryAudioRecorderException';
    }
}
