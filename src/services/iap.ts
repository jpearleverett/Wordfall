/**
 * In-App Purchase manager.
 *
 * Wraps expo-in-app-purchases when available. Falls back to mock purchases
 * in development or when the native module is missing (e.g. Expo Go).
 */

import { IAPProductId } from '../types';
import { validateReceipt } from './receiptValidation';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface IAPProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceAmount: number;
  currency: string;
}

export interface PurchaseResult {
  success: boolean;
  productId: string;
  transactionId?: string;
  receipt?: string;
  error?: string;
}

type PurchaseListener = (result: PurchaseResult) => void;

// ─── Product catalogue (maps to App Store / Play Store product IDs) ──────────

const PRODUCT_CATALOGUE: Record<IAPProductId, { title: string; description: string; price: string; priceAmount: number }> = {
  starter_pack: { title: 'Starter Pack', description: '500 Coins + 50 Gems + 10 Hints + Exclusive Decoration', price: '$1.99', priceAmount: 1.99 },
  hint_bundle_10: { title: '10 Hints', description: 'A small bundle of 10 hint tokens', price: '$0.99', priceAmount: 0.99 },
  hint_bundle_25: { title: '25 Hints', description: 'A medium bundle of 25 hint tokens', price: '$1.99', priceAmount: 1.99 },
  hint_bundle_50: { title: '50 Hints', description: 'A large bundle of 50 hint tokens', price: '$2.99', priceAmount: 2.99 },
  undo_bundle_10: { title: '10 Undos', description: 'A small bundle of 10 undo tokens', price: '$0.99', priceAmount: 0.99 },
  undo_bundle_25: { title: '25 Undos', description: 'A medium bundle of 25 undo tokens', price: '$1.99', priceAmount: 1.99 },
  undo_bundle_50: { title: '50 Undos', description: 'A large bundle of 50 undo tokens', price: '$2.99', priceAmount: 2.99 },
  daily_value_pack: { title: 'Daily Value Pack', description: 'Bonus rewards every day for 30 days', price: '$0.99', priceAmount: 0.99 },
  chapter_bundle: { title: 'Chapter Bundle', description: 'Theme decoration + 20 gems + 10 hints + 1 Board Preview', price: '$2.99', priceAmount: 2.99 },
  premium_pass: { title: 'Premium Pass', description: 'Unlock premium mastery rewards this season', price: '$4.99', priceAmount: 4.99 },
  ad_removal: { title: 'Remove Ads', description: 'Enjoy an ad-free experience forever', price: '$4.99', priceAmount: 4.99 },
};

export const ALL_PRODUCT_IDS: IAPProductId[] = Object.keys(PRODUCT_CATALOGUE) as IAPProductId[];

// ─── Manager class ───────────────────────────────────────────────────────────

class IAPManager {
  private static instance: IAPManager;
  private products: Map<string, IAPProduct> = new Map();
  private initialized = false;
  private useMock = true;
  private purchaseListeners: PurchaseListener[] = [];

  private constructor() {}

  static getInstance(): IAPManager {
    if (!IAPManager.instance) {
      IAPManager.instance = new IAPManager();
    }
    return IAPManager.instance;
  }

  // ── Initialisation ──────────────────────────────────────────────────────

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // Try to dynamically import the native IAP module.
      // This will throw in Expo Go / web / when the package isn't installed.
      const iapModule = await import('expo-in-app-purchases' as string);

