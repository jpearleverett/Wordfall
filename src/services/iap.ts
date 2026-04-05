/**
 * In-App Purchase manager built on react-native-iap (v14+).
 *
 * Handles store connection, product fetching, purchasing, acknowledgement,
 * receipt storage, and purchase restoration. Falls back to mock mode when
 * the native module is unavailable (Expo Go, web, simulator without store).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { logger } from '../utils/logger';
import type { IAPProductId } from '../types';
import { validateReceipt } from './receiptValidation';
import {
  SHOP_PRODUCTS,
  getAllStoreProductIds,
  getProductByStoreId,
  getProductById,
  internalIdToStoreId,
  storeIdToInternalId,
} from '../data/shopProducts';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface IAPProduct {
  productId: string;
  /** Internal Wordfall product ID */
  internalId: IAPProductId;
  title: string;
  description: string;
  /** Localised price string from the store (e.g. "$1.99") */
  price: string;
  /** Numeric price amount */
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

export interface StoredReceipt {
  productId: string;
  internalId: string;
  transactionId: string;
  receipt: string;
  platform: string;
  purchaseDate: number;
}

type PurchaseListener = (result: PurchaseResult) => void;

// ─── Constants ───────────────────────────────────────────────────────────────

const RECEIPTS_STORAGE_KEY = '@wordfall_iap_receipts';
const PENDING_PURCHASES_KEY = '@wordfall_iap_pending';

// Import react-native-iap types for internal use (the module itself is
// dynamically imported so the app doesn't crash when native code is missing).
type RNIap = typeof import('react-native-iap');

// ─── Manager class ───────────────────────────────────────────────────────────

class IAPManager {
  private static instance: IAPManager;
  private products: Map<string, IAPProduct> = new Map();
  private initialized = false;
  private connected = false;
  private useMock = true;
  private purchaseListeners: PurchaseListener[] = [];
  private purchaseUpdateSubscription: { remove: () => void } | null = null;
  private purchaseErrorSubscription: { remove: () => void } | null = null;
  private rniap: RNIap | null = null;
  private pendingPurchaseResolvers: Map<string, {
    resolve: (result: PurchaseResult) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = new Map();

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
      // Check if the native module is available before importing.
      // react-native-iap's module-level code accesses NativeModules and
      // creates a NativeEventEmitter, which throws "Value is undefined,
      // expected an Object" when the native module isn't linked (Expo Go).
      const { NativeModules } = await import('react-native');
      if (!NativeModules.RNIapModule && !NativeModules.RNIapIos && !NativeModules.RNIapAmazonModule) {
        throw new Error('react-native-iap native module not linked');
      }

      // Dynamically import react-native-iap to avoid crashes when native
      // module is not linked (Expo Go, web).
      const iap: RNIap = await import('react-native-iap');
      this.rniap = iap;

      // Establish connection to the store
      await iap.initConnection();
      this.connected = true;
      this.useMock = false;

      // Set up purchase update listeners — wrapped in try/catch because
      // the NativeEventEmitter can throw if the native module isn't linked
      // (e.g. running in Expo Go where the JS package exists but native code doesn't).
      try {
        this.purchaseUpdateSubscription = iap.purchaseUpdatedListener(
          (purchase) => {
            void this.handlePurchaseUpdate(purchase);
          },
        );

        this.purchaseErrorSubscription = iap.purchaseErrorListener(
          (error) => {
            this.handlePurchaseError(error);
          },
        );
      } catch (listenerError) {
        logger.warn('[IAP] Failed to set up purchase listeners:', listenerError);
      }

      // Load products immediately
      await this.loadProducts();

      // Process any pending purchases from interrupted sessions
      await this.processPendingPurchases();

      logger.log('[IAP] react-native-iap connected');
    } catch (e) {
      this.useMock = true;
      logger.log('[IAP] react-native-iap not available, using mock mode:', e);
    }

    this.initialized = true;
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────

