/**
 * Base dressing for the achievement medallions — the fix for "all twelve
 * medallions reuse one template: same ribbon banner, same three star pips".
 *
 * SIX bases, one per silhouette family (`SHAPE_DRESSING` in the catalog):
 * straight banner · swallowtail ribbon · laurel sprigs · engraved nameplate ·
 * draped sash · parchment scroll. Two of them carry no cloth at all, so the
 * wall no longer reads as one ribbon asset recolored six ways.
 *
 * The pip row is a TIER READOUT (`TIER_PIPS`): bronze = one faceted boss,
 * silver = two stars, gold = two stars flanking a set gem. Pips are authored
 * at y 86.2 and re-placed per base via one transform, so a base only has to
 * name where its row sits and how big it can be.
 *
 * Everything draws in the badge's 100×100 viewBox, below the medallion
 * (which bottoms out near y 82).
 */
import React, { useMemo } from 'react';
import { Circle, G, Path, Rect } from 'react-native-svg';
import { DuoGrad, gradId, shade, HILITE } from '../icons/IconBase';
import { MetalGrad, leafPath, star5 } from './frameArtParts';
import { BadgeMetal, METALS, RibbonBanner } from './achievementBadgeParts';
import type { AchievementTierLevel, BadgeDressing } from './achievementBadgeCatalog';

const PIP_Y = 86.2;

interface DressProps {
  metal: BadgeMetal;
  /** Cloth / parchment tone (family accent, ghosted when locked). */
  cloth: string;
  /** Tier reached, or null when the badge is locked (no pips). */
  tier: AchievementTierLevel | null;
}

/** Faceted ice gem — the GOLD tier's centre mark. */
function PipGem() {
  return (
    <>
      <Path d="M50 80.4 L56 84.8 L50 91.8 L44 84.8 Z" fill="#8fe6ff" stroke="#0e5f78" strokeWidth={1.2} strokeLinejoin="round" />
      <Path d="M50 80.4 L56 84.8 L50 86.2 Z" fill="#e4f9ff" opacity={0.95} />
      <Path d="M44 84.8 L50 86.2 L50 91.8 Z" fill="#4fc4ea" opacity={0.85} />
      <Path d="M46.4 84.4 L49 82.2" stroke="#ffffff" strokeWidth={1.1} strokeLinecap="round" opacity={0.9} />
    </>
  );
}

function Pip({ x, metal }: { x: number; metal: BadgeMetal }) {
  const m = METALS[metal];
  return (
    <Path d={star5(x, PIP_Y, 4.8, 2)} fill={m.light} stroke={m.rimC} strokeWidth={0.9} strokeLinejoin="round" />
  );
}

/**
 * Tier readout: 1 boss / 2 stars / 2 stars + gem. `cy` and `scale` re-place
 * the row for the base that hosts it.
 */
export function TierPips({
  metal,
  tier,
  cy = PIP_Y,
  scale = 1,
}: {
  metal: BadgeMetal;
  tier: AchievementTierLevel | null;
  cy?: number;
  scale?: number;
}) {
  if (!tier) return null;
  const m = METALS[metal];
  const body =
    tier === 'bronze' ? (
      <>
        <Circle cx={50} cy={PIP_Y} r={5} fill={m.stud} stroke={m.rimC} strokeWidth={1.2} />
        <Circle cx={50} cy={PIP_Y} r={2.7} fill={m.light} opacity={0.92} />
        <Circle cx={48.4} cy={PIP_Y - 1.6} r={1.1} fill={HILITE} />
      </>
    ) : tier === 'silver' ? (
      <>
        <Pip x={43} metal={metal} />
        <Pip x={57} metal={metal} />
      </>
    ) : (
      <>
        <Pip x={36} metal={metal} />
        <Pip x={64} metal={metal} />
        <PipGem />
      </>
    );
  const t = `translate(50 ${cy}) scale(${scale}) translate(-50 ${-PIP_Y})`;
  return <G transform={t}>{body}</G>;
}

