import { Pause, Play } from 'lucide-react-native';
import type React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SlideToConfirm } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import { PaperInk } from '@/theme/PaperInk';
import { TypeScale } from '@/theme/TypeScale';

interface Props {
    elapsed: string;
    startedAt: string;
    isPaused: boolean;
    onTogglePause?: () => void;
    onStop: () => void;
}

/** Full-screen dark recording view: timer in concentric rings, pause, slide to end. */
export function RecordingStage({ elapsed, startedAt, isPaused, onTogglePause, onStop }: Props): React.JSX.Element {
    const { LL } = useLocalization();
    const insets = useSafeAreaInsets();
    const PauseIcon = isPaused ? Play : Pause;

    return (
        <View style={[STYLES.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
            <View style={STYLES.badge}>
                <View style={[STYLES.dot, isPaused && STYLES.dotPaused]} />
                <Text style={STYLES.badgeText}>{LL.recording.badge()}</Text>
            </View>
            <View style={STYLES.center}>
                <View style={STYLES.rings}>
                    <View style={[STYLES.ring, STYLES.ringOuter]} />
                    <View style={[STYLES.ring, STYLES.ringMiddle]} />
                    <View style={[STYLES.ring, STYLES.ringInner]} />
                    <Text style={TypeScale.TIMER} accessibilityRole="timer">
                        {elapsed}
                    </Text>
                    <Text style={STYLES.since}>{LL.recording.since({ time: startedAt })}</Text>
                </View>
                <Text style={STYLES.hint}>{LL.recording.hint()}</Text>
            </View>
            <View style={STYLES.controls}>
                <Pressable onPress={onTogglePause} accessibilityRole="button" style={STYLES.pause}>
                    <PauseIcon size={16} color={PaperInk.NIGHT_TEXT} fill={PaperInk.NIGHT_TEXT} />
                    <Text style={STYLES.pauseText}>{isPaused ? LL.recording.resume() : LL.recording.pause()}</Text>
                </Pressable>
                <View style={STYLES.slider}>
                    <SlideToConfirm label={LL.recording.slide()} onConfirm={onStop} />
                </View>
            </View>
        </View>
    );
}

const STYLES = StyleSheet.create({
    badge: {
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.07)',
    },
    badgeText: { fontSize: 13, fontWeight: '600', color: PaperInk.NIGHT_TEXT_SOFT },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 30 },
    controls: { alignItems: 'center', gap: 18 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PaperInk.RECORD },
    dotPaused: { backgroundColor: PaperInk.OCHRE_ON_DARK },
    hint: { maxWidth: 260, textAlign: 'center', fontSize: 15, lineHeight: 21, color: PaperInk.NIGHT_TEXT_MUTED },
    pause: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minHeight: 48,
        paddingHorizontal: 22,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    pauseText: { fontSize: 15, fontWeight: '600', color: PaperInk.NIGHT_TEXT },
    ring: { position: 'absolute', borderRadius: 999 },
    ringInner: { width: 156, height: 156, backgroundColor: 'rgba(224,80,62,0.08)' },
    ringMiddle: { width: 208, height: 208, borderWidth: 1, borderColor: 'rgba(224,80,62,0.22)' },
    ringOuter: { width: 260, height: 260, borderWidth: 1, borderColor: 'rgba(224,80,62,0.14)' },
    rings: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center' },
    root: { flex: 1, paddingHorizontal: 24, backgroundColor: PaperInk.NIGHT },
    since: { fontSize: 13, color: PaperInk.NIGHT_TEXT_MUTED, marginTop: 6 },
    slider: { alignSelf: 'stretch' },
});