  async disconnect(): Promise<void> {
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
      this.purchaseUpdateSubscription = null;
    }
    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
      this.purchaseErrorSubscription = null;
    }

    if (this.rniap && this.connected) {
      try {
        await this.rniap.endConnection();
      } catch {
        // Ignore cleanup errors
      }
    }

    this.connected = false;
    this.initialized = false;
  }

  // ── Product loading ─────────────────────────────────────────────────────

  async loadProducts(): Promise<IAPProduct[]> {
    await this.init();

    if (this.useMock || !this.rniap) {
      return this.mockLoadProducts();
    }

    const storeIds = getAllStoreProductIds();

    try {
      const storeProducts = await this.rniap.fetchProducts({ skus: storeIds });

      if (!storeProducts) {
        return this.mockLoadProducts();
      }

      const products: IAPProduct[] = storeProducts.map((sp) => {
        const shopProduct = getProductByStoreId(sp.id);
        const product: IAPProduct = {
          productId: sp.id,
          internalId: (shopProduct?.id ?? sp.id) as IAPProductId,
          title: sp.title ?? shopProduct?.name ?? '',
          description: sp.description ?? shopProduct?.description ?? '',
          price: sp.displayPrice ?? shopProduct?.fallbackPrice ?? '',
          priceAmount: sp.price ?? shopProduct?.fallbackPriceAmount ?? 0,
          currency: sp.currency ?? 'USD',
        };
        this.products.set(sp.id, product);
        // Also store by internal ID for quick lookup
        if (shopProduct) {
          this.products.set(shopProduct.id, product);
        }
        return product;
      });

      logger.log(`[IAP] Loaded ${products.length} products from store`);
      return products;
    } catch (e) {
      logger.warn('[IAP] loadProducts failed, using fallback data:', e);
      return this.mockLoadProducts();
    }
  }

  /** Get all loaded products */
  getProducts(): IAPProduct[] {
    // Deduplicate: only return one entry per unique internalId
    const seen = new Set<string>();
    const result: IAPProduct[] = [];
    for (const product of this.products.values()) {
      if (!seen.has(product.internalId)) {
        seen.add(product.internalId);
        result.push(product);
      }
    }
    return result;
  }

  // ── Purchasing ──────────────────────────────────────────────────────────

  async purchase(productId: string): Promise<PurchaseResult> {
    await this.init();

    // Resolve the store product ID
    const storeId = this.resolveStoreId(productId);
    const internalId = this.resolveInternalId(productId);

    if (this.useMock || !this.rniap) {
      return this.mockPurchase(internalId);
    }

    // Store as pending before initiating
    await this.storePendingPurchase(internalId);

    try {
      // Request the purchase — the result comes through the listener
      await this.rniap.requestPurchase({
        request: {
          apple: { sku: storeId, andDangerouslyFinishTransactionAutomatically: false },
          google: { skus: [storeId] },
        },
        type: 'in-app',
      });

      // Wait for the purchase listener to resolve
      return new Promise<PurchaseResult>((resolve) => {
        const timeout = setTimeout(() => {
          this.pendingPurchaseResolvers.delete(storeId);
          resolve({
            success: false,
            productId: internalId,
            error: 'Purchase timed out. If you were charged, use Restore Purchases.',
          });
        }, 120_000);

        this.pendingPurchaseResolvers.set(storeId, { resolve, timeout });
      });
    } catch (e: any) {
      await this.clearPendingPurchase(internalId);

      // User cancellation is not an error
      const code = e?.code ?? '';
      const msg = e?.message ?? '';
      if (code === 'E_USER_CANCELLED' || msg.includes('cancel')) {
        return { success: false, productId: internalId, error: 'User cancelled' };
      }

      return {
        success: false,
        productId: internalId,
        error: msg || 'Purchase failed',
      };
    }
  }

  // ── Restore purchases ───────────────────────────────────────────────────

  async restorePurchases(): Promise<PurchaseResult[]> {
    await this.init();

    if (this.useMock || !this.rniap) {
      logger.log('[IAP] Mock restore — checking stored receipts');
      return this.getStoredNonConsumableResults();
    }

    try {
      const purchases = await this.rniap.getAvailablePurchases();
      const results: PurchaseResult[] = [];

      if (!purchases) return results;

      for (const purchase of purchases) {
        const internalId = storeIdToInternalId(purchase.productId);
        if (internalId) {
          const result: PurchaseResult = {
            success: true,
            productId: internalId,
            transactionId: purchase.id,
            receipt: purchase.purchaseToken ?? undefined,
          };
          results.push(result);

          // Store the receipt
          await this.storeReceipt({
            productId: purchase.productId,
            internalId,
            transactionId: purchase.id ?? `restored_${Date.now()}`,
            receipt: purchase.purchaseToken ?? '',
            platform: Platform.OS,
            purchaseDate: purchase.transactionDate ?? Date.now(),
          });
        }
      }

      return results;
    } catch (e: any) {
      logger.warn('[IAP] Restore failed:', e);
      throw new Error(e?.message ?? 'Failed to restore purchases');
    }
  }

  // ── Status checks ───────────────────────────────────────────────────────

  async isPremiumPassActive(): Promise<boolean> {
    const receipts = await this.getStoredReceipts();
    return receipts.some((r) => r.internalId === 'premium_pass');
  }

  async isAdFreeActive(): Promise<boolean> {
    const receipts = await this.getStoredReceipts();
    return receipts.some((r) => r.internalId === 'ad_removal');
  }

  // ── Product price lookup ────────────────────────────────────────────────

  /** Get the localised price for a product, falling back to the catalog price */
  getPrice(productId: string): string {
    const storeId = this.resolveStoreId(productId);
    const storeProduct = this.products.get(storeId);
    if (storeProduct) return storeProduct.price;

    const internalProduct = this.products.get(productId);
    if (internalProduct) return internalProduct.price;

    // Fallback to catalog
    const shopProduct = getProductById(productId);
    return shopProduct?.fallbackPrice ?? '';
  }

  /** Get the numeric price amount */
  getPriceAmount(productId: string): number {
    const storeId = this.resolveStoreId(productId);
    const storeProduct = this.products.get(storeId);
    if (storeProduct) return storeProduct.priceAmount;

    const shopProduct = getProductById(productId);
    return shopProduct?.fallbackPriceAmount ?? 0;
  }

  // ── Getters ─────────────────────────────────────────────────────────────

  getProduct(productId: string): IAPProduct | undefined {
    const storeId = this.resolveStoreId(productId);
    return this.products.get(storeId) ?? this.products.get(productId);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isMockMode(): boolean {
    return this.useMock;
  }

  isAvailable(): boolean {
    return this.initialized;
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
        logger.warn('[IAP] Listener threw:', e);
      }
    }
  }

  // ── Purchase event handlers ─────────────────────────────────────────────

  private async handlePurchaseUpdate(purchase: any): Promise<void> {
    const storeId: string = purchase.productId;
    const internalId = storeIdToInternalId(storeId) ?? storeId;
    const transactionId: string = purchase.id ?? `tx_${Date.now()}`;
    const receipt: string = purchase.purchaseToken ?? '';

    try {
      // Validate receipt
      const validation = await validateReceipt(receipt, internalId);

      if (!validation.valid) {
        const errorResult: PurchaseResult = {
          success: false,
          productId: internalId,
          error: validation.error ?? 'Receipt validation failed',
        };
        this.resolvePendingPurchase(storeId, errorResult);
        this.notifyListeners(errorResult);
        return;
      }

      // Store the receipt
      await this.storeReceipt({
        productId: storeId,
        internalId,
        transactionId,
        receipt,
        platform: Platform.OS,
        purchaseDate: Date.now(),
      });

      // Acknowledge / finish the transaction
      if (this.rniap) {
        const shopProduct = getProductById(internalId);
        const isConsumable = !(shopProduct?.isNonConsumable ?? false);

        try {
          if (Platform.OS === 'ios') {
            await this.rniap.finishTransaction({ purchase, isConsumable });
          } else {
            // Android: acknowledge the purchase if not already acknowledged
            if (!purchase.isAcknowledgedAndroid && purchase.purchaseToken) {
              await this.rniap.acknowledgePurchaseAndroid(purchase.purchaseToken);
            }
            // Consume consumable purchases
            if (isConsumable && purchase.purchaseToken) {
              await this.rniap.consumePurchaseAndroid(purchase.purchaseToken);
            }
          }
        } catch (ackError) {
          logger.warn('[IAP] Failed to acknowledge/finish transaction:', ackError);
          // Purchase still succeeded from user perspective
        }
      }

      // Clear pending purchase
      await this.clearPendingPurchase(internalId);

      const successResult: PurchaseResult = {
        success: true,
        productId: internalId,
        transactionId,
        receipt,
      };

      this.resolvePendingPurchase(storeId, successResult);
      this.notifyListeners(successResult);
    } catch (e: any) {
      logger.warn('[IAP] Error handling purchase update:', e);
      const errorResult: PurchaseResult = {
        success: false,
        productId: internalId,
        error: e?.message ?? 'Purchase processing failed',
      };
      this.resolvePendingPurchase(storeId, errorResult);
      this.notifyListeners(errorResult);
    }
  }

  private handlePurchaseError(error: any): void {
    logger.warn('[IAP] Purchase error from store:', error);

    const storeId: string | undefined = error?.productId;
    const internalId = storeId ? (storeIdToInternalId(storeId) ?? storeId) : 'unknown';

    // User cancellation
    if (error?.code === 'E_USER_CANCELLED') {
      const cancelResult: PurchaseResult = {
        success: false,
        productId: internalId,
        error: 'User cancelled',
      };
      if (storeId) {
        this.resolvePendingPurchase(storeId, cancelResult);
      }
      return;
    }

    const errorResult: PurchaseResult = {
      success: false,
      productId: internalId,
      error: error?.message ?? 'Purchase failed',
    };
    if (storeId) {
      this.resolvePendingPurchase(storeId, errorResult);
    }
    this.notifyListeners(errorResult);
  }

  private resolvePendingPurchase(storeId: string, result: PurchaseResult): void {
    const pending = this.pendingPurchaseResolvers.get(storeId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingPurchaseResolvers.delete(storeId);
      pending.resolve(result);
    }
  }

  // ── Pending purchase recovery ───────────────────────────────────────────

  private async storePendingPurchase(productId: string): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(PENDING_PURCHASES_KEY);
      const pending: string[] = stored ? JSON.parse(stored) : [];
      if (!pending.includes(productId)) {
        pending.push(productId);
        await AsyncStorage.setItem(PENDING_PURCHASES_KEY, JSON.stringify(pending));
      }
    } catch {
      // Non-critical
    }
  }

  private async clearPendingPurchase(productId: string): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(PENDING_PURCHASES_KEY);
      if (stored) {
        const pending: string[] = JSON.parse(stored);
        const filtered = pending.filter((id) => id !== productId);
        await AsyncStorage.setItem(PENDING_PURCHASES_KEY, JSON.stringify(filtered));
      }
    } catch {
      // Non-critical
    }
  }

  private async processPendingPurchases(): Promise<void> {
    if (this.useMock || !this.rniap) return;

    try {
      const stored = await AsyncStorage.getItem(PENDING_PURCHASES_KEY);
      if (!stored) return;

      const pending: string[] = JSON.parse(stored);
      if (pending.length === 0) return;

      logger.log(`[IAP] Processing ${pending.length} pending purchase(s)...`);

      // Check available purchases to see if any pending ones completed
      const purchases = await this.rniap.getAvailablePurchases();
      if (!purchases) return;

      for (const purchase of purchases) {
        const internalId = storeIdToInternalId(purchase.productId);
        if (internalId && pending.includes(internalId)) {
          await this.handlePurchaseUpdate(purchase);
        }
      }
    } catch (e) {
      logger.warn('[IAP] Failed to process pending purchases:', e);
    }
  }

  // ── Receipt storage ─────────────────────────────────────────────────────

  private async storeReceipt(receipt: StoredReceipt): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(RECEIPTS_STORAGE_KEY);
      const receipts: StoredReceipt[] = stored ? JSON.parse(stored) : [];

      // Avoid duplicate receipts
      const exists = receipts.some(
        (r) => r.transactionId === receipt.transactionId,
      );
      if (!exists) {
        receipts.push(receipt);
        await AsyncStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(receipts));
      }
    } catch (e) {
      logger.warn('[IAP] Failed to store receipt:', e);
    }
  }

  async getStoredReceipts(): Promise<StoredReceipt[]> {
    try {
      const stored = await AsyncStorage.getItem(RECEIPTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private async getStoredNonConsumableResults(): Promise<PurchaseResult[]> {
    const receipts = await this.getStoredReceipts();
    return receipts
      .filter((r) => {
        const product = getProductById(r.internalId);
        return product?.isNonConsumable;
      })
      .map((r) => ({
        success: true,
        productId: r.internalId,
        transactionId: r.transactionId,
        receipt: r.receipt,
      }));
  }

  // ── ID resolution helpers ───────────────────────────────────────────────

  private resolveStoreId(productId: string): string {
    // If it's already a store ID, return as-is
    if (productId.startsWith('wordfall_')) return productId;
    // Try to map from internal to store ID
    return internalIdToStoreId(productId as IAPProductId) ?? productId;
  }

  private resolveInternalId(productId: string): string {
    // If it's a store ID, map to internal
    if (productId.startsWith('wordfall_')) {
      return storeIdToInternalId(productId) ?? productId;
    }
    return productId;
  }

  // ── Mock implementations (development / Expo Go) ────────────────────────

  private mockLoadProducts(): IAPProduct[] {
    const products: IAPProduct[] = SHOP_PRODUCTS.map((sp) => {
      const product: IAPProduct = {
        productId: sp.storeProductId,
        internalId: sp.id,
        title: sp.name,
        description: sp.description,
        price: sp.fallbackPrice,
        priceAmount: sp.fallbackPriceAmount,
        currency: 'USD',
      };
      this.products.set(sp.storeProductId, product);
      this.products.set(sp.id, product);
      return product;
    });
    return products;
  }

  private async mockPurchase(productId: string): Promise<PurchaseResult> {
    logger.log(`[IAP] Mock purchase: ${productId}`);

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

    // Store the receipt
    await this.storeReceipt({
      productId: `wordfall_${productId}`,
      internalId: productId,
      transactionId,
      receipt,
      platform: Platform.OS,
      purchaseDate: Date.now(),
    });

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

// ─── Singleton export ────────────────────────────────────────────────────────

export const iapManager = IAPManager.getInstance();

// Re-export ALL_PRODUCT_IDS for backward compat
export const ALL_PRODUCT_IDS: IAPProductId[] = SHOP_PRODUCTS.map((p) => p.id);
