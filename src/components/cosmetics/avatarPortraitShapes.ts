/**
 * Pose geometry for `AvatarPortrait`, in a 100×100 viewBox clipped to the
 * avatar disc.
 *
 * Two layers of data:
 *   FACE_PLANES — five head constructions (3/4, profile, front, turned away,
 *                 downcast). Feature placement travels WITH the plane, so a
 *                 profile head gets a profile nose and one eye, not the 3/4
 *                 features nudged sideways.
 *   PORTRAIT_POSES — one entry per pose family: which face plane it uses, how
 *                 the head is angled, the hood/hair/cloak/collar silhouette,
 *                 the rim-light strokes, and the accessory prop layers.
 *
 * Pure strings + numbers — no react-native-svg import, so this is unit-testable.
 */
import { PoseId } from './avatarVariants';

/** Paint slot resolved to a real colour by `AvatarPortrait`. */
export type PaintRole =
  | 'cloth'
  | 'clothLit'
  | 'clothDeep'
  | 'collar'
  | 'collarLit'
  | 'collarDeep'
  | 'skin'
  | 'skinLit'
  | 'skinDeep'
  | 'feature'
  | 'metal'
  | 'metalLit'
  | 'metalDeep'
  | 'paper'
  | 'paperDeep'
  | 'accent'
  | 'glow'
  | 'rim'
  | 'dark'
  | 'white';

/** One drawn layer: a path or a circle, filled and/or stroked from a role. */
export type PoseShape =
  | {
      t: 'p';
      d: string;
      fill?: PaintRole;
      stroke?: PaintRole;
      sw?: number;
      op?: number;
      /** Round the stroke ends — for open strokes read as line work. */
      cap?: boolean;
    }
  | {
      t: 'c';
      cx: number;
      cy: number;
      r: number;
      fill?: PaintRole;
      stroke?: PaintRole;
      sw?: number;
      op?: number;
    };

export interface Eye {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Dimmed for a far eye on a turned head. */
  op?: number;
}

export interface FacePlane {
  /** Face mass. */
  face: string;
  /** Plane catching the sun. */
  lit: string;
  /** Core shadow on the turned-away side. */
  shadow: string;
  /** Neck, in half shadow under the jaw. */
  neck: string;
  /** Hood/brim shadow falling across the forehead. */
  browBar: string;
  browNear: string;
  browFar?: string;
  nose: string;
  mouth?: string;
  jaw: string;
  eyeNear: Eye;
  eyeFar?: Eye;
}

export type FacePlaneId =
  | 'threeQuarter'
  | 'profile'
  | 'front'
  | 'turnedAway'
  | 'downcast';

