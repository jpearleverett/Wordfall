/**
 * Silhouette geometry for `AvatarPortrait`, in a 100×100 viewBox clipped to
 * the avatar disc. One entry per `HoodStyle`; the FACE itself is shared
 * (features must stay readable at 44px) while hood, drape, cloak, collar and
 * the rim-light strokes change per variant so the four portraits read as
 * different characters in silhouette alone.
 *
 * Pure strings — no react-native-svg import, so this is unit-testable.
 */
import { HoodStyle } from './avatarVariants';

export interface HoodShapes {
  /** Outer cloth mass: crown down to the shoulders, drawn behind the face. */
  hood: string;
  /** Crescent band of the hood's front edge, drawn OVER the forehead. */
  crest: string;
  /** Cloth falling on the lit (viewer-left) side of the face. */
  drapeL: string;
  /** Cloth on the shadowed side — carries each variant's flourish. */
  drapeR: string;
  /** Shoulders / chest mass, running off the bottom edge. */
  cloak: string;
  /** Collar band tucked under the chin. */
  collar: string;
  /** Rim-light stroke tracing the lit edge of the hood. */
  rimHead: string;
  /** Rim-light stroke continuing along the lit shoulder. */
  rimShoulder: string;
}

/** Shared 3/4 face plane. Chin ~ (50,63); the lit edge is viewer-left. */
export const FACE =
  'M37.8 37.4 C39 32 45.6 29.2 51.8 30.2 C58.4 31.2 61.6 36.6 61.4 44.2 ' +
  'C61.2 51.6 57.6 59.4 51.4 62.6 C46.6 65 41.6 62 39.4 55.6 ' +
  'C37.4 49.6 36.8 41.8 37.8 37.4 Z';

/** Far-cheek core shadow — the turn of the head away from the sun. */
export const FACE_SHADOW =
  'M55.6 35.4 C60.8 39.6 61.6 50 57.4 57.6 C55.4 61 52.6 62.8 50.6 63 ' +
  'C56 58 59.6 47 55.6 35.4 Z';

/** Lit cheek plane catching the sun. */
export const FACE_LIT =
  'M40.6 38.6 C43.6 35 48 34 50.6 35.6 C50 41.8 47.6 50.4 44.4 55.6 ' +
  'C42 53.4 40 47.6 39.8 43 C39.6 41 40 39.6 40.6 38.6 Z';

/** Neck, in half shadow under the jaw. */
export const NECK =
  'M43.6 57.6 C44 62.8 43.6 66.4 41.8 68.8 C47 71.8 55.2 71.2 59 68.6 ' +
  'C56.4 66 55.4 62 55.4 57.4 Z';

export const BROW_NEAR = 'M39.8 42.4 C42.6 39.8 47 39.2 50.4 40.6';
export const BROW_FAR = 'M54 41.4 C56 41 57.6 41.8 58.4 43.2';
export const NOSE = 'M47.4 45.4 C46.4 49.6 45.2 52.4 47.6 53.4';
export const MOUTH = 'M44.8 57 C46.8 58.2 49.4 57.8 51.2 56.4';

