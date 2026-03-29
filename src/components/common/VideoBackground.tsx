import React, { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

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
 *
 * Gracefully falls back to a transparent view if expo-av's Video component
 * is unavailable (e.g. native module not linked in Expo Go) to prevent
 * EventEmitter crashes.
 */

// Lazy-load expo-av to prevent crash when native module isn't available
let VideoComponent: any = null;
let ResizeModeValue: any = null;
let videoLoadAttempted = false;

function getVideoComponent() {
  if (!videoLoadAttempted) {
    videoLoadAttempted = true;
    try {
      const av = require('expo-av');
      VideoComponent = av.Video;
      ResizeModeValue = av.ResizeMode?.COVER ?? 'cover';
    } catch {
      // expo-av not available — VideoComponent stays null
    }
  }
  return VideoComponent;
}

export const VideoBackground = React.memo(function VideoBackground({
  source,
  opacity = 0.5,
  overlayColor,
}: VideoBackgroundProps) {
  const videoRef = useRef<any>(null);
  const Video = getVideoComponent();

  const onPlaybackStatusUpdate = useCallback(() => {
    // No-op: looping is handled by the isLooping prop
  }, []);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      {Video ? (
        <Video
          ref={videoRef}
          source={source}
          resizeMode={ResizeModeValue}
          shouldPlay
          isLooping
          isMuted
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
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
