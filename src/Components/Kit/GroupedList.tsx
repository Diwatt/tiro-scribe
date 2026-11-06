import type React from 'react';
import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Metric } from '@/theme/Metric';
import { PaperInk } from '@/theme/PaperInk';

interface Props {
    children: ReactNode;
}

/** Inset grouped list: rows on a single card, separated by hairlines. */
export function GroupedList({ children }: Props): React.JSX.Element {
    const rows = Children.toArray(children);

    return (
        <View style={STYLES.group}>
            {rows.map((row, index) => (
                <Fragment key={(row as { key?: string }).key ?? index}>
                    {row}
                    {index < rows.length - 1 ? <View style={STYLES.separator} /> : null}
                </Fragment>
            ))}
        </View>
    );
}

const STYLES = StyleSheet.create({
    group: {
        backgroundColor: PaperInk.CARD,
        borderColor: PaperInk.LINE,
        borderWidth: 1,
        borderRadius: Metric.RADIUS_CARD,
        overflow: 'hidden',
    },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: PaperInk.LINE, marginLeft: Metric.GUTTER },
});
