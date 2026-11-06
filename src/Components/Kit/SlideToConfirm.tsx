import { Square } from 'lucide-react-native';
import type React from 'react';
import { useRef, useState } from 'react';
import { Animated, type LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';
import { PaperInk } from '@/theme/PaperInk';
import { SlideMetric } from './SlideMetric';

interface Props {
    label: string;
    onConfirm: () => void;
}

/** Dark slider that must be dragged to the end to confirm (ends a session without accidental taps). */
export function SlideToConfirm({ label, onConfirm }: Props): React.JSX.Element {
    const offset = useRef(new Animated.Value(0)).current;
    const [trackWidth, setTrackWidth] = useState(0);
    const travel = Math.max(0, trackWidth - SlideMetric.KNOB - SlideMetric.PADDING * 2);
    const travelRef = useRef(travel);
    const onConfirmRef = useRef(onConfirm);
    travelRef.current = travel;
    onConfirmRef.current = onConfirm;
    const responder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (_event, gesture) => offset.setValue(Math.min(Math.max(0, gesture.dx), travelRef.current)),
            onPanResponderRelease: (_event, gesture) => {
                const isComplete = gesture.dx >= travelRef.current * SlideMetric.THRESHOLD;
                Animated.spring(offset, { toValue: isComplete ? travelRef.current : 0, useNativeDriver: true }).start();
                if (isComplete) {
                    onConfirmRef.current();
                }
            },
        }),
    ).current;

    return (
        <View
            style={STYLES.track}
            onLayout={(event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width)}
            accessibilityRole="adjustable"
            accessibilityLabel={label}
            accessibilityActions={[{ name: 'activate' }]}
            onAccessibilityAction={() => onConfirm()}
        >
            <Text style={STYLES.label}>{label}  ›››</Text>
            <Animated.View style={[STYLES.knob, { transform: [{ translateX: offset }] }]} {...responder.panHandlers}>
                <Square size={18} color={PaperInk.NIGHT} fill={PaperInk.NIGHT} />
            </Animated.View>
        </View>
    );
}

const STYLES = StyleSheet.create({
    knob: {
        position: 'absolute',
        left: SlideMetric.PADDING,
        width: SlideMetric.KNOB,
        height: SlideMetric.KNOB,
        borderRadius: SlideMetric.KNOB / 2,
        backgroundColor: PaperInk.NIGHT_TEXT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: { textAlign: 'center', fontSize: 16, fontWeight: '600', color: PaperInk.ON_DARK_MUTED },
    track: {
        height: 68,
        borderRadius: 34,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
    },
});
