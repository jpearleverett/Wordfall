import { createMotionPreferenceStore } from '../motionPreference';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('defaults to a settled reduced-motion snapshot until the OS resolves', () => {
  const query = deferred<boolean>();
  const store = createMotionPreferenceStore({
    isReduceMotionEnabled: () => query.promise,
    addReduceMotionListener: () => () => {},
  });
  expect(store.getSnapshot()).toEqual({ reduceMotion: true, resolved: false });
});

test('initializes once, publishes the OS result, and removes one listener', async () => {
  const query = deferred<boolean>();
  const remove = jest.fn();
  const add = jest.fn(() => remove);
  const store = createMotionPreferenceStore({
    isReduceMotionEnabled: () => query.promise,
    addReduceMotionListener: add,
  });
  const first = jest.fn();
  const second = jest.fn();
  const offFirst = store.subscribe(first);
  const offSecond = store.subscribe(second);
  expect(add).toHaveBeenCalledTimes(1);
  query.resolve(false);
  await query.promise;
  await Promise.resolve();
  expect(store.getSnapshot()).toEqual({ reduceMotion: false, resolved: true });
  offFirst();
  expect(remove).not.toHaveBeenCalled();
  offSecond();
  expect(remove).toHaveBeenCalledTimes(1);
});

test('fails motion-safe and ignores late query results after disposal', async () => {
  const query = deferred<boolean>();
  const store = createMotionPreferenceStore({
    isReduceMotionEnabled: () => query.promise,
    addReduceMotionListener: () => () => {},
  });
  const off = store.subscribe(jest.fn());
  off();
  query.resolve(false);
  await query.promise;
  await Promise.resolve();
  expect(store.getSnapshot()).toEqual({ reduceMotion: true, resolved: false });
});
