import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { ExtendedTheme } from '@/theme/AppTheme';

interface BronzeStylusIconProps {
  size?: number;
  color?: string;
}

export function BronzeStylusIcon({ size = 48, color }: BronzeStylusIconProps): React.JSX.Element {
  const theme = useTheme() as ExtendedTheme;
  const colors = theme.colors.secureSessionButton;
  
  const fillColor = color || colors.recordingIconColorDark;
  const strokeColor = colors.recordingIconColorLight;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M19.07 4.93L17.07 6.93C17.07 6.93 16.05 8.38 15.68 9.94C15.31 11.5 16.03 12.07 15.34 13.56C14.65 15.05 13.33 15.67 11.95 16.96C10.57 18.25 10.33 19.86 10.33 19.86L4.01 20.01L4.13 13.67C4.13 13.67 5.76 13.43 7.04 12.05C8.33 10.67 8.95 9.35 10.44 8.66C11.93 7.97 12.5 8.69 14.06 8.32C15.62 7.95 17.07 6.93 17.07 6.93L19.07 4.93Z"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={0.75}
          strokeLinejoin="round"
        />
        <Path
          d="M10.5 19.5L16.5 7.5"
          stroke={strokeColor}
          strokeWidth={0.75}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
