import type React from 'react';
import { StyleSheet, View } from 'react-native';
import { PaperInk } from '@/theme/PaperInk';

interface Props {
    current: number;
    total: number;
    label: string;
}

/** Onboarding progress: one segment per step, done in ink, current in accent. */
export function StepProgress({ current, total, label }: Props): React.JSX.Element {
    const steps = Array.from({ length: total }, (_value, index) => index + 1);

    return (
        <View
            style={STYLES.row}
            accessibilityRole="progressbar"
            accessibilityLabel={label}
            accessibilityValue={{ min: 1, max: total, now: current }}
        >
            {steps.map((step) => (
                <View
                    key={step}
                    style={[
                        STYLES.segment,
                        {
                            backgroundColor:
                                step < current ? PaperInk.INK : step === current ? PaperInk.ACCENT : PaperInk.TRACK,
                        },
                    ]}
                />
            ))}
        </View>
    );
}

const STYLES = StyleSheet.create({
    row: { flex: 1, flexDirection: 'row', gap: 5 },
    segment: { flex: 1, height: 5, borderRadius: 3 },
});
