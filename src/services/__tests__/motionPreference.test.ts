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

test('ignores late query results after disposal', async () => {
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

test('keeps a native event that arrives before the initial query settles', async () => {
  const query = deferred<boolean>();
  let onChange!: (enabled: boolean) => void;
  const store = createMotionPreferenceStore({
    isReduceMotionEnabled: () => query.promise,
    addReduceMotionListener: (listener) => {
      onChange = listener;
      return () => {};
    },
  });
  const off = store.subscribe(jest.fn());

  onChange(false);
  query.resolve(true);
  await query.promise;
  await Promise.resolve();

  expect(store.getSnapshot()).toEqual({ reduceMotion: false, resolved: true });
  off();
});

test('settles motion-safe when the initial query rejects', async () => {
  const query = deferred<boolean>();
  const store = createMotionPreferenceStore({
    isReduceMotionEnabled: () => query.promise,
    addReduceMotionListener: () => () => {},
  });
  const off = store.subscribe(jest.fn());

  query.reject(new Error('query failed'));
  await expect(query.promise).rejects.toThrow('query failed');
  await Promise.resolve();

  expect(store.getSnapshot()).toEqual({ reduceMotion: true, resolved: true });
  off();
});

test('keeps snapshot identity stable until the value changes', () => {
  const query = deferred<boolean>();
  let onChange!: (enabled: boolean) => void;
  const store = createMotionPreferenceStore({
    isReduceMotionEnabled: () => query.promise,
    addReduceMotionListener: (listener) => {
      onChange = listener;
      return () => {};
    },
  });
  const initial = store.getSnapshot();
  expect(store.getSnapshot()).toBe(initial);

  const off = store.subscribe(jest.fn());
  onChange(false);
  const changed = store.getSnapshot();

  expect(changed).not.toBe(initial);
  expect(store.getSnapshot()).toBe(changed);
  off();
});

test('does not notify subscribers when a native event repeats the same value', () => {
  const query = deferred<boolean>();
  let onChange!: (enabled: boolean) => void;
  const store = createMotionPreferenceStore({
    isReduceMotionEnabled: () => query.promise,
    addReduceMotionListener: (listener) => {
      onChange = listener;
      return () => {};
    },
  });
  const listener = jest.fn();
  const off = store.subscribe(listener);

  onChange(false);
  onChange(false);

  expect(listener).toHaveBeenCalledTimes(1);
  off();
});
