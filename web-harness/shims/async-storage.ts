/** In-memory shim for AsyncStorage. */
const store: Record<string, string> = {};

const AsyncStorage = {
  async getItem(key: string): Promise<string | null> {
    return store[key] ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    store[key] = value;
  },
  async removeItem(key: string): Promise<void> {
    delete store[key];
  },
  async clear(): Promise<void> {
    Object.keys(store).forEach((k) => delete store[k]);
  },
  async multiGet(
    keys: string[],
  ): Promise<Array<[string, string | null]>> {
    return keys.map((k) => [k, store[k] ?? null]);
  },
  async multiSet(pairs: Array<[string, string]>): Promise<void> {
    for (const [k, v] of pairs) store[k] = v;
  },
  async multiRemove(keys: string[]): Promise<void> {
    for (const k of keys) delete store[k];
  },
  async getAllKeys(): Promise<string[]> {
    return Object.keys(store);
  },
};
export default AsyncStorage;