export const HOOD_SHAPES: Record<HoodStyle, HoodShapes> = {
  // Canonical Word Architect — tall peaked cowl.
  peaked: {
    hood:
      'M20.5 76 C15.5 60 17.5 40 26.5 29 C31.5 21.5 39.5 14.5 47.5 10.2 ' +
      'C52.5 14.6 55.5 18.6 59.5 22 C69 28.5 76.5 35 80.5 45 ' +
      'C84 57 83.5 66 80 76 C64 82 36 82 20.5 76 Z',
    crest:
      'M31.4 49.5 C30.4 33 39 22 50.6 20.8 C62.2 22 70.4 33 69.4 49.5 ' +
      'C68.4 38.4 61.6 30.2 50.6 30.2 C39.6 30.2 32.4 38.4 31.4 49.5 Z',
    drapeL: 'M31.4 47 C30.4 57 31.4 65 34.6 71 L26 75.5 C21.4 65.5 21 55 23.2 44 Z',
    drapeR: 'M69.4 47 C70.4 57.5 69 66 65.4 72 L75 76.5 C80 66 80.4 55 78 43.5 Z',
    cloak:
      'M3 100 C5.5 83 15.5 73.5 29.5 69.5 L43 66.5 L57 66.5 L70.5 69.5 ' +
      'C84.5 73.5 94.5 83 97 100 Z',
    collar: 'M33.5 69.5 C39.5 77.5 60.5 77.5 66.5 69.5 L71.5 74 C63.5 84.5 36.5 84.5 28.5 74 Z',
    rimHead: 'M47.6 10.8 C39.8 15.2 32 22 27.2 29.6 C20.6 40 18.8 55.4 21 70',
    rimShoulder: 'M28 70.5 C16.5 74.6 7.6 84 4.6 97',
  },
  // Archivist scribe — rounded hood, slimmer mantle.
  round: {
    hood:
      'M21.5 76.5 C16.5 62 19.5 44 29.5 34 C36.5 27 43.5 23.5 50.5 23.5 ' +
      'C58 23.5 65.5 27.5 71.5 34.5 C81 44.5 83.5 62 79 76.5 C64 82.5 36.5 82.5 21.5 76.5 Z',
    crest:
      'M32 50 C31.4 36 39.4 25.6 50.6 24.6 C61.8 25.6 69.6 36 69 50 ' +
      'C68 40 61.4 32.6 50.6 32.6 C39.8 32.6 33 40 32 50 Z',
    drapeL: 'M32 48 C31 57.5 32 65 35 70.5 L27 75 C22.6 65.5 22.2 55.5 24 45 Z',
    drapeR: 'M69 48 C70 58 68.6 66 65 71.5 L74 76 C79 66 79.4 55.5 77.2 44.5 Z',
    cloak:
      'M6 100 C8.5 84.5 18 75 31 70.5 L43.5 67.5 L56.5 67.5 L69 70.5 ' +
      'C82 75 91.5 84.5 94 100 Z',
    collar: 'M34.5 70.5 C40 78 60 78 65.5 70.5 L70 75 C62.5 85 37.5 85 30 75 Z',
    rimHead: 'M50.5 24 C43.6 24.4 36.8 28 30.2 35 C22.6 43.4 20 58 21.8 71',
    rimShoulder: 'M30.5 71 C19.5 75.4 10.6 84.6 7.4 97',
  },
  // Warden — broad mantle, hood pushed back off the brow.
  broad: {
    hood:
      'M17 78 C13 62 16.5 44 27 33 C34.5 25.5 43 21.5 51 21 ' +
      'C60 22 69.5 27 76 35.5 C85.5 47 86.5 63 82 78 C64 84.5 35 84.5 17 78 Z',
    crest:
      'M29.5 44 C29 30.5 38.4 20.6 50.6 19.6 C62.8 20.6 71.2 30.5 70.6 44 ' +
      'C69.2 32.6 62 26.6 50.6 26.6 C39.2 26.6 31 32.6 29.5 44 Z',
    drapeL: 'M29.6 42 C28 54 29.6 65 33.6 72 L24 76.5 C19 65 18.6 53 21 40 Z',
    drapeR: 'M70.6 42 C72 54.5 70 66 66 72.5 L76.5 77 C82 65.5 82 53 79.4 39.5 Z',
    cloak:
      'M0 100 C1.5 81 12 70.5 27.5 66.5 L42.5 63.5 L57.5 63.5 L72.5 66.5 ' +
      'C88 70.5 98.5 81 100 100 Z',
    collar: 'M31 66.5 C38 76.5 62 76.5 69 66.5 L75 71.5 C65.5 84 34.5 84 25 71.5 Z',
    rimHead: 'M51 21.4 C43.4 22.2 35.4 26 27.8 33.8 C20 42.6 17.4 57.6 18.4 72',
    rimShoulder: 'M27 67.6 C13.5 71.6 3.4 81.6 1.4 97',
  },
  // Oracle — tight wrapped shawl with a veil trailing off the shoulder.
  wrapped: {
    hood:
      'M24 75 C19.5 61 21.5 42 30.5 31.5 C36.5 24.5 43.5 20.5 50.5 20 ' +
      'C58.5 21 65.5 26 71 34 C79 45.5 80.5 62 77 75.5 C62 81 38 81 24 75 Z',
    crest:
      'M33 51.5 C32 35.5 40 25 50.6 24 C61.4 25 69 35.5 68 51.5 ' +
      'C67 40 60.8 33 50.6 33 C40.4 33 34 40 33 51.5 Z',
    drapeL: 'M33 49 C32 58.5 33.4 66 36.4 71.5 L29 75.5 C24.6 66 24 56 25.6 46 Z',
    drapeR:
      'M68 47 C70 58 70.5 70 68 79.5 C74 81.5 79.5 88 81.5 98 L88 98 ' +
      'C86 80 78.5 64 76 44 Z',
    cloak:
      'M8 100 C10 85 19 76 32 71.5 L44 68.5 L56 68.5 L68 71.5 ' +
      'C81 76 90 85 92 100 Z',
    collar: 'M35 71.5 C40.5 79 59.5 79 65 71.5 L69.5 76 C62 86 38 86 30.5 76 Z',
    rimHead: 'M50.5 20.4 C43.8 21 37.4 24.8 31.4 32 C24.6 41.2 22 57 24.4 69.6',
    rimShoulder: 'M32 72 C21 76.4 12.4 85 9.6 97',
  },
};
