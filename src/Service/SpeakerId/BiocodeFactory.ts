import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Container } from '@/Container';
import { VectorProjection } from '@/Math/VectorProjection';
import { Biocode } from './Biocode';
import type { SpeakerVector } from './SpeakerVector';

dayjs.extend(utc);

export class BiocodeFactory {
    private projection: VectorProjection | null = null;
    private projectionMatrix: number[][] | null = null;

    /**
     * Project a raw speaker vector through the given projection matrix
     * and return a Biocode.
     *
     * @param speakerVector - Raw speaker embedding + confidence from CAM++
     * @param projectionMatrix - Orthonormal matrix derived from therapist's master key
     * @returns A Biocode (projected vector + metadata)
     */
    public create(speakerVector: SpeakerVector, projectionMatrix: number[][]): Biocode {
        if (this.projectionMatrix !== projectionMatrix) {
            this.projectionMatrix = projectionMatrix;
            this.projection = new VectorProjection(projectionMatrix);
        }

        const projectionInstance = this.projection ?? new VectorProjection(projectionMatrix);
        const projected = projectionInstance.project(speakerVector.vector);

        return new Biocode(projected, speakerVector.confidence, dayjs.utc());
    }
}

Container.register(BiocodeFactory);
