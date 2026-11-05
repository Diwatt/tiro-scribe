import { NitroModules } from 'react-native-nitro-modules'
import type { MelSpectrogram } from './specs/MelSpectrogram.nitro'

export type { MelSpectrogram } from './specs/MelSpectrogram.nitro'

/** Creates the native MelSpectrogram hybrid object (single C++ implementation). */
export function createMelSpectrogram(): MelSpectrogram {
    return NitroModules.createHybridObject<MelSpectrogram>('MelSpectrogram')
}
