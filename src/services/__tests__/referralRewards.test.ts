/**
 * Unit tests for the referral rewards client wrapper. Mocks firebase/functions
 * so we can assert the callable is invoked with the right payload and errors
 * surface via the crash reporter.
 */

const callMock = jest.fn();

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => callMock),
}));

jest.mock('../../config/firebase', () => ({
  default: {},
}));

const captureExceptionMock = jest.fn();
const addBreadcrumbMock = jest.fn();

jest.mock('../crashReporting', () => ({
  crashReporter: {
    captureException: (...args: unknown[]) => captureExceptionMock(...args),
    addBreadcrumb: (...args: unknown[]) => addBreadcrumbMock(...args),
  },
}));

import { recordReferralSuccessSecure } from '../referralRewards';

describe('referralRewards client wrapper', () => {
  beforeEach(() => {
    callMock.mockReset();
    captureExceptionMock.mockReset();
    addBreadcrumbMock.mockReset();
  });

  it('passes the code through and returns the typed grant result', async () => {
    callMock.mockResolvedValueOnce({
      data: {
        success: true,
        alreadyGranted: false,
        referrerUid: 'UID_REF',
        grantedGemsReferrer: 25,
        grantedGemsReferred: 10,
      },
    });

    const res = await recordReferralSuccessSecure('ABC123');

    expect(callMock).toHaveBeenCalledWith({ referralCode: 'ABC123' });
    expect(res).toEqual({
      success: true,
      alreadyGranted: false,
      referrerUid: 'UID_REF',
      grantedGemsReferrer: 25,
      grantedGemsReferred: 10,
    });
  });

  it('surfaces an alreadyGranted result without throwing', async () => {
    callMock.mockResolvedValueOnce({
      data: {
        success: true,
        alreadyGranted: true,
        referrerUid: 'UID_REF',
        grantedGemsReferrer: 0,
        grantedGemsReferred: 0,
      },
    });

    const res = await recordReferralSuccessSecure('ABC123');

    expect(res.alreadyGranted).toBe(true);
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it('captures and rethrows permission-denied (self-referral) errors', async () => {
    const err = new Error('permission-denied');
    callMock.mockRejectedValueOnce(err);

    await expect(recordReferralSuccessSecure('SELFCODE')).rejects.toThrow(
      'permission-denied',
    );
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    expect(captureExceptionMock.mock.calls[0][0]).toBe(err);
    expect(addBreadcrumbMock).toHaveBeenCalled();
  });

  it('captures and rethrows not-found (unknown code) errors', async () => {
    const err = new Error('not-found');
    callMock.mockRejectedValueOnce(err);

    await expect(recordReferralSuccessSecure('BADCODE')).rejects.toThrow(
      'not-found',
    );
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
  });

  it('captures and rethrows resource-exhausted (rate limit) errors', async () => {
    const err = new Error('resource-exhausted');
    callMock.mockRejectedValueOnce(err);

    await expect(recordReferralSuccessSecure('ABC123')).rejects.toThrow(
      'resource-exhausted',
    );
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
  });
});
