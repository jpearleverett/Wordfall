const store: Record<string, string> = {};

const AsyncStorage = {
  getItem: async (key: string) => store[key] ?? null,
  setItem: async (key: string, value: string) => { store[key] = value; },
  removeItem: async (key: string) => { delete store[key]; },
  clear: async () => { Object.keys(store).forEach(k => delete store[k]); },
  getAllKeys: async () => Object.keys(store),
  multiGet: async (keys: string[]) => keys.map(k => [k, store[k] ?? null]),
  multiSet: async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => { store[k] = v; }); },
  multiRemove: async (keys: string[]) => { keys.forEach(k => delete store[k]); },
};

export default AsyncStorage;
