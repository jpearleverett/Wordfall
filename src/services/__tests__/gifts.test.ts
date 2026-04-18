/**
 * Unit tests for the gifting client wrapper. Mocks firebase/functions so
 * we can assert the callable is invoked with the right payload (including
 * auto-generated idempotency key) and that errors are captured to the
 * crash reporter and rethrown so the caller can display a toast.
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

import { sendGiftSecure, claimGiftSecure } from '../gifts';

describe('gifts client wrapper', () => {
  beforeEach(() => {
    callMock.mockReset();
    captureExceptionMock.mockReset();
    addBreadcrumbMock.mockReset();
  });

  it('sendGiftSecure auto-generates an idempotency key when omitted', async () => {
    callMock.mockResolvedValueOnce({
      data: { success: true, giftId: 'G1', alreadySent: false, claimed: false },
    });

    const res = await sendGiftSecure({ toUserId: 'uidB', type: 'life' });

    expect(callMock).toHaveBeenCalledTimes(1);
    const payload = callMock.mock.calls[0][0];
    expect(payload).toMatchObject({
      toUserId: 'uidB',
      type: 'life',
      amount: 1,
    });
    expect(typeof payload.idempotencyKey).toBe('string');
    expect(payload.idempotencyKey.length).toBeGreaterThanOrEqual(8);
    expect(res).toEqual({ success: true, giftId: 'G1', alreadySent: false, claimed: false });
  });

  it('sendGiftSecure preserves a caller-supplied idempotency key', async () => {
    callMock.mockResolvedValueOnce({
      data: { success: true, giftId: 'key-abcdefgh', alreadySent: true, claimed: false },
    });

    await sendGiftSecure({
      toUserId: 'uidB',
      type: 'hint',
      amount: 2,
      idempotencyKey: 'key-abcdefgh',
    });

    expect(callMock.mock.calls[0][0].idempotencyKey).toBe('key-abcdefgh');
    expect(callMock.mock.calls[0][0].amount).toBe(2);
  });

  it('sendGiftSecure captures errors and rethrows', async () => {
    const err = new Error('resource-exhausted');
    callMock.mockRejectedValueOnce(err);

    await expect(
      sendGiftSecure({ toUserId: 'uidB', type: 'life' }),
    ).rejects.toThrow('resource-exhausted');

    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    expect(captureExceptionMock.mock.calls[0][0]).toBe(err);
    expect(addBreadcrumbMock).toHaveBeenCalled();
  });

  it('claimGiftSecure passes giftId through and returns typed result', async () => {
    callMock.mockResolvedValueOnce({
      data: { success: true, type: 'life', amount: 1, alreadyClaimed: false },
    });

    const res = await claimGiftSecure('G1');

    expect(callMock).toHaveBeenCalledWith({ giftId: 'G1' });
    expect(res).toEqual({
      success: true,
      type: 'life',
      amount: 1,
      alreadyClaimed: false,
    });
  });

  it('claimGiftSecure surfaces not-found errors to the caller', async () => {
    const err = new Error('not-found');
    callMock.mockRejectedValueOnce(err);

    await expect(claimGiftSecure('missing')).rejects.toThrow('not-found');
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
  });
});
