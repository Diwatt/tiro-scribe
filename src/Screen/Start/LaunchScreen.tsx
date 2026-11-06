import { Lock } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ProgressBar, TiroMark } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import { FontFamily } from '@/theme/FontFamily';
import { PaperInk } from '@/theme/PaperInk';

interface Props {
    progress?: number;
}

/** Splash while the encrypted vault opens. */
export function LaunchScreen({ progress }: Props): React.JSX.Element {
    const { LL } = useLocalization();

    return (
        <View style={STYLES.root}>
            <View style={STYLES.center}>
                <View style={STYLES.tile}>
                    <TiroMark size={112} />
                </View>
                <Text style={STYLES.word}>Tiro</Text>
                <Text style={STYLES.tagline}>{LL.launch.tagline()}</Text>
            </View>
            <View style={STYLES.footer}>
                {progress === undefined ? null : (
                    <View style={STYLES.bar}>
                        <ProgressBar progress={progress} height={3} color={PaperInk.BRAND_INK} label={LL.launch.opening()} />
                    </View>
                )}
                <View style={STYLES.status}>
                    <Lock size={13} color={PaperInk.TEXT_MUTED} strokeWidth={2.4} />
                    <Text style={STYLES.statusText}>{LL.launch.opening()}</Text>
                </View>
            </View>
        </View>
    );
}

const STYLES = StyleSheet.create({
    bar: { width: 120 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    footer: { alignItems: 'center', gap: 12, paddingBottom: 64 },
    root: { flex: 1, backgroundColor: PaperInk.PAPER },
    status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusText: { fontSize: 13, color: PaperInk.TEXT_MUTED },
    tagline: { fontSize: 17, fontStyle: 'italic', color: PaperInk.TEXT_MUTED },
    tile: {
        width: 132,
        height: 132,
        borderRadius: 32,
        backgroundColor: PaperInk.BRAND_GROUND,
        alignItems: 'center',
        justifyContent: 'center',
    },
    word: { fontSize: 52, color: PaperInk.BRAND_INK, fontFamily: FontFamily.SCRIPT },
});
