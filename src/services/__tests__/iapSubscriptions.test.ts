/**
 * Subscription purchase flow (Aug 2026) — vip_* SKUs must go through the
 * store's SUBSCRIPTION flow, not the in-app flow.
 *
 * Before this branch existed, every purchase was requested with
 * `type: 'in-app'`. Google returns nothing for a SUBS SKU queried as
 * in-app and Play Billing 5+ requires an offerToken in the purchase params,
 * so the three VIP tiers were structurally unsellable on Android. These
 * tests drive the real IAPManager with an injected react-native-iap mock
 * (white-box: the singleton's private state is set directly, the same way
 * init() would) and pin:
 *
 *   1. product loading splits in-app vs subs fetches (type: 'subs')
 *   2. subs purchases go out with type 'subs' + Android offer tokens
 *   3. in-app purchases keep the plain 'in-app' request
 *   4. missing offer tokens are refetched once on Android before purchase
 *   5. settlement: subs are acknowledged but NEVER consumed (consuming a
 *      Play subscription token breaks onSubscriptionRenew's renewal
 *      pipeline); consumables are still consumed; iOS finishes subs
 *      non-consumable.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { iapManager } from '../iap';
import { SHOP_PRODUCTS } from '../../data/shopProducts';

const SUB_STORE_IDS = SHOP_PRODUCTS.filter((p) => p.category === 'subscription').map(
  (p) => p.storeProductId,
);

type AnyManager = {
  initialized: boolean;
  connected: boolean;
  useMock: boolean;
  rniap: Record<string, jest.Mock> | null;
  products: Map<string, unknown>;
  subscriptionOfferTokens: Map<string, { sku: string; offerToken: string }[]>;
  pendingPurchaseResolvers: Map<string, unknown>;
  processedTransactionIds: Set<string>;
  resolvePendingPurchase(storeId: string, result: unknown): boolean;
  handlePurchaseUpdate(purchase: unknown): Promise<void>;
};

const m = iapManager as unknown as AnyManager;

function makeRniap() {
  return {
    fetchProducts: jest.fn(async ({ type }: { skus: string[]; type?: string }) => {
      if (type === 'subs') {
        return SUB_STORE_IDS.map((id) => ({
          id,
          title: id,
          description: id,
          displayPrice: '$9.99',
          price: 9.99,
          currency: 'USD',
          subscriptionOffers: [
            { id: `${id}-base`, displayPrice: '$9.99', price: 9.99, offerTokenAndroid: `tok-${id}` },
          ],
        }));
      }
      return [];
    }),
    requestPurchase: jest.fn(async (_args: unknown) => null),
    finishTransaction: jest.fn(async () => undefined),
    acknowledgePurchaseAndroid: jest.fn(async () => undefined),
    consumePurchaseAndroid: jest.fn(async () => undefined),
    getAvailablePurchases: jest.fn(async () => []),
    initConnection: jest.fn(async () => true),
    endConnection: jest.fn(async () => undefined),
  };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('subscription vs in-app purchase branching', () => {
  let rniap: ReturnType<typeof makeRniap>;

  beforeEach(async () => {
    await AsyncStorage.clear();
    rniap = makeRniap();
    m.initialized = true;
    m.connected = true;
    m.useMock = false;
    m.rniap = rniap as unknown as Record<string, jest.Mock>;
    m.products = new Map();
    m.subscriptionOfferTokens = new Map();
    m.pendingPurchaseResolvers = new Map();
    m.processedTransactionIds = new Set();
    (Platform as { OS: string }).OS = 'android';
  });

  afterEach(() => {
    (Platform as { OS: string }).OS = 'ios';
    m.rniap = null;
    m.useMock = true;
  });

  it('loadProducts fetches subscriptions with type "subs" and everything else as in-app', async () => {
    await iapManager.loadProducts();

    const calls = rniap.fetchProducts.mock.calls.map((c) => c[0]);
    const subsCall = calls.find((c) => c.type === 'subs');
    const inAppCall = calls.find((c) => c.type === 'in-app');
    expect(subsCall).toBeDefined();
    expect(inAppCall).toBeDefined();
    expect([...subsCall!.skus].sort()).toEqual([...SUB_STORE_IDS].sort());
    for (const sku of SUB_STORE_IDS) {
      expect(inAppCall!.skus).not.toContain(sku);
    }
  });

  it('loadProducts captures Android offer tokens for every VIP tier', async () => {
    await iapManager.loadProducts();
    for (const sku of SUB_STORE_IDS) {
      expect(m.subscriptionOfferTokens.get(sku)).toEqual([
        { sku, offerToken: `tok-${sku}` },
      ]);
    }
  });

  it('vip_* purchases request type "subs" with the captured offer token', async () => {
    await iapManager.loadProducts();

    const purchasePromise = iapManager.purchase('vip_monthly', 'uid1');
    await flush();

    expect(rniap.requestPurchase).toHaveBeenCalledTimes(1);
    const arg = rniap.requestPurchase.mock.calls[0][0] as any;
    expect(arg.type).toBe('subs');
    expect(arg.request.google.skus).toEqual(['wordfall_vip_monthly']);
    expect(arg.request.google.subscriptionOffers).toEqual([
      { sku: 'wordfall_vip_monthly', offerToken: 'tok-wordfall_vip_monthly' },
    ]);
    expect(arg.request.apple.sku).toBe('wordfall_vip_monthly');

    m.resolvePendingPurchase('wordfall_vip_monthly', {
      success: false,
      productId: 'vip_monthly',
      error: 'User cancelled',
    });
    await expect(purchasePromise).resolves.toMatchObject({ success: false });
  });

  it('non-subscription purchases keep the plain in-app request', async () => {
    await iapManager.loadProducts();

    const purchasePromise = iapManager.purchase('gems_250', 'uid1');
    await flush();

    expect(rniap.requestPurchase).toHaveBeenCalledTimes(1);
    const arg = rniap.requestPurchase.mock.calls[0][0] as any;
    expect(arg.type).toBe('in-app');
    expect(arg.request.google.skus).toEqual(['wordfall_gems_250']);
    expect(arg.request.google.subscriptionOffers).toBeUndefined();

    m.resolvePendingPurchase('wordfall_gems_250', {
      success: false,
      productId: 'gems_250',
      error: 'User cancelled',
    });
    await expect(purchasePromise).resolves.toMatchObject({ success: false });
  });

  it('refetches the subs offer token once on Android when the load-time fetch missed it', async () => {
    // No loadProducts — the token map is empty, as after a startup network blip.
    const purchasePromise = iapManager.purchase('vip_weekly', 'uid1');
    await flush();

    const subsFetch = rniap.fetchProducts.mock.calls.find((c) => c[0].type === 'subs');
    expect(subsFetch).toBeDefined();
    expect(subsFetch![0].skus).toEqual(['wordfall_vip_weekly']);

    const arg = rniap.requestPurchase.mock.calls[0][0] as any;
    expect(arg.type).toBe('subs');
    expect(arg.request.google.subscriptionOffers).toEqual([
      { sku: 'wordfall_vip_weekly', offerToken: 'tok-wordfall_vip_weekly' },
    ]);

    m.resolvePendingPurchase('wordfall_vip_weekly', {
      success: false,
      productId: 'vip_weekly',
      error: 'User cancelled',
    });
    await purchasePromise;
  });

  it('Android settlement acknowledges a subscription but NEVER consumes it', async () => {
    await m.handlePurchaseUpdate({
      productId: 'wordfall_vip_monthly',
      id: 'tx_sub_ack_1',
      purchaseToken: 'ptok_sub_1',
      isAcknowledgedAndroid: false,
    });

    expect(rniap.acknowledgePurchaseAndroid).toHaveBeenCalledWith('ptok_sub_1');
    expect(rniap.consumePurchaseAndroid).not.toHaveBeenCalled();
  });

  it('Android settlement still consumes consumables', async () => {
    await m.handlePurchaseUpdate({
      productId: 'wordfall_gems_250',
      id: 'tx_gems_consume_1',
      purchaseToken: 'ptok_gems_1',
      isAcknowledgedAndroid: false,
    });

    expect(rniap.acknowledgePurchaseAndroid).toHaveBeenCalledWith('ptok_gems_1');
    expect(rniap.consumePurchaseAndroid).toHaveBeenCalledWith('ptok_gems_1');
  });

  it('iOS finishes a subscription transaction as non-consumable', async () => {
    (Platform as { OS: string }).OS = 'ios';
    const purchase = {
      productId: 'wordfall_vip_annual',
      id: 'tx_sub_ios_1',
      purchaseToken: 'ptok_ios_1',
    };
    await m.handlePurchaseUpdate(purchase);

    expect(rniap.finishTransaction).toHaveBeenCalledWith({ purchase, isConsumable: false });
    expect(rniap.consumePurchaseAndroid).not.toHaveBeenCalled();
  });
});
