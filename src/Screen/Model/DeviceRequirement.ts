/** A hardware requirement compared with the current phone. */
export class DeviceRequirement {
    private constructor(
        public readonly name: string,
        public readonly required: string,
        public readonly actual: string,
        public readonly isMet: boolean,
    ) {}

    public static create(name: string, required: string, actual: string, isMet: boolean): DeviceRequirement {
        return new DeviceRequirement(name, required, actual, isMet);
    }
}
