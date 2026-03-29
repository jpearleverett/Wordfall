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
let videoAvailable = false;

function loadVideoModule() {
  if (!videoLoadAttempted) {
    videoLoadAttempted = true;
    try {
      const mod = require('expo-video');
      useVideoPlayerHook = mod.useVideoPlayer;
      VideoViewComponent = mod.VideoView;
      videoAvailable = !!(useVideoPlayerHook && VideoViewComponent);
    } catch {
      videoAvailable = false;
    }
  }
}

/**
 * Error boundary that catches crashes from the video player and renders nothing.
 */
class VideoErrorBoundary extends React.Component<
  { children: React.ReactNode; overlayColor?: string; opacity?: number },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[VideoBackground] Crashed, falling back to static view:', error.message);
  }

  render() {
    if (this.state.hasError) {
      // Fallback: just the overlay color, no video
      return (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: this.props.opacity ?? 0.5 }]}>
          {this.props.overlayColor && (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: this.props.overlayColor }]} />
          )}
        </View>
      );
    }
    return this.props.children;
  }
}

/**
 * Full-screen looping video background using expo-video.
 * Wrapped in an error boundary so crashes render a transparent fallback
 * instead of crashing the entire app.
 */
function VideoBackgroundInner({
  source,
  opacity = 0.5,
  overlayColor,
}: VideoBackgroundProps) {
  loadVideoModule();

  if (!videoAvailable) {
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
        {overlayColor && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]} />
        )}
      </View>
    );
  }

  return (
    <VideoErrorBoundary overlayColor={overlayColor} opacity={opacity}>
      <VideoBackgroundWithPlayer
        source={source}
        opacity={opacity}
        overlayColor={overlayColor}
      />
    </VideoErrorBoundary>
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
