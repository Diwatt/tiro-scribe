import { Check, Wifi } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Panel, PillButton, ProgressBar } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import type { ModelDownload } from '@/Screen/Model';
import { PaperInk } from '@/theme/PaperInk';
import { OnboardingStepFrame } from './OnboardingStepFrame';

interface Props {
    step: number;
    total: number;
    downloads: ReadonlyArray<ModelDownload>;
    onEnter?: () => void;
}

/** Onboarding step 4/4: one progress bar per on-device model; the app is usable meanwhile. */
export function ModelsStepScreen({ step, total, downloads, onEnter }: Props): React.JSX.Element {
    const { LL } = useLocalization();

    return (
        <OnboardingStepFrame
            step={step}
            total={total}
            overline={LL.models.step({ current: step })}
            title={LL.models.title()}
            subtitle={LL.models.subtitle()}
            footer={<PillButton label={LL.models.enter()} onPress={onEnter} />}
        >
            <Panel>
                {downloads.map((download) => (
                    <View key={download.name} style={STYLES.model}>
                        <View style={STYLES.head}>
                            <View style={STYLES.texts}>
                                <Text style={STYLES.name}>{download.name}</Text>
                                <Text style={STYLES.detail}>{download.detail}</Text>
                            </View>
                            {download.isComplete() ? (
                                <Check size={18} color={PaperInk.ACCENT} strokeWidth={2.8} />
                            ) : (
                                <Text style={STYLES.percent}>{Math.round(download.progress * 100)} %</Text>
                            )}
                        </View>
                        <ProgressBar progress={download.progress} label={download.name} />
                    </View>
                ))}
            </Panel>
            <View style={STYLES.wifi}>
                <Wifi size={16} color={PaperInk.TEXT_MUTED} strokeWidth={2.2} />
                <Text style={STYLES.detail}>{LL.models.wifi()}</Text>
            </View>
        </OnboardingStepFrame>
    );
}

const STYLES = StyleSheet.create({
    detail: { fontSize: 13, color: PaperInk.TEXT_MUTED },
    head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    model: { gap: 8, paddingVertical: 4 },
    name: { fontSize: 16, fontWeight: '600', color: PaperInk.TEXT },
    percent: { fontSize: 14, fontWeight: '600', color: PaperInk.TEXT_MUTED, fontVariant: ['tabular-nums'] },
    texts: { flex: 1, gap: 2 },
    wifi: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
});
