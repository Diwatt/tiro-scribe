/**
 * TherapistRepository: Repository<Therapist> with session check.
 * Therapists table stores exactly one therapist. "Active session" = that therapist has unlocked key (master key in SecureStore).
 */

import { Therapist } from '../Entity/Therapist';
import { TherapistVault } from '../Security/TherapistVault';
import { Repository } from './Repository';

export class TherapistRepository extends Repository<Therapist> {
    public constructor() {
        super(Therapist, Therapist.entityName);
    }

    /**
     * Checks if the (single) therapist is currently logged in.
     * Logic: therapists table has one row and that therapist has an unlocked key (master key in SecureStore).
     */
    async hasActiveSession(): Promise<boolean> {
        const therapists = this.findAll();
        for (const therapist of therapists) {
            const unlocked = await TherapistVault.unlockLocalKey(therapist);
            if (unlocked) {
                return true;
            }
        }
        return false;
    }
}
