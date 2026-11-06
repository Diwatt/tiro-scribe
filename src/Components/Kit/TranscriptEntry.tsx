import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PaperInk } from '@/theme/PaperInk';
import { Speaker } from './Speaker';

interface Props {
    speaker: Speaker;
    speakerLabel: string;
    text: string;
    time?: string;
    isFirstOfGroup?: boolean;
    isLastOfGroup?: boolean;
}

/**
 * Transcript entry, read like a document rather than a messenger: a header line (initial badge,
 * speaker, time) then the text underneath. The subject is aligned left, the therapist right.
 */
export function TranscriptEntry({
    speaker,
    speakerLabel,
    text,
    time,
    isFirstOfGroup = true,
    isLastOfGroup = true,
}: Props): React.JSX.Element {
    const isTherapist = speaker === Speaker.Therapist;

    return (
        <View style={[STYLES.entry, isTherapist ? STYLES.right : STYLES.left, isLastOfGroup && STYLES.groupEnd]}>
            {isFirstOfGroup ? (
                <View style={[STYLES.header, isTherapist && STYLES.therapistHeader]}>
                    <Text style={[STYLES.badge, isTherapist ? STYLES.therapistBadge : STYLES.subjectBadge]}>
                        {speakerLabel.charAt(0).toUpperCase()}
                    </Text>
                    <Text style={[STYLES.speaker, isTherapist && STYLES.therapistSpeaker]}>{speakerLabel}</Text>
                    {time ? <Text style={STYLES.time}>{time}</Text> : null}
                </View>
            ) : null}
            <Text style={[STYLES.text, isTherapist && STYLES.therapistText]}>{text}</Text>
        </View>
    );
}

const STYLES = StyleSheet.create({
    badge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        overflow: 'hidden',
        textAlign: 'center',
        lineHeight: 28,
        fontSize: 13,
        fontWeight: '700',
    },
    entry: { gap: 6, marginBottom: 6 },
    groupEnd: { marginBottom: 18 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    left: { paddingRight: 32 },
    right: { paddingLeft: 32 },
    speaker: { fontSize: 13, fontWeight: '700', color: PaperInk.TEXT },
    subjectBadge: { backgroundColor: PaperInk.CHIP, color: PaperInk.INK },
    text: { fontSize: 16, lineHeight: 23, color: PaperInk.TEXT_READING, textAlign: 'left' },
    therapistBadge: { backgroundColor: PaperInk.ACCENT_SOFT, color: PaperInk.ACCENT_DEEP },
    therapistHeader: { flexDirection: 'row-reverse' },
    therapistSpeaker: { color: PaperInk.ACCENT_DEEP },
    therapistText: { textAlign: 'right' },
    time: { fontSize: 12, color: PaperInk.TEXT_SOFT, fontVariant: ['tabular-nums'] },
});
