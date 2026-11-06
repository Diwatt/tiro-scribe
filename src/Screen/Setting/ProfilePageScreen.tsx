import type React from 'react';
import { StyleSheet, Text } from 'react-native';
import { GroupedList, LargeTitle, ListRow, NavigationBar, ScreenFrame, SectionLabel } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import { PaperInk } from '@/theme/PaperInk';

interface Props {
    languages: string;
    email: string;
    onBack?: () => void;
    onEditLanguages?: () => void;
}

/** Therapist profile: session languages and account email only (V1). */
export function ProfilePageScreen({ languages, email, onBack, onEditLanguages }: Props): React.JSX.Element {
    const { LL } = useLocalization();

    return (
        <ScreenFrame>
            <NavigationBar backLabel={LL.settingsHome.title()} onBack={onBack} />
            <LargeTitle title={LL.profilePage.title()} />
            <SectionLabel label={LL.profilePage.transcription()} />
            <GroupedList>
                <ListRow title={LL.profilePage.languages()} value={languages} onPress={onEditLanguages} />
            </GroupedList>
            <SectionLabel label={LL.profilePage.account()} />
            <GroupedList>
                <ListRow title={LL.profilePage.email()} value={email} />
            </GroupedList>
            <Text style={STYLES.footnote}>{LL.profilePage.footnote()}</Text>
        </ScreenFrame>
    );
}

const STYLES = StyleSheet.create({
    footnote: { fontSize: 13, lineHeight: 18, color: PaperInk.TEXT_MUTED, paddingHorizontal: 8 },
});
