/**
 * getEventForWeek must emit UTC-derived date strings whatever the device
 * timezone. The old implementation advanced weeks with LOCAL setDate on a
 * UTC-midnight reference and re-serialized with toISOString(), so any zone
 * whose DST-summer offset exceeds its Jan 5 offset (US / EU / UK) emitted
 * startDate/endDate one UTC day early — the weekly event vanished from
 * getActiveEvents() a full day before the rotation (pure UTC epoch math in
 * getCurrentEvent) advanced, stranding reached-but-unclaimed tiers.
 *
 * Jest cannot reproduce the drift directly: its process.env is a plain
 * copy, so assigning TZ at runtime never reaches the native setter and the
 * worker stays in UTC — where local and UTC arithmetic agree. The guard is
 * therefore two-part: exact UTC output for every week of the rotation, plus
 * a spy proving the path never touches the LOCAL calendar (getDate/setDate),
 * which is precisely what made the old code timezone-dependent.
 */

import { getEventForWeek } from '../events';

const DAY_MS = 24 * 60 * 60 * 1000;
const REFERENCE_UTC = Date.UTC(2026, 0, 5); // First Monday of 2026

describe('getEventForWeek emits UTC dates', () => {
  it('start/end land on UTC Monday..Sunday for two years of weeks', () => {
    for (let w = 0; w < 105; w++) {
      const event = getEventForWeek(w);
      const expectedStart = new Date(REFERENCE_UTC + w * 7 * DAY_MS)
        .toISOString()
        .slice(0, 10);
      const expectedEnd = new Date(REFERENCE_UTC + (w * 7 + 6) * DAY_MS)
        .toISOString()
        .slice(0, 10);

      expect(event.startDate).toBe(expectedStart);
      expect(event.endDate).toBe(expectedEnd);
      // Monday start, Sunday end — the rotation's UTC week.
      expect(new Date(event.startDate + 'T00:00:00Z').getUTCDay()).toBe(1);
      expect(new Date(event.endDate + 'T00:00:00Z').getUTCDay()).toBe(0);
    }
  });

  it('a DST-summer week (w28) yields the canonical UTC dates', () => {
    const event = getEventForWeek(28);
    expect(event.startDate).toBe('2026-07-20');
    expect(event.endDate).toBe('2026-07-26');
  });

  it('never consults the LOCAL calendar (the source of the DST drift)', () => {
    const getDateSpy = jest.spyOn(Date.prototype, 'getDate');
    const setDateSpy = jest.spyOn(Date.prototype, 'setDate');
    try {
      getEventForWeek(0);
      getEventForWeek(12);
      getEventForWeek(28);
      expect(getDateSpy).not.toHaveBeenCalled();
      expect(setDateSpy).not.toHaveBeenCalled();
    } finally {
      getDateSpy.mockRestore();
      setDateSpy.mockRestore();
    }
  });
});
