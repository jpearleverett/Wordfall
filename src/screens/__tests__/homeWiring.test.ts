/**
 * HomeScreen wiring guards.
 *
 * HomeScreen.tsx is a .tsx file and this project's jest transform leaves JSX
 * unprocessed, so the screen cannot be imported here — these are source scans
 * over the two couplings that were silently broken:
 *
 *  1. the login-calendar grid rendered a hardcoded 30-day table
 *     (ECONOMY.loginRewards) while App.tsx granted from the variant-aware
 *     table, so the '7day' A/B arm showed one reward and paid another;
 *  2. the streak-shield upsell keyed on `streakShieldActive` /
 *     `streakGraceDaysUsed` props that the single App.tsx call site never
 *     passed, so the "grace already spent" trigger was dead and shield owners
 *     were upsold anyway.
 */
import * as fs from 'fs';
import * as path from 'path';

const HOME = fs.readFileSync(
  path.join(__dirname, '..', 'HomeScreen.tsx'),
  'utf8',
);
const APP = fs.readFileSync(
  path.join(__dirname, '..', '..', '..', 'App.tsx'),
  'utf8',
);

describe('login calendar grid', () => {
  it('renders the same table the claim path grants from', () => {
    expect(HOME).toContain("from '../data/loginCalendar'");
    expect(HOME).toMatch(/const calendarTable = getActiveLoginCalendar\(\)/);
    expect(HOME).toMatch(/const cycleLength = calendarTable\.length/);
    // The grid iterates the active table rather than a fixed 30 cells.
    expect(HOME).toMatch(/calendarTable\.map\(/);
    expect(HOME).not.toContain('ECONOMY.loginRewards');
  });

  it('highlights the day the claim path wraps to, not a clamp to 30', () => {
    // getLoginCalendarDay wraps ((day - 1) % length) + 1; clamping to 30
    // disagrees with it for any cycle shorter than 30.
    expect(HOME).toMatch(/% cycleLength\) \+ 1/);
    expect(HOME).not.toMatch(/Math\.min\(Math\.max\(loginCycleDay, 1\), 30\)/);
  });
});

describe('streak shield upsell', () => {
  it('derives shield ownership and grace state instead of taking dead props', () => {
    expect(HOME).not.toMatch(/streakShieldActive\??:/);
    expect(HOME).not.toMatch(/streakGraceDaysUsed\??:/);
    expect(HOME).toMatch(/streakShieldAvailable: playerStreaks\.streakShieldAvailable/);
    expect(HOME).toMatch(/export function homeStreakShieldRisk/);
  });

  it('is not fed those props by the App.tsx call site either', () => {
    expect(APP).not.toContain('streakShieldActive=');
    expect(APP).not.toContain('streakGraceDaysUsed=');
  });
});
