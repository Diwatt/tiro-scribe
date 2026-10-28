import { Patient } from '@/Entity/Patient';

describe('Patient (entity)', () => {
    it('applies defaults on construction', () => {
        const patient = new Patient({ encounterId: 'e-1' });
        expect(patient.getUuid()).toHaveLength(36);
        expect(patient.getBiocode()).toBe('');
        expect(patient.getServerPatientUuid()).toBeNull();
        expect(patient.getEncounterId()).toBe('e-1');
    });

    it('round-trips the server patient uuid', () => {
        const patient = new Patient({ encounterId: 'e-1' });
        patient.setServerPatientUuid('srv-123');
        expect(patient.getServerPatientUuid()).toBe('srv-123');
    });
});
