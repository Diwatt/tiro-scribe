import type { Meta, StoryObj } from '@storybook/react-native';
import { StyleSheet, View } from 'react-native';
import { TiroMark, Wordmark } from '../../src/Components/Kit';
import { PaperInk } from '../../src/theme/PaperInk';

const meta: Meta<typeof TiroMark> = {
    title: 'Kit/Brand',
    component: TiroMark,
    args: { size: 120 },
    argTypes: { size: { control: { type: 'range', min: 16, max: 240, step: 4 } } },
};

export default meta;
type Story = StoryObj<typeof TiroMark>;

export const Mark: Story = {
    render: (args) => (
        <View style={styles.center}>
            <View style={[styles.tile, { backgroundColor: PaperInk.BRAND_GROUND }]}>
                <TiroMark size={args.size} />
            </View>
            <View style={[styles.tile, { backgroundColor: PaperInk.BRAND_INK }]}>
                <TiroMark size={args.size} ink={PaperInk.WHITE} fill={PaperInk.BRAND_INK} ground={PaperInk.BRAND_INK} />
            </View>
        </View>
    ),
};

export const Sizes: Story = {
    render: () => (
        <View style={[styles.center, styles.row]}>
            {[96, 60, 40, 28, 20].map((size) => (
                <TiroMark key={size} size={size} ground={PaperInk.PAPER} />
            ))}
        </View>
    ),
};

export const WordmarkLockup: Story = {
    render: () => (
        <View style={styles.center}>
            <Wordmark size={80} />
        </View>
    ),
};

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
    row: { flexDirection: 'row', alignItems: 'flex-end' },
    tile: { padding: 24, borderRadius: 48 },
});
