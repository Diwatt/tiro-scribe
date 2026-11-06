import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Metric } from '@/theme/Metric';
import { PaperInk } from '@/theme/PaperInk';
import type { Fact } from './Fact';

interface Props {
    facts: ReadonlyArray<Fact>;
    columns?: number;
}

/** Metadata grid on a card: small label above a strong value, hairline separated. */
export function FactGrid({ facts, columns = 2 }: Props): React.JSX.Element {
    return (
        <View style={STYLES.grid}>
            {facts.map((fact, index) => {
                const isLastColumn = (index + 1) % columns === 0;
                const isLastRow = index >= facts.length - columns;

                return (
                    <View
                        key={fact.label}
                        style={[
                            STYLES.cell,
                            { width: `${100 / columns}%` },
                            !isLastColumn && STYLES.rightLine,
                            !isLastRow && STYLES.bottomLine,
                        ]}
                    >
                        <Text style={STYLES.label}>{fact.label}</Text>
                        <Text style={STYLES.value} numberOfLines={1}>
                            {fact.value}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}

const STYLES = StyleSheet.create({
    bottomLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: PaperInk.LINE },
    cell: { paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: PaperInk.CARD,
        borderWidth: 1,
        borderColor: PaperInk.LINE,
        borderRadius: Metric.RADIUS_CARD,
        overflow: 'hidden',
    },
    label: { fontSize: 12, color: PaperInk.TEXT_MUTED },
    rightLine: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: PaperInk.LINE },
    value: { fontSize: 17, fontWeight: '600', color: PaperInk.TEXT },
});
