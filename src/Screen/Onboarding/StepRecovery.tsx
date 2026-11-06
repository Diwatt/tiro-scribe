import { observer } from '@legendapp/state/react';
import type React from 'react';
import { useCallback, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Container } from '@/Core/Container';
import { RecoveryKitStepScreen } from '@/Screen/Start/RecoveryKitStepScreen';
import type { OnboardingFormData } from '@/State/Onboarding';
import { OnboardingState } from '@/State/Onboarding/State';

interface Props {
    step: number;
    total: number;
}

/** Onboarding recovery step bound to RecoveryState (PDF kit, clipboard, finalize). */
export const StepRecovery = observer(function StepRecovery({ step, total }: Props): React.JSX.Element {
    const { watch, setValue } = useFormContext<OnboardingFormData>();
    const onboarding = Container.get(OnboardingState);
    const recovery = onboarding.recovery;
    const isStored = Boolean(watch('recoveryCodeSaveConfirmed'));
    const [isCopied, setIsCopied] = useState(false);
    const codeGroups = recovery.recoveryCode.get().split(/[\s-]+/).filter(Boolean);

    const handleCopy = useCallback(async () => {
        await recovery.copyRecoveryCodeToClipboard();
        setIsCopied(true);
    }, [recovery]);

    return (
        <RecoveryKitStepScreen
            step={step}
            total={total}
            codeGroups={codeGroups}
            isStored={isStored}
            isCopied={isCopied}
            error={recovery.error.get()}
            onToggleStored={() => setValue('recoveryCodeSaveConfirmed', !isStored)}
            onPrint={() => recovery.generateAndShareRecoveryKit()}
            onCopy={handleCopy}
            onContinue={() => recovery.finalize(isStored)}
        />
    );
});
