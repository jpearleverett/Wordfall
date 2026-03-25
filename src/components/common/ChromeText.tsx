import React from 'react';
import { StyleSheet, Text, TextStyle, View } from 'react-native';
import { COLORS, FONTS, MATERIALS } from '../../constants';

interface ChromeTextProps {
  children: string;
  fontSize?: number;
  letterSpacing?: number;
  style?: TextStyle;
  /** Color of the chrome highlight glow (default: COLORS.chrome) */
  glowColor?: string;
}

/**
 * Metallic chrome text effect — layered Text elements with shadow for depth.
 * No animation, purely static visual treatment.
 *
 * Renders three layers:
 * 1. Dark shadow layer (offset below)
 * 2. Mid chrome layer (slight offset)
 * 3. Bright highlight layer (top, with glow shadow)
 */
const ChromeText: React.FC<ChromeTextProps> = ({
  children,
  fontSize = 36,
  letterSpacing = 4,
  style,
  glowColor = COLORS.chrome,
}) => {
  const baseStyle: TextStyle = {
    fontFamily: FONTS.display,
    fontSize,
    letterSpacing,
    textAlign: 'center',
    ...style,
  };

  return (
    <View style={styles.container}>
      {/* Shadow layer */}
      <Text
        style={[
          baseStyle,
          styles.shadowLayer,
          { textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 12 },
        ]}
      >
        {children}
      </Text>
      {/* Chrome mid layer */}
      <Text
        style={[
          baseStyle,
          styles.midLayer,
          { color: COLORS.chromeDark },
        ]}
      >
        {children}
      </Text>
      {/* Bright highlight layer with glow */}
      <Text
        style={[
          baseStyle,
          styles.topLayer,
          {
            color: COLORS.chromeHighlight,
            ...MATERIALS.chrome,
            textShadowColor: glowColor,
          },
        ]}
      >
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadowLayer: {
    color: 'rgba(0,0,0,0.4)',
    position: 'absolute',
    textShadowOffset: { width: 0, height: 4 },
  },
  midLayer: {
    position: 'absolute',
    textShadowColor: 'rgba(138,154,181,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  topLayer: {
    // Top layer is positioned naturally (not absolute) to drive container size
  },
});

export default React.memo(ChromeText);
