import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Image, ImageSourcePropType } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

interface VideoBackgroundProps {
  source: number; // require() asset
  opacity?: number;
  /**
   * Optional overlay tint color (e.g. 'rgba(10,0,21,0.4)')
   * rendered on top of the video for blending with the UI.
   */
  overlayColor?: string;
  /**
   * When true (default), defers video loading until the component is mounted
   * and shows a static placeholder image in the meantime.
   */
  lazy?: boolean;
  /**
   * Static image to display while the video is loading (or if video is unavailable).
   * Falls back to a plain overlay color if not provided.
   */
  placeholder?: ImageSourcePropType;
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
 * Static placeholder shown while video is loading or unavailable.
 */
function PlaceholderView({
  placeholder,
  opacity = 0.5,
  overlayColor,
}: {
  placeholder?: ImageSourcePropType;
  opacity?: number;
  overlayColor?: string;
}) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      {placeholder && (
        <Image
          source={placeholder}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}
      {overlayColor && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]} />
      )}
    </View>
  );
}

/**
 * Error boundary that catches crashes from the video player and renders a placeholder.
 */
class VideoErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    overlayColor?: string;
    opacity?: number;
    placeholder?: ImageSourcePropType;
  },
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
      return (
        <PlaceholderView
          placeholder={this.props.placeholder}
          opacity={this.props.opacity}
          overlayColor={this.props.overlayColor}
        />
      );
    }
    return this.props.children;
  }
}

/**
 * Full-screen looping video background using expo-video.
 * Supports lazy loading: when `lazy` is true (default), the video module
 * is not loaded until the component mounts, showing a static placeholder
 * image in the meantime. Wrapped in an error boundary so crashes render
 * a transparent fallback instead of crashing the entire app.
 */
function VideoBackgroundInner({
  source,
  opacity = 0.5,
  overlayColor,
  lazy = true,
  placeholder,
}: VideoBackgroundProps) {
  const [shouldLoad, setShouldLoad] = useState(!lazy);

  useEffect(() => {
    if (!lazy) return;

    // Defer video loading to after mount so it doesn't block app startup.
    // Use a small delay to let the initial render settle first.
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [lazy]);

  // Show placeholder until we decide to load video
  if (!shouldLoad) {
    return (
      <PlaceholderView
        placeholder={placeholder}
        opacity={opacity}
        overlayColor={overlayColor}
      />
    );
  }

  loadVideoModule();

  if (!videoAvailable) {
    return (
      <PlaceholderView
        placeholder={placeholder}
        opacity={opacity}
        overlayColor={overlayColor}
      />
    );
  }

  return (
    <VideoErrorBoundary overlayColor={overlayColor} opacity={opacity} placeholder={placeholder}>
      <VideoBackgroundWithPlayer
        source={source}
        opacity={opacity}
        overlayColor={overlayColor}
        placeholder={placeholder}
      />
    </VideoErrorBoundary>
  );
}

/**
 * Inner component that uses the hook — only rendered when expo-video is available.
 * Separated so the hook call is unconditional within this component.
 * Shows a placeholder image until the video is ready to play.
 */
function VideoBackgroundWithPlayer({
  source,
  opacity = 0.5,
  overlayColor,
  placeholder,
}: VideoBackgroundProps) {
  const [videoReady, setVideoReady] = useState(false);
  const isFocused = useIsFocused();

  const onStatusChange = useCallback((status: any) => {
    if (status === 'readyToPlay' || status?.status === 'readyToPlay') {
      setVideoReady(true);
    }
  }, []);

  const player = useVideoPlayerHook(source, (p: any) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  // Pause/resume the video when the screen loses/gains focus. A looping video
  // decodes H.264/VP9 every frame on the GPU — leaving it running on inactive
  // screens in the stack is a big drain even at reduced opacity.
  useEffect(() => {
    if (!player) return;
    try {
      if (isFocused) {
        if (player.play) player.play();
      } else {
        if (player.pause) player.pause();
      }
    } catch {
      // Ignore — some player versions don't expose play/pause safely
    }
  }, [player, isFocused]);

  // Listen for player status changes to know when video is ready
  useEffect(() => {
    if (!player) return;

    // Some versions of expo-video emit events; try to subscribe
    if (player.addListener) {
      const sub = player.addListener('statusChange', onStatusChange);
      return () => {
        if (sub?.remove) sub.remove();
      };
    }

    // Fallback: consider video ready after a short delay
    const timer = setTimeout(() => setVideoReady(true), 500);
    return () => clearTimeout(timer);
  }, [player, onStatusChange]);

  // Clean up player on unmount
  useEffect(() => {
    return () => {
      if (player) {
        try {
          if (player.pause) player.pause();
          if (player.release) player.release();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [player]);

  const VideoView = VideoViewComponent;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      {/* Show placeholder until video is ready */}
      {!videoReady && placeholder && (
        <Image
          source={placeholder}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}
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
