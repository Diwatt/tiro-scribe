import React from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {useTheme} from 'react-native-paper';
import {observer} from '@legendapp/state/react';
import {StatusReady, SecureTranscribeButton} from '@/Components';
import {RootTabScreenProps} from '@/Navigation/types';

export const Home = observer(function Home({
    navigation,
}: RootTabScreenProps<'Home'>): React.JSX.Element {
    const theme = useTheme();

    const handlePress = () => {
        navigation.navigate('Recording', {autoStart: true});
    };

    return (
        <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <StatusReady />
                <View style={{height: 100}} />
            </ScrollView>

            <View style={styles.buttonContainer}>
                <SecureTranscribeButton onPress={handlePress} isRecording={false} />
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 60,
    },
    buttonContainer: {
        position: 'absolute',
        left: 20,
        right: 20,
        bottom: 30,
        alignItems: 'center',
    },
});