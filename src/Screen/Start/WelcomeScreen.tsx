import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PillButton, ScreenFrame, TiroMark } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import { PaperInk } from '@/theme/PaperInk';
import { TypeScale } from '@/theme/TypeScale';

interface Props {
    onStart?: () => void;
    onRestore?: () => void;
}

/** First screen: three promises, start or restore from a recovery kit. */
export function WelcomeScreen({ onStart, onRestore }: Props): React.JSX.Element {
    const { LL } = useLocalization();
    const promises = [
        [LL.welcome.promiseLocalTitle(), LL.welcome.promiseLocalBody()],
        [LL.welcome.promiseLaterTitle(), LL.welcome.promiseLaterBody()],
        [LL.welcome.promiseAudioTitle(), LL.welcome.promiseAudioBody()],
    ];

    return (
        <ScreenFrame
            footer={
                <>
                    <PillButton label={LL.welcome.start()} onPress={onStart} />
                    <Text style={STYLES.link} onPress={onRestore} accessibilityRole="button">
                        {LL.welcome.restore()}
                    </Text>
                </>
            }
        >
            <View style={STYLES.tile}>
                <TiroMark size={58} />
            </View>
            <Text style={[TypeScale.LARGE_TITLE, STYLES.title]} accessibilityRole="header">
                {LL.welcome.title()}
            </Text>
            {promises.map(([title, body], index) => (
                <View key={title} style={STYLES.promise}>
                    <View style={STYLES.number}>
                        <Text style={STYLES.numberText}>{index + 1}</Text>
                    </View>
                    <View style={STYLES.texts}>
                        <Text style={TypeScale.HEADLINE}>{title}</Text>
                        <Text style={TypeScale.SUBHEAD}>{body}</Text>
                    </View>
                </View>
            ))}
        </ScreenFrame>
    );
}

const STYLES = StyleSheet.create({
    link: { textAlign: 'center', fontSize: 16, fontWeight: '500', color: PaperInk.ACCENT, paddingVertical: 12 },
    number: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: PaperInk.ACCENT_SOFT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    numberText: { fontSize: 15, fontWeight: '700', color: PaperInk.ACCENT_DEEP },
    promise: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
    texts: { flex: 1, gap: 3 },
    tile: {
        marginTop: 36,
        width: 68,
        height: 68,
        borderRadius: 18,
        backgroundColor: PaperInk.BRAND_WATER,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: { lineHeight: 38, marginBottom: 10 },
});
