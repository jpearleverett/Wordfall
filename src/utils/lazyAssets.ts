/**
 * Lazy asset loading utilities.
 * Defers loading of heavy assets until needed to reduce initial bundle size.
 */

const assetCache: Map<string, any> = new Map();

export async function lazyLoadImage(assetModule: number): Promise<any> {
  const key = String(assetModule);
  if (assetCache.has(key)) return assetCache.get(key);

  const { Asset } = await import('expo-asset');
  const [asset] = await Asset.loadAsync(assetModule);
  assetCache.set(key, asset);
  return asset;
}

export function clearAssetCache(): void {
  assetCache.clear();
}

export function getAssetCacheSize(): number {
  return assetCache.size;
}