/** Straight dovetailed cloth banner — the classic medallion base. */
function BannerDress({ metal, cloth, tier }: DressProps) {
  return (
    <>
      <RibbonBanner metal={metal} cloth={cloth} />
      <TierPips metal={metal} tier={tier} />
    </>
  );
}

/** Swallowtail ribbon: flared trapezoid front, deep V-cut tails. */
function SwallowtailDress({ metal, cloth, tier }: DressProps) {
  const id = useMemo(() => gradId('abSwal'), []);
  const m = METALS[metal];
  const edge = shade(cloth, -64);
  const tail = 'M26 79 L6 84.4 L14.2 89.8 L6 96.4 L26 92.2 Z';
  return (
    <>
      <DuoGrad id={id} from={shade(cloth, 30)} to={shade(cloth, -28)} />
      <Path d={tail} fill={shade(cloth, -40)} stroke={edge} strokeWidth={1.2} strokeLinejoin="round" />
      <G transform="translate(100 0) scale(-1 1)">
        <Path d={tail} fill={shade(cloth, -52)} stroke={edge} strokeWidth={1.2} strokeLinejoin="round" />
      </G>
      <Path
        d="M24.5 77.4 H75.5 L78.4 94.4 Q50 99.2 21.6 94.4 Z"
        fill={`url(#${id})`}
        stroke={edge}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <Path d="M27 80 H73" stroke={m.light} strokeWidth={1} opacity={0.7} />
      <Path d="M24.4 93.4 Q50 97.6 75.6 93.4" stroke={m.light} strokeWidth={1} opacity={0.5} fill="none" />
      <TierPips metal={metal} tier={tier} cy={87} scale={0.94} />
    </>
  );
}

