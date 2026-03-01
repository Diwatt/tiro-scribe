import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { VectorProjection } from '@/Math/VectorProjection';
import { Biocode } from './Biocode';
import type { SpeakerVector } from './SpeakerVector';

dayjs.extend(utc);

export class BiocodeFactory {
    /**
     * Project a raw speaker vector through the given projection matrix
     * and return a Biocode.
     *
     * @param speakerVector - Raw speaker embedding + confidence from CAM++
     * @param projectionMatrix - Orthonormal matrix derived from therapist's master key
     * @returns A Biocode (projected vector + metadata)
     */
    create(speakerVector: SpeakerVector, projectionMatrix: number[][]): Biocode {
        const vp = new VectorProjection(projectionMatrix);
        const projected = vp.project(speakerVector.vector);

        return new Biocode(projected, speakerVector.confidence, dayjs.utc());
    }
}
