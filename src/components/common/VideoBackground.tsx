import React, { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

interface VideoBackgroundProps {
  source: number; // require() asset
  opacity?: number;
  /**
   * Optional overlay tint color (e.g. 'rgba(10,0,21,0.4)')
   * rendered on top of the video for blending with the UI.
   */
  overlayColor?: string;
}

/**
 * Full-screen looping video background using expo-av.
 * Designed to be layered behind other content via absolute positioning.
 * Uses `isLooping` + `shouldPlay` for seamless loops. Muted by default.
 */
export const VideoBackground = React.memo(function VideoBackground({
  source,
  opacity = 0.5,
  overlayColor,
}: VideoBackgroundProps) {
  const videoRef = useRef<Video>(null);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    // No-op: looping is handled by the isLooping prop
  }, []);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      <Video
        ref={videoRef}
        source={source}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        style={StyleSheet.absoluteFill}
      />
      {overlayColor && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: overlayColor },
          ]}
        />
      )}
    </View>
  );
});
