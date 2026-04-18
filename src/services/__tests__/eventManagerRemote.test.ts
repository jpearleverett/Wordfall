/**
 * Tests for the Remote-Config override parser in eventManager.
 * Confirms that malformed / empty / wrongly-shaped JSON never crashes
 * and that valid entries are preserved through the filter.
 */

const mockGetRemoteString = jest.fn();

jest.mock('../remoteConfig', () => ({
  getRemoteString: (...args: unknown[]) => mockGetRemoteString(...args),
  getRemoteBoolean: jest.fn(() => false),
  getRemoteNumber: jest.fn(() => 0),
}));

import { parseRemoteEvents } from '../eventManager';

describe('parseRemoteEvents', () => {
  beforeEach(() => {
    mockGetRemoteString.mockReset();
  });

  it('returns [] on empty override', () => {
    mockGetRemoteString.mockReturnValue('');
    expect(parseRemoteEvents()).toEqual([]);
  });

  it('returns [] on malformed JSON', () => {
    mockGetRemoteString.mockReturnValue('not json');
    expect(parseRemoteEvents()).toEqual([]);
  });

  it('returns [] when shape is wrong (root not object)', () => {
    mockGetRemoteString.mockReturnValue(JSON.stringify([1, 2, 3]));
    expect(parseRemoteEvents()).toEqual([]);
  });

  it('returns [] when events is not an array', () => {
    mockGetRemoteString.mockReturnValue(JSON.stringify({ events: 'oops' }));
    expect(parseRemoteEvents()).toEqual([]);
  });

  it('filters out entries missing required fields', () => {
    mockGetRemoteString.mockReturnValue(
      JSON.stringify({
        events: [
          { id: 'rc_ok', type: 'main', name: 'n', description: 'd', icon: 'i', endTime: 123 },
          { id: 'rc_bad_type', type: 'super', name: 'n', description: 'd', icon: 'i', endTime: 123 },
          { type: 'main', name: 'missing id', description: 'd', icon: 'i', endTime: 123 },
          { id: 'rc_missing_end', type: 'mini', name: 'n', description: 'd', icon: 'i' },
          null,
        ],
      }),
    );
    const out = parseRemoteEvents();
    expect(out.map((e) => e.id)).toEqual(['rc_ok']);
  });

  it('preserves valid main + mini entries', () => {
    mockGetRemoteString.mockReturnValue(
      JSON.stringify({
        events: [
          { id: 'rc_main_1', type: 'main', name: 'Spring', description: 'd', icon: '🌸', endTime: 1, multipliers: { coins: 2 } },
          { id: 'rc_mini_1', type: 'mini', name: 'Hints', description: 'd', icon: '💡', endTime: 2 },
        ],
      }),
    );
    const out = parseRemoteEvents();
    expect(out).toHaveLength(2);
    expect(out[0].type).toBe('main');
    expect(out[1].type).toBe('mini');
    expect(out[0].multipliers?.coins).toBe(2);
  });
});
