import { useLocalSearchParams } from 'expo-router';
import { Share } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NavigationBar, Panel, RoundIconButton, ScreenFrame, Tag } from '@/Components/Kit';
import { AppRouter } from '@/Core/AppRouter';
import { Container } from '@/Core/Container';
import { useLocalization } from '@/Localization';
import { PaperInk } from '@/theme/PaperInk';
import { TypeScale } from '@/theme/TypeScale';

/** Transcript modal opened from a route; params: transcript, biocode, date. */
export function TranscriptDetailScreen(): React.JSX.Element {
    const { LL } = useLocalization();
    const params = useLocalSearchParams<{ transcript?: string; biocode?: string; date?: string }>();
    const subject = Array.isArray(params.biocode) ? params.biocode.join(' ') : (params.biocode ?? '');

    return (
        <ScreenFrame>
            <NavigationBar
                backLabel={LL.shell.back()}
                onBack={() => Container.get(AppRouter).back()}
                trailing={<RoundIconButton icon={Share} label={LL.shell.export()} />}
            />
            <View style={STYLES.heading}>
                {subject ? <Tag label={subject} /> : null}
                <Text style={TypeScale.TITLE} accessibilityRole="header">
                    {LL.transcript.title()}
                </Text>
                {params.date ? <Text style={TypeScale.CAPTION}>{params.date}</Text> : null}
            </View>
            <Panel>
                <Text style={STYLES.transcript}>{params.transcript ?? ''}</Text>
            </Panel>
        </ScreenFrame>
    );
}

const STYLES = StyleSheet.create({
    heading: { gap: 6, paddingHorizontal: 4 },
    transcript: { fontSize: 16, lineHeight: 24, color: PaperInk.TEXT_READING },
});
