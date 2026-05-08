import { TiroScribeException } from './TiroScribeException';

export class EncounterNotFound extends TiroScribeException {
    public constructor(encounterUuid: string) {
        super(
            `Encounter not found: ${encounterUuid}`,
            'ENCOUNTER_NOT_FOUND',
            undefined,
            { encounterUuid },
        );
        this.name = 'EncounterNotFound';
    }
}
