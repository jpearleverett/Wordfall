import React from 'react';
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

// Lazy-load expo-video to gracefully handle environments where it's unavailable
let useVideoPlayerHook: any = null;
let VideoViewComponent: any = null;
let videoLoadAttempted = false;

function loadVideoModule() {
  if (!videoLoadAttempted) {
    videoLoadAttempted = true;
    try {
      const mod = require('expo-video');
      useVideoPlayerHook = mod.useVideoPlayer;
      VideoViewComponent = mod.VideoView;
    } catch {
      // expo-video not available — components stay null
    }
  }
}

/**
 * Full-screen looping video background using expo-video.
 * Designed to be layered behind other content via absolute positioning.
 * Gracefully falls back to a transparent view if expo-video is unavailable.
 */
function VideoBackgroundInner({
  source,
  opacity = 0.5,
  overlayColor,
}: VideoBackgroundProps) {
  loadVideoModule();

  if (!useVideoPlayerHook || !VideoViewComponent) {
    // Fallback: no video, just optional overlay
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
        {overlayColor && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]} />
        )}
      </View>
    );
  }

  return (
    <VideoBackgroundWithPlayer
      source={source}
      opacity={opacity}
      overlayColor={overlayColor}
    />
  );
}

/**
 * Inner component that uses the hook — only rendered when expo-video is available.
 * Separated so the hook call is unconditional within this component.
 */
function VideoBackgroundWithPlayer({
  source,
  opacity = 0.5,
  overlayColor,
}: VideoBackgroundProps) {
  const player = useVideoPlayerHook(source, (p: any) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const VideoView = VideoViewComponent;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
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
}

export const VideoBackground = React.memo(VideoBackgroundInner);
