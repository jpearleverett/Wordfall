import { emitBoardGenNotice, subscribeBoardGenNotice } from '../boardGenNotice';

describe('boardGenNotice', () => {
  it('fires subscribed listeners on emit', () => {
    const listener = jest.fn();
    const unsub = subscribeBoardGenNotice(listener);
    emitBoardGenNotice();
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
  });

  it('does not fire after unsubscribe', () => {
    const listener = jest.fn();
    const unsub = subscribeBoardGenNotice(listener);
    unsub();
    emitBoardGenNotice();
    expect(listener).not.toHaveBeenCalled();
  });

  it('isolates listener throws so one bad subscriber does not block others', () => {
    const bad = jest.fn(() => {
      throw new Error('boom');
    });
    const good = jest.fn();
    const unsubA = subscribeBoardGenNotice(bad);
    const unsubB = subscribeBoardGenNotice(good);
    expect(() => emitBoardGenNotice()).not.toThrow();
    expect(bad).toHaveBeenCalled();
    expect(good).toHaveBeenCalled();
    unsubA();
    unsubB();
  });
});