export const FACE_PLANES: Record<FacePlaneId, FacePlane> = {
  /** Canonical 3/4 turn, chin ~ (50,63), lit edge viewer-left. */
  threeQuarter: {
    face:
      'M37.8 37.4 C39 32 45.6 29.2 51.8 30.2 C58.4 31.2 61.6 36.6 61.4 44.2 ' +
      'C61.2 51.6 57.6 59.4 51.4 62.6 C46.6 65 41.6 62 39.4 55.6 ' +
      'C37.4 49.6 36.8 41.8 37.8 37.4 Z',
    lit:
      'M40.6 38.6 C43.6 35 48 34 50.6 35.6 C50 41.8 47.6 50.4 44.4 55.6 ' +
      'C42 53.4 40 47.6 39.8 43 C39.6 41 40 39.6 40.6 38.6 Z',
    shadow:
      'M55.6 35.4 C60.8 39.6 61.6 50 57.4 57.6 C55.4 61 52.6 62.8 50.6 63 ' +
      'C56 58 59.6 47 55.6 35.4 Z',
    neck:
      'M43.6 57.6 C44 62.8 43.6 66.4 41.8 68.8 C47 71.8 55.2 71.2 59 68.6 ' +
      'C56.4 66 55.4 62 55.4 57.4 Z',
    browBar:
      'M37.4 39.6 C42 34.6 55 33.4 61.2 38.4 L61.4 42.6 C54 37.6 43 38.4 37.6 43.4 Z',
    browNear: 'M39.8 42.4 C42.6 39.8 47 39.2 50.4 40.6',
    browFar: 'M54 41.4 C56 41 57.6 41.8 58.4 43.2',
    nose: 'M47.4 45.4 C46.4 49.6 45.2 52.4 47.6 53.4',
    mouth: 'M44.8 57 C46.8 58.2 49.4 57.8 51.2 56.4',
    jaw: 'M40.4 55.4 C43 61 47.4 63.6 51.4 62.4',
    eyeNear: { cx: 43.6, cy: 46.4, rx: 2.7, ry: 1.8 },
    eyeFar: { cx: 55.2, cy: 45.6, rx: 2, ry: 1.5, op: 0.9 },
  },

  /** Full profile facing viewer-left: nose and lips break the silhouette. */
  profile: {
    face:
      'M52.4 30 C45.6 30 40.4 34 38.2 40.2 C36.8 44.2 34.2 46.6 34.2 48.2 ' +
      'C34.2 49.6 36 50.2 37.2 50.8 C37.8 53 36.6 54.6 37.8 56 ' +
      'C39.6 57.8 42.4 58.6 45 58 C47.2 61.2 51.4 62.2 54.4 60.6 ' +
      'C57.4 58.6 58.8 52 58.4 44 C58 35.6 56 30 52.4 30 Z',
    lit:
      'M40.6 36.4 C38 41.4 35.4 46.4 34.8 48.4 C36.4 49.2 37.4 50 37.8 51.4 ' +
      'C39.2 47 41.8 40 44.4 36.6 Z',
    shadow:
      'M52.6 32 C56.4 36 58.4 44 57.8 51.4 C57.2 57 55.4 60.4 53 61 ' +
      'C55.4 54 56.2 41 52.6 32 Z',
    neck:
      'M45 56.6 C45.6 61.6 45 65.6 43 68.6 C48.6 71.6 56 71 59.6 68.4 ' +
      'C56.8 65.6 56 61.6 56 56.4 Z',
    browBar:
      'M39.4 36.8 C43.2 32.6 52.4 31.4 56.4 34.6 L56.8 38.6 C51.6 34.8 43.8 35.6 39.8 40.2 Z',
    browNear: 'M40.4 41.6 C42.4 39.4 45.4 39 47.6 40.2',
    nose: 'M36.2 48.6 C37.4 49.6 38.8 49.6 39.6 48.8',
    mouth: 'M37.6 52.6 C39.4 53.8 41.2 53.6 42.4 52.6',
    jaw: 'M39 56.4 C42.6 59.6 47.4 60.6 51.4 59',
    eyeNear: { cx: 42.4, cy: 44.4, rx: 2.2, ry: 1.7 },
  },

  /** Straight-on, symmetric — the oracle meets the player's eye. */
  front: {
    face:
      'M38.6 40 C38.6 32.6 43.6 29.2 50 29.2 C56.4 29.2 61.4 32.6 61.4 40 ' +
      'C61.4 48.6 58.4 57.4 53.6 61.4 C51.4 63.2 48.6 63.2 46.4 61.4 ' +
      'C41.6 57.4 38.6 48.6 38.6 40 Z',
    lit:
      'M40.6 37 C42.6 32.6 46.6 31 49.4 31.6 C48.6 41 47 52.6 45.2 58.6 ' +
      'C42.6 54.4 40.4 46 40.2 40.6 Z',
    shadow:
      'M56.6 34 C59.6 38 60.2 47 57.4 55 C56.2 58.6 54.6 60.6 53.2 61.4 ' +
      'C56.4 54 58.4 43 56.6 34 Z',
    neck:
      'M44.6 57.4 C44.6 62.6 44 66.4 42.2 69 C47.4 72 53.6 72 57.8 69 ' +
      'C56 66.4 55.4 62.6 55.4 57.4 Z',
    browBar:
      'M38.8 38.6 C43 33.4 57 33.4 61.2 38.6 L61.2 42.6 C56.4 37.6 43.6 37.6 38.8 42.6 Z',
    browNear: 'M41.6 41 C43.6 38.8 46.6 38.8 48.4 40.2',
    browFar: 'M51.6 40.2 C53.4 38.8 56.4 38.8 58.4 41',
    nose: 'M50 44 C49 48.6 48.4 51.4 50.6 52.4',
    mouth: 'M46.6 56.4 C48.6 57.6 51.4 57.6 53.4 56.2',
    jaw: 'M43 54 C45.6 60.2 54.4 60.2 57 54',
    eyeNear: { cx: 45, cy: 45.2, rx: 2.5, ry: 1.9 },
    eyeFar: { cx: 55, cy: 45.2, rx: 2.5, ry: 1.9 },
  },

  /** Turned away over the shoulder — only a crescent of cheek is lit. */
  turnedAway: {
    face:
      'M56.6 34.6 C61.4 35.6 64 40.6 63.4 47.4 C62.8 54 60 59.4 56 61 ' +
      'C54.4 61.6 53.2 60.6 53 58.6 C55.6 51.6 56.8 42 56.6 34.6 Z',
    lit: 'M58.6 36.6 C61.4 39 62.6 43 62.2 47.6 C60.6 46 58.6 41 58.6 36.6 Z',
    shadow: 'M53.4 40 C54.6 47 54.4 54.4 53.2 59.4 C52.2 57 52 46.6 53.4 40 Z',
    neck:
      'M48 56 C48.6 61.6 48 65.6 46 68.6 C51.6 71.6 58.6 70.6 61.6 68 ' +
      'C59.4 65.4 58.6 61.4 58.6 56 Z',
    browBar:
      'M55.6 36 C58.6 34.6 62 36 63.4 39.4 L63 43 C61.4 39.4 58.4 38 55.8 39.6 Z',
    browNear: 'M58.6 42.6 C60 41.4 61.6 41.6 62.6 42.8',
    nose: 'M62.8 45.8 C63.6 47.6 63.6 49 62.4 49.6',
    mouth: 'M60.4 53.2 C61.4 53.8 62.4 53.6 63 52.6',
    jaw: 'M55 56.6 C57.4 60.4 60.4 61 62.4 59.4',
    eyeNear: { cx: 60.8, cy: 45.6, rx: 1.5, ry: 1.2, op: 0.85 },
  },

  /** Head tipped down over the work — lids low, features crowded downward. */
  downcast: {
    face:
      'M38.6 39.4 C39.6 34.4 45.6 31.6 51.6 32.6 C58 33.8 61.4 39.4 61 46.6 ' +
      'C60.6 54 57 61.4 51 64.4 C46.4 66.6 41.6 63.6 39.6 57.4 ' +
      'C37.8 51.6 37.6 43.6 38.6 39.4 Z',
    lit:
      'M41 41 C44 37.4 48 36.4 50.6 38 C50 44 47.6 52.4 44.6 57.4 ' +
      'C42.2 55.4 40.4 49.6 40.2 45 C40 43 40.4 42 41 41 Z',
    shadow:
      'M55.6 37.4 C60.6 41.6 61.6 51.6 57.4 59 C55.4 62.4 52.6 64.2 50.6 64.4 ' +
      'C56 59.4 59.4 48.6 55.6 37.4 Z',
    neck:
      'M44 59 C44.4 63.6 44 67 42.2 69.4 C47.4 72 55.4 71.4 59 69 ' +
      'C56.4 66.6 55.6 63 55.6 58.6 Z',
    browBar:
      'M38.2 41.6 C43 36.6 55.6 35.4 61 40.4 L61.2 44.6 C54 39.6 43.6 40.4 38.4 45.4 Z',
    browNear: 'M40.4 45.6 C43.2 43.4 47.4 43 50.6 44.6',
    browFar: 'M54.4 45 C56.4 44.6 58 45.4 58.8 46.8',
    nose: 'M47.6 49.4 C46.6 53 45.4 55.4 47.6 56.4',
    mouth: 'M45 59.4 C47 60.4 49.6 60 51.4 58.6',
    jaw: 'M40.6 57.6 C43.2 63 47.6 65.4 51.6 64.2',
    eyeNear: { cx: 44, cy: 49.6, rx: 2.6, ry: 1.25 },
    eyeFar: { cx: 55.4, cy: 48.8, rx: 1.9, ry: 1, op: 0.85 },
  },
};

