import { ChevronLeft } from 'lucide-react-native';
import type React from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RoundIconButton, ScreenFrame, StepProgress } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import { TypeScale } from '@/theme/TypeScale';

interface Props {
    step: number;
    total: number;
    overline: string;
    title: string;
    subtitle: string;
    children: ReactNode;
    footer: ReactNode;
    onBack?: () => void;
}

/** Shared layout of the four onboarding steps: back, progress, heading, content, pinned action. */
export function OnboardingStepFrame({
    step,
    total,
    overline,
    title,
    subtitle,
    children,
    footer,
    onBack,
}: Props): React.JSX.Element {
    const { LL } = useLocalization();

    return (
        <ScreenFrame footer={footer}>
            <View style={STYLES.top}>
                {onBack ? (
                    <RoundIconButton icon={ChevronLeft} label={LL.shell.back()} onPress={onBack} />
                ) : (
                    <View style={STYLES.spacer} />
                )}
                <StepProgress current={step} total={total} label={LL.vault.progress({ current: step, total })} />
            </View>
            <View style={STYLES.heading}>
                <Text style={TypeScale.OVERLINE}>{overline}</Text>
                <Text style={[TypeScale.TITLE, STYLES.title]} accessibilityRole="header">
                    {title}
                </Text>
                <Text style={TypeScale.SUBHEAD}>{subtitle}</Text>
            </View>
            {children}
        </ScreenFrame>
    );
}

const STYLES = StyleSheet.create({
    heading: { gap: 6, paddingHorizontal: 4 },
    spacer: { width: 44, height: 44 },
    title: { fontSize: 30, lineHeight: 34 },
    top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
