/**
 * Harness shim for expo-linear-gradient. Uses a plain div with the
 * CSS `linear-gradient` function — good enough for visual approximation,
 * skips the Expo native module entirely.
 */
import React from 'react';

interface Props {
  colors: readonly string[] | string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  locations?: number[];
  style?: any;
  children?: React.ReactNode;
}

export function LinearGradient({
  colors,
  start,
  end,
  locations,
  style,
  children,
  ...rest
}: Props): JSX.Element {
  // Compute angle from start→end (defaults to top→bottom).
  const sx = start?.x ?? 0;
  const sy = start?.y ?? 0;
  const ex = end?.x ?? 0;
  const ey = end?.y ?? 1;
  const dx = ex - sx;
  const dy = ey - sy;
  // CSS gradient angle: 0deg = to top; compute to correct convention.
  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const stops = (colors as string[])
    .map((c, i) => {
      const pct =
        locations?.[i] !== undefined
          ? `${Math.round(locations[i]! * 100)}%`
          : '';
      return `${c} ${pct}`.trim();
    })
    .join(', ');
  const gradient = `linear-gradient(${angle.toFixed(2)}deg, ${stops})`;
  return (
    <div
      style={{
        ...flattenRNStyle(style),
        backgroundImage: gradient,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

function flattenRNStyle(style: any): React.CSSProperties {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.reduce<React.CSSProperties>(
      (acc, s) => ({ ...acc, ...flattenRNStyle(s) }),
      {},
    );
  }
  return style as React.CSSProperties;
}

export default LinearGradient;