/** Back-compat: the 3/4 face mass, still the default reference plane. */
export const FACE = FACE_PLANES.threeQuarter.face;

export interface PortraitPose {
  /** Head construction this pose is built on. */
  plane: FacePlaneId;
  /**
   * Mirror the HEAD group (face plane, features, headwear) so the character
   * faces the other way. The body/hood/rims are authored in final coordinates
   * either way, so a mirrored pose is authored with its rim on the right.
   */
  mirrorHead?: boolean;
  /** Extra SVG transform on the head group — the head's angle in the pose. */
  headTransform?: string;
  /** Drawn behind the whole figure (halos, scroll edge, floating rune glow). */
  back?: PoseShape[];
  /** Outer cloth mass: crown down to the shoulders, drawn behind the face. */
  hood: string;
  /** Crescent band of the hood's front edge, drawn OVER the forehead. */
  crest: string;
  /** Cloth/hair falling on the lit side of the face. */
  drapeL: string;
  /** Cloth/hair on the shadowed side — carries each pose's flourish. */
  drapeR: string;
  /** Shoulders / chest mass, running off the bottom edge. */
  cloak: string;
  /** Collar band tucked under the chin. */
  collar: string;
  /** Drawn with the head, after the face: veil, goggles, hat brim. */
  headwear?: PoseShape[];
  /** Accessory prop, drawn in front of the body. */
  prop?: PoseShape[];
  /** Where the variant's letter sits on the prop. */
  glyph: { x: number; y: number; size: number; rotate?: number; fill?: PaintRole };
  /** Rim-light stroke tracing the lit edge of the head. */
  rimHead: string;
  /** Rim-light stroke continuing along the lit shoulder. */
  rimShoulder: string;
}