/** Crossed laurel sprigs — no cloth at all, the pips sit in the cradle. */
function SprigDress({ metal, cloth, tier }: DressProps) {
  const m = METALS[metal];
  const leaf = leafPath(7.4, 2.7);
  const leaves: Array<[number, number, number]> = [
    [44.6, 95.4, 32],
    [39.4, 91.4, 20],
    [34.6, 86.6, 6],
    [31.4, 81.2, -10],
  ];
  const branch = (
    <>
      <Path d="M50 97.6 C42 95.6 34 90.6 30 79.4" fill="none" stroke={m.stud} strokeWidth={1.9} strokeLinecap="round" />
      {leaves.map(([x, y, deg], i) => (
        <G key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${deg - 118})`}>
          <Path d={leaf} fill={i % 2 === 0 ? m.light : m.stud} stroke={m.rimC} strokeWidth={0.85} strokeLinejoin="round" />
        </G>
      ))}
    </>
  );
  return (
    <>
      {branch}
      <G transform="translate(100 0) scale(-1 1)">{branch}</G>
      {/* tie knot where the stems cross */}
      <Path d="M45.6 96.4 Q50 93.6 54.4 96.4 Q50 99.4 45.6 96.4 Z" fill={shade(cloth, -18)} stroke={shade(cloth, -66)} strokeWidth={1} strokeLinejoin="round" />
      <TierPips metal={metal} tier={tier} cy={87.4} scale={0.9} />
    </>
  );
}

/** Engraved metal nameplate with corner screws — the plaque base. */
function NameplateDress({ metal, cloth, tier }: DressProps) {
  const id = useMemo(() => gradId('abPlateBase'), []);
  const m = METALS[metal];
  return (
    <>
      <MetalGrad id={id} stops={m.stops} />
      <Rect x={17.5} y={77.6} width={65} height={18.6} rx={3.4} fill={`url(#${id})`} stroke={m.rimC} strokeWidth={1.7} />
      <Rect x={20.8} y={80.6} width={58.4} height={12.6} rx={2.2} fill={shade(cloth, -74)} opacity={0.62} />
      <Rect x={20.8} y={80.6} width={58.4} height={12.6} rx={2.2} fill="none" stroke={m.rimC} strokeWidth={0.9} opacity={0.85} />
      <Rect x={20.8} y={80.6} width={58.4} height={3.4} rx={1.7} fill={m.light} opacity={0.22} />
      {[23.4, 76.6].map((x) => (
        <React.Fragment key={x}>
          <Circle cx={x} cy={86.9} r={2} fill={m.stud} stroke={m.rimC} strokeWidth={0.8} />
          <Path d={`M${x - 1.1} ${86.9} H${x + 1.1}`} stroke={m.rimC} strokeWidth={0.8} strokeLinecap="round" />
        </React.Fragment>
      ))}
      <TierPips metal={metal} tier={tier} cy={86.9} scale={0.86} />
    </>
  );
}

/** Diagonal draped sash sweeping across the base. */
function SashDress({ metal, cloth, tier }: DressProps) {
  const id = useMemo(() => gradId('abSash'), []);
  const m = METALS[metal];
  const edge = shade(cloth, -66);
  return (
    <>
      <DuoGrad id={id} from={shade(cloth, 24)} to={shade(cloth, -36)} />
      <Path
        d="M4 70 C26 90 68 92 96 74 L96 86 C68 104 26 102 4 82 Z"
        fill={`url(#${id})`}
        stroke={edge}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      {/* fold catching the light along the sash's upper edge */}
      <Path d="M7 75.6 C27 93 66 95 93 78.4" fill="none" stroke={m.light} strokeWidth={1} opacity={0.5} />
      {/* tucked corner at the low end */}
      <Path d="M4 82 L14 86 L10 95 L4 92 Z" fill={shade(cloth, -52)} stroke={edge} strokeWidth={1.1} strokeLinejoin="round" />
      <TierPips metal={metal} tier={tier} cy={92.2} scale={0.82} />
    </>
  );
}

/** Curled parchment scroll with rolled ends. */
function ScrollDress({ metal, cloth, tier }: DressProps) {
  const id = useMemo(() => gradId('abScroll'), []);
  const m = METALS[metal];
  const parch = shade(cloth, 46);
  const edge = shade(cloth, -60);
  const roll = (x: number) => (
    <>
      <Rect x={x} y={76.4} width={11} height={20.4} rx={5.5} fill={shade(parch, -26)} stroke={edge} strokeWidth={1.2} />
      <Circle cx={x + 5.5} cy={86.6} r={2.9} fill="none" stroke={edge} strokeWidth={1} opacity={0.8} />
      <Path d={`M${x + 2.4} 80.4 Q${x + 5.5} 78.8 ${x + 8.6} 80.4`} fill="none" stroke={HILITE} strokeWidth={1} opacity={0.55} />
    </>
  );
  return (
    <>
      <DuoGrad id={id} from={shade(parch, 22)} to={shade(parch, -34)} />
      <Path
        d="M16 78.6 Q50 76 84 78.6 L84 94.4 Q50 97.2 16 94.4 Z"
        fill={`url(#${id})`}
        stroke={edge}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      <Path d="M18.5 81.2 Q50 78.8 81.5 81.2" fill="none" stroke={m.light} strokeWidth={0.9} opacity={0.45} />
      {roll(8.2)}
      {roll(80.8)}
      <TierPips metal={metal} tier={tier} cy={86.8} scale={0.86} />
    </>
  );
}

const DRESSES: Record<BadgeDressing, React.ComponentType<DressProps>> = {
  banner: BannerDress,
  swallowtail: SwallowtailDress,
  sprig: SprigDress,
  nameplate: NameplateDress,
  sash: SashDress,
  scroll: ScrollDress,
};

/** Render the base a silhouette wears, with its tier readout. */
export function BadgeDressingArt({
  dressing,
  ...rest
}: DressProps & { dressing: BadgeDressing }) {
  const Dress = DRESSES[dressing];
  return <Dress {...rest} />;
}
