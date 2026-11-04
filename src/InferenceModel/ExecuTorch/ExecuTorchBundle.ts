import { ExecuTorchException } from '@/Exception';
import type { InferenceModelFileRole } from '../Download/ModelArtifactStorage';
import type { Downloader } from '../Downloader';
import type { ExecuTorchProgram } from './ExecuTorchProgram';
import type { ExecuTorchRunInput } from './ExecuTorchRunInput';
import type { ExecuTorchRuntime } from './ExecuTorchRuntime';

/**
 * ExecuTorchBundle – Runtime view of the downloaded bundle of one capability:
 * hydration of its programs, text artifact reads, program execution and
 * disposal. Owns every loaded program, so freeing the bundle frees all of them.
 */
export class ExecuTorchBundle {
    private readonly programs = new Map<InferenceModelFileRole, ExecuTorchProgram>();

    public constructor(
        private readonly capability: string,
        private readonly downloader: Downloader,
        private readonly executorch: ExecuTorchRuntime,
    ) {}

    public async disposeAll(): Promise<void> {
        for (const program of this.programs.values()) {
            program.dispose();
        }
        this.programs.clear();
    }

    public async ensureDownloaded(): Promise<void> {
        await this.downloader.ensureDownloaded(this.capability);
    }

    public getCapability(): string {
        return this.capability;
    }

    public async loadProgram(role: InferenceModelFileRole): Promise<void> {
        const artifact = await this.downloader.getArtifact(this.capability, role);
        const program = await this.executorch.load(artifact.getUri());
        this.programs.set(role, program);
    }

    public async readText(role: InferenceModelFileRole, label: string): Promise<string> {
        const artifact = await this.downloader.getArtifact(this.capability, role);
        const text = await artifact.getText();
        if (text == null) {
            throw new ExecuTorchException(`${label} artifact (role '${role}') not downloaded for capability '${this.capability}'`);
        }

        return text;
    }

    public runProgram(role: InferenceModelFileRole, inputs: readonly ExecuTorchRunInput[], methodName = 'forward'): readonly Float32Array[] {
        return this.executorch.run(this.getProgram(role), inputs, methodName);
    }

    private getProgram(role: InferenceModelFileRole): ExecuTorchProgram {
        const program = this.programs.get(role);
        if (program == null) {
            throw new ExecuTorchException(`Capability '${this.capability}' has no program loaded for role '${role}'. Call initialize() first.`);
        }

        return program;
    }
}
