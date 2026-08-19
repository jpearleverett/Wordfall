/**
 * Promoted re-export: SectionHeader began life as a HomeScreen-only band
 * label, but it is the shared section treatment for every hub screen. The
 * canonical implementation stays in components/home; screens should import
 * from here (components/common) going forward.
 */
export { default } from '../home/SectionHeader';
