import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ImageStyle, StyleSheet, View, ViewStyle } from 'react-native';

interface CachedImageProps {
  uri: string;
  style?: ImageStyle | ViewStyle | (ImageStyle | ViewStyle | undefined)[];
  overlayColor?: string;
  overlayOpacity?: number;
  fadeIn?: boolean;
  blurRadius?: number;
}

/**
 * Cached remote image with fade-in animation and optional overlay.
 * Used for premium background textures throughout the game.
 */
export function CachedImage({
  uri,
  style,
  overlayColor = 'rgba(10, 14, 39, 0.6)',
  overlayOpacity = 0.6,
  fadeIn = true,
  blurRadius = 0,
}: CachedImageProps) {
  const opacity = useRef(new Animated.Value(fadeIn ? 0 : 1)).current;
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded && fadeIn) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
  }, [loaded, fadeIn, opacity]);

  return (
    <View style={[StyleSheet.absoluteFill, style as ViewStyle]} pointerEvents="none">
      <Animated.Image
        source={{ uri }}
        style={[StyleSheet.absoluteFill, { opacity }]}
        resizeMode="cover"
        blurRadius={blurRadius}
        onLoad={() => setLoaded(true)}
      />
      {overlayColor && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: overlayColor, opacity: overlayOpacity },
          ]}
        />
      )}
    </View>
  );
}