      if (iapModule && typeof iapModule.connectAsync === 'function') {
        await iapModule.connectAsync();
        this.useMock = false;

        // Listen for native purchase events
        iapModule.setPurchaseListener(
          ({ responseCode, results }: { responseCode: number; results?: Array<{ productId: string; transactionId: string; transactionReceipt: string }> }) => {
            if (responseCode === 0 && results && results.length > 0) {
              for (const r of results) {
                const purchaseResult: PurchaseResult = {
                  success: true,
                  productId: r.productId,
                  transactionId: r.transactionId,
                  receipt: r.transactionReceipt,
                };
                this.notifyListeners(purchaseResult);

                // Acknowledge / finish the transaction
                iapModule.finishTransactionAsync(r, false).catch(() => {});
              }
            }
          },
        );

        console.log('[IAP] Native module connected');
      } else {
        this.useMock = true;
      }
    } catch {
      // Native module not available — fall back to mock
      this.useMock = true;
      console.log('[IAP] Native module not available, using mock mode');
    }

    this.initialized = true;
  }

  // ── Product loading ─────────────────────────────────────────────────────

  async loadProducts(productIds: string[]): Promise<IAPProduct[]> {
    await this.init();

    if (this.useMock) {
      return this.mockLoadProducts(productIds);
    }

    try {
      const iapModule = await import('expo-in-app-purchases' as string);
      const { results } = await iapModule.getProductsAsync(productIds);
      const products: IAPProduct[] = (results ?? []).map((r: any) => ({
        productId: r.productId,
        title: r.title,
        description: r.description,
        price: r.price,
        priceAmount: parseFloat(r.price?.replace(/[^0-9.]/g, '') ?? '0'),
        currency: r.priceCurrencyCode ?? 'USD',
      }));
      products.forEach((p) => this.products.set(p.productId, p));
      return products;
    } catch (e) {
      console.warn('[IAP] loadProducts failed, using mock:', e);
      return this.mockLoadProducts(productIds);
    }
  }

  // ── Purchasing ──────────────────────────────────────────────────────────

  async purchase(productId: string): Promise<PurchaseResult> {
    await this.init();

    if (this.useMock) {
      return this.mockPurchase(productId);
    }

    try {
      const iapModule = await import('expo-in-app-purchases' as string);
      await iapModule.purchaseItemAsync(productId);

      // The actual result comes via the purchase listener.
      // Return a pending result — the listener will fire the real one.
      return new Promise<PurchaseResult>((resolve) => {
        const timeout = setTimeout(() => {
          cleanup();
          resolve({ success: false, productId, error: 'Purchase timed out' });
        }, 60_000);

        const cleanup = this.onPurchase((result) => {
          if (result.productId === productId) {
            clearTimeout(timeout);
            cleanup();
            resolve(result);
          }
        });
      });
    } catch (e: any) {
      return {
        success: false,
        productId,
        error: e?.message ?? 'Purchase failed',
      };
    }
  }

  // ── Restore purchases ───────────────────────────────────────────────────

  async restorePurchases(): Promise<PurchaseResult[]> {
    await this.init();

    if (this.useMock) {
      console.log('[IAP] Mock restore — no purchases to restore');
      return [];
    }

    try {
      const iapModule = await import('expo-in-app-purchases' as string);
      const { results } = await iapModule.getPurchaseHistoryAsync();
      return (results ?? []).map((r: any) => ({
        success: true,
        productId: r.productId,
        transactionId: r.transactionId,
        receipt: r.transactionReceipt,
      }));
    } catch (e: any) {
      console.warn('[IAP] Restore failed:', e);
      return [];
    }
  }

  // ── Listener management ─────────────────────────────────────────────────

  onPurchase(listener: PurchaseListener): () => void {
    this.purchaseListeners.push(listener);
    return () => {
      this.purchaseListeners = this.purchaseListeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(result: PurchaseResult): void {
    for (const listener of this.purchaseListeners) {
      try {
        listener(result);
      } catch (e) {
        console.warn('[IAP] Listener threw:', e);
      }
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  getProduct(productId: string): IAPProduct | undefined {
    return this.products.get(productId);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isMockMode(): boolean {
    return this.useMock;
  }

  // ── Mock implementations (development / Expo Go) ────────────────────────

  private mockLoadProducts(productIds: string[]): IAPProduct[] {
    const products: IAPProduct[] = productIds
      .filter((id): id is IAPProductId => id in PRODUCT_CATALOGUE)
      .map((id) => {
        const info = PRODUCT_CATALOGUE[id];
        const product: IAPProduct = {
          productId: id,
          title: info.title,
          description: info.description,
          price: info.price,
          priceAmount: info.priceAmount,
          currency: 'USD',
        };
        this.products.set(id, product);
        return product;
      });
    return products;
  }

  private async mockPurchase(productId: string): Promise<PurchaseResult> {
    console.log(`[IAP] Mock purchase: ${productId}`);

    // Simulate a 1-second purchase delay
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));

    const transactionId = `mock_${productId}_${Date.now()}`;
    const receipt = `mock_receipt_${transactionId}`;

    // Validate receipt (will pass in mock mode)
    const validation = await validateReceipt(receipt, productId);
    if (!validation.valid) {
      const result: PurchaseResult = {
        success: false,
        productId,
        error: validation.error ?? 'Receipt validation failed',
      };
      this.notifyListeners(result);
      return result;
    }

    const result: PurchaseResult = {
      success: true,
      productId,
      transactionId,
      receipt,
    };

    this.notifyListeners(result);
    return result;
  }
}

export const iapManager = IAPManager.getInstance();