export const PORTRAIT_POSES: Record<PoseId, PortraitPose> = {
  /* ── Architect: 3/4 turn under a tall peaked cowl, hand raised with a
     letter tile catching the sun. The only pose that shows a palm. ── */
  peaked: {
    plane: 'threeQuarter',
    headTransform: 'rotate(-3 50 46)',
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
    collar:
      'M33.5 69.5 C39.5 77.5 60.5 77.5 66.5 69.5 L71.5 74 C63.5 84.5 36.5 84.5 28.5 74 Z',
    prop: [
      { t: 'c', cx: 80, cy: 50, r: 17, fill: 'glow', op: 0.16 },
      // Raised forearm rising out of the cloak.
      { t: 'p', d: 'M77 100 C73.6 88 72 78 73 70 L84.6 67.6 C86.6 78 88.6 88 90.6 100 Z', fill: 'cloth' },
      { t: 'p', d: 'M72.6 70.6 L84.4 68 L85.6 74 L74 76.4 Z', fill: 'collar' },
      // Palm and gripping fingers.
      {
        t: 'p',
        d: 'M74.4 66.6 C73.2 62.4 75 59.2 78.2 58.2 C81.8 57 85.2 58.6 86.2 61.6 ' +
          'C87 64.2 86 66.4 84.2 67.6 C81.2 69.6 76.6 69.6 74.4 66.6 Z',
        fill: 'skin',
      },
      { t: 'p', d: 'M76.4 60.6 C78.4 58.6 81.4 58 83.8 59', stroke: 'skinDeep', sw: 1, op: 0.55, cap: true },
      // The tile itself, tipped to catch the sun.
      {
        t: 'p',
        d: 'M69.8 45.6 C69.4 43.2 70.6 41.6 73 41.2 L85 39 C87.4 38.6 89 39.8 89.4 42.2 ' +
          'L91.4 53.6 C91.8 56 90.6 57.6 88.2 58 L76.2 60.2 C73.8 60.6 72.2 59.4 71.8 57 Z',
        fill: 'paper',
        stroke: 'dark',
        sw: 1.1,
      },
      {
        t: 'p',
        d: 'M72.4 45.6 C72.2 44.2 73 43.2 74.4 43 L84.6 41.2 C86 41 86.8 41.8 87 43.2 ' +
          'L87.4 46 C85.6 44.4 74.4 46.4 72.4 45.6 Z',
        fill: 'white',
        op: 0.35,
      },
    ],
    glyph: { x: 80.6, y: 53.4, size: 11.5, rotate: -10 },
    rimHead: 'M47.6 10.8 C39.8 15.2 32 22 27.2 29.6 C20.6 40 18.8 55.4 21 70',
    rimShoulder: 'M28 70.5 C16.5 74.6 7.6 84 4.6 97',
  },

  /* ── Scribe: full profile, bent forward over the desk. Nose and lips break
     the silhouette; a quill rises across the sunset and a scroll runs off
     the bottom edge. ── */
  scholar: {
    plane: 'profile',
    headTransform: 'translate(-3,1) rotate(7 46 48)',
    hood:
      'M20 78 C15 63 17 44 27 33.6 C33.6 26.6 40.6 23 47.6 23 ' +
      'C55.6 23.6 62.6 28.6 67.6 37.6 C74 49 75 64 71 78 C57 84 34 84 20 78 Z',
    crest:
      'M30.6 47 C29.4 33 37.6 23.6 48 22.6 C58.4 23.6 65.6 33 66.6 47 ' +
      'C64.4 35 57.4 29.4 48 29.4 C39 29.4 33.2 35.4 30.6 47 Z',
    drapeL: 'M30.6 45 C29.4 55.6 30.6 64 33.6 70 L25.6 74.6 C21 64.6 21 54 23 42.6 Z',
    drapeR: 'M66.6 44 C68.6 56 68 68 65 76 L74.6 79 C79 66.6 77.6 53 74.6 41 Z',
    cloak:
      'M0 100 C1 80 11 70 26 65.6 L41 62.6 L55 64.6 L68.6 70 ' +
      'C81 75.6 89 86 91.6 100 Z',
    collar: 'M29 67 C36 76 58 78.6 66 71 L70.6 76 C61.6 86.6 34 84.6 24 72 Z',
    prop: [
      // Sleeve + hand gripping the quill.
      { t: 'p', d: 'M66 100 C64.6 92 64 86 65.6 81 L76.6 83.6 C75 89 76 95 78.6 100 Z', fill: 'cloth' },
      {
        t: 'p',
        d: 'M59.6 84.6 C57.6 81.6 58.8 78.4 62 77.2 C65.4 75.8 69 77 70 80 ' +
          'C70.8 82.6 69.6 85 67.4 86 C64.4 87.2 61.4 86.6 59.6 84.6 Z',
        fill: 'skin',
      },
      { t: 'p', d: 'M63.4 82 L86 52', stroke: 'metal', sw: 1.7, cap: true },
      {
        t: 'p',
        d: 'M85.6 52.4 C80.6 56.6 76.6 62.6 74 69 C78.6 65.6 83.6 63 88.6 62 ' +
          'C90 58.6 88.6 54.6 85.6 52.4 Z',
        fill: 'paper',
        op: 0.92,
      },
      { t: 'p', d: 'M85.4 53.6 C82 57.6 79 62.6 77 67.6', stroke: 'paperDeep', sw: 0.8, op: 0.6, cap: true },
      { t: 'c', cx: 63.4, cy: 82, r: 1.3, fill: 'metalLit' },
      // Scroll running off the lower-left edge.
      { t: 'p', d: 'M10 88 C24 82 44 80.6 60 83.6 L58.6 95 C42.6 92 24 93.6 12 99 Z', fill: 'paper' },
      { t: 'p', d: 'M10.6 92 C24 87 43 86 58.8 88.6 L58.6 95 C42.6 92 24 93.6 12 99 Z', fill: 'paperDeep', op: 0.45 },
      {
        t: 'p',
        d: 'M10 88 C6.6 89 5 92.6 5.6 95.6 C6.2 98.6 8.6 100 11.6 99.4 C9 97 8.6 91.6 10 88 Z',
        fill: 'paperDeep',
      },
      { t: 'p', d: 'M20 88 C30 85.6 42 84.6 52 85.6', stroke: 'dark', sw: 0.7, op: 0.3, cap: true },
    ],
    glyph: { x: 34, y: 92.6, size: 9, rotate: -6, fill: 'dark' },
    rimHead: 'M48 23.4 C40.6 24 34 28 29 35 C22.6 43.6 20 58 21.6 71',
    rimShoulder: 'M26 66.6 C13.6 71 4 81 1.6 97',
  },
  /* ── Oracle: straight-on and still. A jewelled band and a sheer veil cross
     the face; a rune stone hangs lit at the left shoulder. ── */
  veiled: {
    plane: 'front',
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
    headwear: [
      // Sheer panel hanging from the band over the lower face.
      {
        t: 'p',
        d: 'M33.4 43 C40 47.6 60 47.6 66.6 43 C66.6 55 60.6 64.6 50 66.6 ' +
          'C39.4 64.6 33.4 55 33.4 43 Z',
        fill: 'cloth',
        op: 0.3,
      },
      { t: 'p', d: 'M35 48.6 C42.6 52 57.4 52 65 48.6', stroke: 'collarLit', sw: 0.7, op: 0.45, cap: true },
      // Jewelled brow band.
      {
        t: 'p',
        d: 'M31.6 40.6 C37.6 33.6 62.4 33.6 68.4 40.6 L67.4 45.4 C62 39.4 38 39.4 32.6 45.4 Z',
        fill: 'collar',
      },
      { t: 'p', d: 'M33.4 41.4 C39.4 36 60.6 36 66.6 41.4', stroke: 'collarLit', sw: 0.8, op: 0.6, cap: true },
      { t: 'c', cx: 50, cy: 37.6, r: 2.4, fill: 'metal' },
      { t: 'c', cx: 50, cy: 37.6, r: 4.2, fill: 'glow', op: 0.35 },
    ],
    prop: [
      { t: 'c', cx: 21, cy: 60, r: 14, fill: 'glow', op: 0.2 },
      { t: 'p', d: 'M21 47.4 L32.6 60 L21 72.6 L9.4 60 Z', fill: 'paper', stroke: 'metal', sw: 1.2 },
      { t: 'p', d: 'M21 51 L29 60 L21 69 L13 60 Z', stroke: 'metalDeep', sw: 0.7, op: 0.5 },
      { t: 'c', cx: 33.6, cy: 44.6, r: 1.4, fill: 'glow', op: 0.75 },
      { t: 'c', cx: 12.6, cy: 46.6, r: 1, fill: 'glow', op: 0.5 },
      { t: 'c', cx: 27, cy: 78, r: 1.2, fill: 'glow', op: 0.55 },
    ],
    glyph: { x: 21, y: 64.2, size: 11, fill: 'dark' },
    rimHead: 'M50.5 20.4 C43.8 21 37.4 24.8 31.4 32 C24.6 41.2 22 57 24.4 69.6',
    rimShoulder: 'M32 72 C21 76.4 12.4 85 9.6 97',
  },

  /* ── Warden: shoulder-on and turned away, storm collar up past the jaw,
     lantern swinging at the hip. Only a crescent of face is visible. ── */
  mantled: {
    plane: 'turnedAway',
    headTransform: 'translate(-1,-1) rotate(4 58 48)',
    hood:
      'M20 78 C14 62 16.6 44 27.6 33 C34 26.6 41.6 22.6 49 22 ' +
      'C58.6 23 67.6 29 73.6 39.6 C80.6 52 81 66 77 79 C60 85 34 85 20 78 Z',
    crest:
      'M28.6 46 C27.6 31.6 36.6 21.6 49 20.6 C61.4 21.6 69.6 31.6 68.6 46 ' +
      'C66.6 33.6 59.6 27.6 49 27.6 C38.4 27.6 30.6 33.6 28.6 46 Z',
    drapeL: 'M28.6 42 C26.6 55.6 28.6 66.6 33 73.6 L22.6 78 C17.4 65.6 17.4 52 20 38.6 Z',
    drapeR: 'M68.6 44 C69.6 52 68.6 60 66 65.6 L73 69.6 C77.6 60 78.6 50 77 39.6 Z',
    cloak:
      'M0 100 C1.5 81 12 70.5 27.5 66.5 L42.5 63.5 L57.5 63.5 L72.5 66.5 ' +
      'C88 70.5 98.5 81 100 100 Z',
    collar:
      'M25 80 C25.6 66.6 30.6 58.6 38.6 55 L46 62 C41 66 38.4 72 38 80.6 Z ' +
      'M75 80 C74.4 66 70 58.6 62.6 55.6 L56.6 62.6 C61.4 66.6 64 72 64.4 80.6 Z',
    prop: [
      { t: 'c', cx: 31.6, cy: 84, r: 17, fill: 'glow', op: 0.22 },
      {
        t: 'p',
        d: 'M27.6 70.6 C25.6 68 26.6 64.6 29.6 63.6 C32.8 62.4 35.8 63.6 36.8 66.2 ' +
          'C37.6 68.6 36.6 71 34.6 72 C31.6 73.2 29 72.6 27.6 70.6 Z',
        fill: 'collar',
      },
      { t: 'p', d: 'M31.6 71.6 L31.6 77', stroke: 'metal', sw: 1.4, cap: true },
      { t: 'p', d: 'M22.6 78.6 L40.6 78.6 L37.6 74 L25.6 74 Z', fill: 'metal' },
      { t: 'p', d: 'M24 79 L39.4 79 L38 92.6 L25.4 92.6 Z', fill: 'paper' },
      { t: 'c', cx: 31.6, cy: 85.6, r: 4.4, fill: 'glow', op: 0.8 },
      { t: 'p', d: 'M27.6 79 L27 92.6 M36 79 L36.6 92.6', stroke: 'metalDeep', sw: 1, op: 0.55 },
      { t: 'p', d: 'M22.6 92.6 L40.8 92.6 L42.4 97.6 L21 97.6 Z', fill: 'metalDeep' },
    ],
    glyph: { x: 31.6, y: 89.4, size: 9.5, fill: 'dark' },
    rimHead: 'M49 22.4 C41.6 23 34 27 28.4 34.6 C20.6 45 18.4 60 19.6 74',
    rimShoulder: 'M27 67.6 C13.5 71.6 3.4 81.6 1.4 97',
  },
  /* ── Tinkerer: bare-headed under a work cap, turned the OTHER way (the head
     group mirrors, so the lit edge runs down the right), goggles pushed up on
     the brow, spanner raised. ── */
  goggled: {
    plane: 'threeQuarter',
    mirrorHead: true,
    headTransform: 'rotate(-4 50 46)',
    hood:
      'M30 66 C27.6 50 30.6 34 40 27 C46 22.6 54.6 22 61.6 26 ' +
      'C69.6 30.6 73.6 40 73.6 51.6 C73.6 58.6 72 63.6 69.6 68 ' +
      'C57.6 72 42 72 30 66 Z',
    crest:
      'M30.6 44 C29.6 30.6 38.6 21.6 50.6 21 C62.6 21.6 71 30.6 70 44 ' +
      'C68 33.6 61 28 50.6 28 C40.2 28 32.6 33.6 30.6 44 Z',
    drapeL: 'M31.6 42 C30.6 50 31.6 57 34 61.6 L28.6 64.6 C25.6 57 25 49.6 26 41.6 Z',
    drapeR: 'M70 42 C71 50 70 57.6 67.6 62.6 L73 65.6 C76 58 76.6 49.6 75.6 41 Z',
    cloak:
      'M4 100 C6.6 84 15.6 74.6 29 70 L43 66.6 L57 67.6 L71 71.6 ' +
      'C84 76.6 92.6 85.6 95 100 Z',
    collar: 'M38 70 L50 78 L62 70.6 L66.6 74.6 L50 87.6 L33.6 74 Z',
    headwear: [
      { t: 'p', d: 'M31.6 36.6 C36.6 29.6 63.4 29.6 68.4 36.6 L67.4 41.6 C62 34.6 38 34.6 32.6 41.6 Z', fill: 'metalDeep' },
      { t: 'p', d: 'M45.6 35.6 L54.4 35.6', stroke: 'metalDeep', sw: 1.8, cap: true },
      { t: 'c', cx: 41, cy: 35.6, r: 5.2, fill: 'metal' },
      { t: 'c', cx: 41, cy: 35.6, r: 3.4, fill: 'glow', op: 0.55 },
      { t: 'c', cx: 39.4, cy: 34.2, r: 1.4, fill: 'white', op: 0.6 },
      { t: 'c', cx: 59, cy: 35.6, r: 5.2, fill: 'metal' },
      { t: 'c', cx: 59, cy: 35.6, r: 3.4, fill: 'glow', op: 0.55 },
      { t: 'c', cx: 57.4, cy: 34.2, r: 1.4, fill: 'white', op: 0.6 },
    ],
    prop: [
      { t: 'p', d: 'M8 100 C9.6 90 12.6 82.6 17.6 77.6 L27.6 84 C23 88.6 20.6 94 19.6 100 Z', fill: 'cloth' },
      { t: 'p', d: 'M16 78.6 L27.6 85.6 L24.6 90 L13.4 83 Z', fill: 'collar' },
      {
        t: 'p',
        d: 'M18.6 74 C21.6 71.6 25.6 72 27.6 74.6 C29.6 77.4 29 81 26.2 82.6 ' +
          'C23.4 84.4 20 83.6 18.4 81 C17 78.8 17 75.6 18.6 74 Z',
        fill: 'skin',
      },
      { t: 'p', d: 'M23.6 76.6 L30.6 58', stroke: 'metal', sw: 3, cap: true },
      { t: 'p', d: 'M25 75.4 L30.6 61', stroke: 'metalLit', sw: 1, op: 0.6, cap: true },
      {
        t: 'p',
        d: 'M30.6 58 C27.4 56.6 26 53 27.4 49.8 C28.8 46.6 32.2 45.2 35.2 46.2 ' +
          'L33.6 50.4 C32 50 30.4 50.8 29.8 52.2 C29.2 53.6 29.8 55.2 31.4 56 Z',
        fill: 'metal',
      },
      { t: 'p', d: 'M27.4 62.6 L33.4 66 L33.4 72.8 L27.4 76.2 L21.4 72.8 L21.4 66 Z', fill: 'paper', stroke: 'metalDeep', sw: 1 },
    ],
    glyph: { x: 27.4, y: 72.6, size: 8.6, fill: 'dark' },
    rimHead: 'M50.6 21.4 C58.6 22 65.6 26.6 70 33.6 C75.6 42.6 76.6 56 74.6 68',
    rimShoulder: 'M72 70.6 C84 75 92.6 84.6 95.4 97',
  },

  /* ── Cartographer: head tipped down over a folded map, under a brim wider
     than the shoulders. Reads as a hat first, a person second. ── */
  brimmed: {
    plane: 'downcast',
    headTransform: 'rotate(6 50 48)',
    hood:
      'M33 52 C31 40 34.6 30 42.6 26 C48.6 23 56.6 23.6 62 27.6 ' +
      'C68.6 32.6 70.6 42.6 68.6 53.6 C60 58.6 41.6 58.6 33 52 Z',
    crest:
      'M33 46 C32.4 34 40 26 50.6 25.4 C61.2 26 68.6 34 68 46 ' +
      'C66 35.6 59.6 30.4 50.6 30.4 C41.6 30.4 35 35.6 33 46 Z',
    drapeL: 'M36.6 45.6 C35.6 51 36.4 55.6 38 58.6 L33.6 59.6 C31.6 55 31.2 50 32.2 44.6 Z',
    drapeR: 'M64.4 45.6 C65.4 51 64.6 56 63 58.6 L67.4 59.6 C69.4 55 69.8 50 68.8 44.6 Z',
    cloak:
      'M2 100 C4.6 83.6 14 74 28 69.6 L42.6 66.6 L57.4 66.6 L72 69.6 ' +
      'C86 74 95.4 83.6 98 100 Z',
    collar: 'M32.6 69 C39 77.6 61 77.6 67.4 69 L72 73.6 C63.6 84.6 36.4 84.6 28 73.6 Z',
    headwear: [
      { t: 'p', d: 'M34 34 C33 24.6 40.6 18 50.6 17.6 C60.6 18 68 24.6 67 34 C60 30.6 40 30.6 34 34 Z', fill: 'cloth' },
      { t: 'p', d: 'M34.4 33 C40.6 30 60.6 30 66.6 33 L66 37 C60 34 40.6 34 35 37 Z', fill: 'collar' },
      { t: 'p', d: 'M10 40 C14 32 30 27.6 50 27.6 C70 27.6 86 32 90 40 C86 36 70 33 50 33 C30 33 14 36 10 40 Z', fill: 'cloth' },
      { t: 'p', d: 'M11 39.6 C15 32.6 30.6 28.6 50 28.6 C69.4 28.6 85 32.6 89 39.6', stroke: 'clothLit', sw: 0.9, op: 0.5, cap: true },
      { t: 'p', d: 'M14 37.6 C20 33.6 34 31 50 31 C66 31 80 33.6 86 37.6', stroke: 'clothDeep', sw: 1, op: 0.35, cap: true },
    ],
    prop: [
      { t: 'p', d: 'M16 97 L16 80 L33.6 76.4 L50 80.6 L66.4 76.4 L84 80 L84 97 L66.4 93.4 L50 97.6 L33.6 93.4 Z', fill: 'paper' },
      { t: 'p', d: 'M16 80 L33.6 76.4 L33.6 93.4 L16 97 Z', fill: 'paperDeep', op: 0.28 },
      { t: 'p', d: 'M66.4 76.4 L84 80 L84 97 L66.4 93.4 Z', fill: 'paperDeep', op: 0.28 },
      { t: 'p', d: 'M33.6 76.4 L33.6 93.4 M66.4 76.4 L66.4 93.4', stroke: 'paperDeep', sw: 1, op: 0.55 },
      { t: 'p', d: 'M22 88 C28 84 34 88.6 40 85.6 C46 82.6 52 86.6 58 84', stroke: 'dark', sw: 0.8, op: 0.35, cap: true },
      { t: 'c', cx: 60, cy: 87.6, r: 1.5, fill: 'accent' },
      {
        t: 'p',
        d: 'M18.6 84 C16.6 81.6 17.6 78.4 20.6 77.4 C23.8 76.2 26.8 77.4 27.8 80 ' +
          'C28.6 82.4 27.6 84.8 25.6 85.8 C22.6 87 20 86 18.6 84 Z',
        fill: 'skin',
      },
    ],
    glyph: { x: 50, y: 91.4, size: 10, fill: 'dark' },
    rimHead: 'M50 28.4 C30.6 28.6 15 32.6 11 39.6',
    rimShoulder: 'M28.6 70 C15.6 74.6 6 84 3.4 97',
  },
};
