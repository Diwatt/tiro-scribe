import { observer } from '@legendapp/state/react';
import type React from 'react';
import { Container } from '@/Core/Container';
import { CalibrationStatus } from '@/Screen/Model';
import { VoiceStepScreen } from '@/Screen/Start/VoiceStepScreen';
import { OnboardingState } from '@/State/Onboarding/State';

interface Props {
    step: number;
    total: number;
}

/** Onboarding voice step bound to VoiceState (permission, speaker model download, calibration). */
export const StepVoice = observer(function StepVoice({ step, total }: Props): React.JSX.Element {
    const onboarding = Container.get(OnboardingState);
    const voice = onboarding.voice;
    const phase = voice.calibrationPhase.get();
    const isBusy = voice.isBusy.get();
    const status = voice.isSpeakerModelDownloading.get()
        ? CalibrationStatus.Downloading
        : !voice.hasPermission.get()
          ? CalibrationStatus.NeedsPermission
          : isBusy && phase === 'recording'
            ? CalibrationStatus.Recording
            : isBusy
              ? CalibrationStatus.Processing
              : CalibrationStatus.Ready;

    return (
        <VoiceStepScreen
            step={step}
            total={total}
            status={status}
            error={voice.error.get()}
            onStart={() => voice.calibrateVoice()}
            onGrantPermission={() => voice.requestPermission()}
            onBack={() => onboarding.reset()}
        />
    );
});
