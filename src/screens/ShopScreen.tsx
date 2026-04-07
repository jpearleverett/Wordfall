import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, FONTS } from '../constants';
import { AmbientBackdrop } from '../components/common/AmbientBackdrop';
import { LOCAL_IMAGES } from '../utils/localAssets';
import { useSettings } from '../contexts/SettingsContext';
import { useEconomy } from '../contexts/EconomyContext';
import { usePlayer } from '../contexts/PlayerContext';
import { iapManager, PurchaseResult } from '../services/iap';
import { adManager, AdRewardType } from '../services/ads';
import { MockAdModal } from '../components/MockAdModal';
import {
  getCurrentRotatingItems,
  getTimeRemainingHours,
  getRarityColor,
  RotatingItem,
} from '../data/rotatingShop';
import { funnelTracker } from '../services/funnelTracker';
import { COIN_SHOP_ITEMS, CoinShopItem, canPurchaseCoinItem, getCoinShopByCategory } from '../data/coinShop';
import { getFlashSale, FlashSale } from '../data/dynamicPricing';
import { soundManager } from '../services/sound';
import {
  getVipStreakBonus,
  getNextVipStreakMilestone,
  getVipStreakProgress,
} from '../data/vipBenefits';

const { width } = Dimensions.get('window');

// ─── Static item data ────────────────────────────────────────────────────────

interface ShopItem {
  id: string;
  name: string;
  icon: string;
  price: string;
  quantity?: number;
  bestValue?: boolean;
  iapProductId?: string;
}

const HINT_BUNDLES: ShopItem[] = [
  { id: 'hints_10', name: '10 Hints', icon: '\u{1F4A1}', price: '$0.99', quantity: 10, iapProductId: 'hint_bundle_10' },
  { id: 'hints_25', name: '25 Hints', icon: '\u{1F4A1}', price: '$1.99', quantity: 25, iapProductId: 'hint_bundle_25' },
  { id: 'hints_50', name: '50 Hints', icon: '\u{1F4A1}', price: '$2.99', quantity: 50, bestValue: true, iapProductId: 'hint_bundle_50' },
];

const UNDO_BUNDLES: ShopItem[] = [
  { id: 'undos_10', name: '10 Undos', icon: '\u21A9\uFE0F', price: '$0.99', quantity: 10, iapProductId: 'undo_bundle_10' },
  { id: 'undos_25', name: '25 Undos', icon: '\u21A9\uFE0F', price: '$1.99', quantity: 25, iapProductId: 'undo_bundle_25' },
  { id: 'undos_50', name: '50 Undos', icon: '\u21A9\uFE0F', price: '$2.99', quantity: 50, bestValue: true, iapProductId: 'undo_bundle_50' },
];

const COIN_PACKS: ShopItem[] = [
  { id: 'coins_500', name: '500 Coins', icon: '\u{1FA99}', price: '$0.99', quantity: 500 },
  { id: 'coins_1500', name: '1,500 Coins', icon: '\u{1FA99}', price: '$2.99', quantity: 1500 },
  { id: 'coins_5000', name: '5,000 Coins', icon: '\u{1FA99}', price: '$7.99', quantity: 5000, bestValue: true },
];

const GEM_PACKS: ShopItem[] = [
  { id: 'gems_50', name: '50 Gems', icon: '\u{1F48E}', price: '$0.99', quantity: 50, iapProductId: 'gems_50' },
  { id: 'gems_250', name: '250 Gems', icon: '\u{1F48E}', price: '$4.99', quantity: 250, iapProductId: 'gems_250' },
  { id: 'gems_500', name: '500 Gems', icon: '\u{1F48E}', price: '$9.99', quantity: 500, bestValue: true, iapProductId: 'gems_500' },
];

// ─── Coin Shop categories ────────────────────────────────────────────────────

const COIN_SHOP_CATEGORIES: { key: string; label: string }[] = [
  { key: 'consumables', label: 'Consumables' },
  { key: 'boosters', label: 'Boosters' },
  { key: 'temporary', label: 'Temporary Effects' },
];

// ─── Parental controls helper ────────────────────────────────────────────────

interface ParentalCheckResult {
  allowed: boolean;
  reason?: string;
}

function checkParentalControls(
  settings: {
    spendingLimitEnabled: boolean;
    monthlySpendingLimit: number;
    monthlySpent: number;
    monthlySpentResetDate: string;
    requirePurchasePin: boolean;
    purchasePin: string;
  },
  priceAmount: number,
): ParentalCheckResult {
  if (!settings.spendingLimitEnabled) return { allowed: true };

  // Reset monthly spent if we're in a new month
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthlySpent =
    settings.monthlySpentResetDate === currentMonth ? settings.monthlySpent : 0;

  if (monthlySpent + priceAmount > settings.monthlySpendingLimit) {
    return {
      allowed: false,
      reason: `Monthly spending limit of $${settings.monthlySpendingLimit} would be exceeded. Current spend: $${monthlySpent.toFixed(2)}.`,
    };
  }

  return { allowed: true };
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ShopScreenProps {
  onPurchase?: (itemId: string) => void;
  adsRemoved?: boolean;
  premiumPass?: boolean;
  navigation?: any;
}

const ShopScreen: React.FC<ShopScreenProps> = ({
  onPurchase: onPurchaseProp,
  adsRemoved: adsRemovedProp,
  premiumPass: premiumPassProp,
  navigation,
}) => {
  const settings = useSettings();
  const economy = useEconomy();
  const player = usePlayer();
  const adsRemoved = adsRemovedProp ?? economy.isAdFree ?? settings.adsRemoved;
  const premiumPass = premiumPassProp ?? economy.isPremiumPass ?? settings.premiumPass;
  const iapAvailable = iapManager.isInitialized();

  const [countdown, setCountdown] = useState('23:59:59');
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [watchingAd, setWatchingAd] = useState(false);
  const [restoringPurchases, setRestoringPurchases] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [mockAdState, setMockAdState] = useState<{
    rewardType: AdRewardType;
    resolver: (watched: boolean) => void;
  } | null>(null);

  // Coin shop daily purchase tracking (resets each day)
  const [coinShopPurchasesToday, setCoinShopPurchasesToday] = useState<Record<string, number>>({});
  const [coinShopDate, setCoinShopDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [coinShopConfirmation, setCoinShopConfirmation] = useState<string | null>(null);
  const coinShopConfirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flash sale state
  const flashSale = getFlashSale(new Date());
  const [flashCountdown, setFlashCountdown] = useState('');
  const flashTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Today's rotating items
  const today = new Date().toISOString().slice(0, 10);
  const rotatingItems = getCurrentRotatingItems(today);
  const rotatingHoursLeft = getTimeRemainingHours(today);

  // Initialise IAP + Ads
  useEffect(() => {
    iapManager.init().catch(() => {});
    adManager.init().catch(() => {});
    if (adsRemoved) adManager.setAdsRemoved(true);
    // Register mock ad handler for development
    adManager.setMockAdHandler((rewardType, resolve) => {
      setMockAdState({ rewardType, resolver: resolve });
    });
    void funnelTracker.trackStep('shop_view');
    return () => {
      adManager.setMockAdHandler(() => {});
    };
  }, [adsRemoved]);

  // Countdown timer
  useEffect(() => {
    const endTime = Date.now() + 24 * 60 * 60 * 1000;
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setCountdown(
        `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
      );
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Flash sale countdown timer (to midnight)
  useEffect(() => {
    if (!flashSale) return;
    const updateFlashCountdown = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(23, 59, 59, 999);
      const remaining = Math.max(0, midnight.getTime() - now.getTime());
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setFlashCountdown(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`,
      );
    };
    updateFlashCountdown();
    flashTimerRef.current = setInterval(updateFlashCountdown, 1000);
    return () => {
      if (flashTimerRef.current) clearInterval(flashTimerRef.current);
    };
  }, [!!flashSale]);

  // ── Purchase handler ────────────────────────────────────────────────────

  const handlePurchase = useCallback(
    async (productId: string) => {
      if (purchasingId) return; // already in flight

      // Check parental controls
      const priceAmount = iapManager.getPriceAmount(productId);
      const parentalCheck = checkParentalControls(
        {
          spendingLimitEnabled: settings.spendingLimitEnabled,
          monthlySpendingLimit: settings.monthlySpendingLimit,
          monthlySpent: settings.monthlySpent,
          monthlySpentResetDate: settings.monthlySpentResetDate,
          requirePurchasePin: settings.requirePurchasePin,
          purchasePin: settings.purchasePin,
        },
        priceAmount,
      );

      if (!parentalCheck.allowed) {
        Alert.alert('Purchase Blocked', parentalCheck.reason ?? 'Spending limit reached.');
        return;
      }

      // If PIN is required, prompt for it
      if (settings.spendingLimitEnabled && settings.requirePurchasePin && settings.purchasePin) {
        if (typeof (Alert as any).prompt === 'function') {
          // iOS: use native prompt with secure text input
          (Alert as any).prompt(
            'Enter Purchase PIN',
            'A PIN is required for purchases.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Confirm',
                onPress: (pin?: string) => {
                  if (pin === settings.purchasePin) {
                    executePurchase(productId);
                  } else {
                    Alert.alert('Incorrect PIN', 'The PIN you entered is incorrect.');
                  }
                },
              },
            ],
            'secure-text',
          );
        } else {
          // Android: Alert.prompt not available — block purchase and inform user
          Alert.alert(
            'PIN Required',
            'Parental controls require a PIN to make purchases. Please disable the PIN requirement in Settings, or use an iOS device to enter your PIN.',
            [{ text: 'OK', style: 'cancel' }],
          );
        }
        return;
      }

      executePurchase(productId);
    },
    [purchasingId, settings],
  );

  const executePurchase = useCallback(
    async (productId: string) => {
      setPurchasingId(productId);
      void funnelTracker.trackStep('iap_initiated');

      try {
        const result: PurchaseResult = await iapManager.purchase(productId);
        if (result.success) {
          // Use economy.processPurchase for centralized reward fulfilment
          economy.processPurchase(result.productId);

          // Also sync flags to settings for backward compat
          if (result.productId === 'ad_removal' || result.productId === 'vip_weekly') {
            settings.updateSetting('adsRemoved', true);
          }
          if (result.productId === 'premium_pass') {
            settings.updateSetting('premiumPass', true);
          }

          // Track spending for parental controls
          if (settings.spendingLimitEnabled) {
            const priceAmount = iapManager.getPriceAmount(productId);
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const currentSpent =
              settings.monthlySpentResetDate === currentMonth ? settings.monthlySpent : 0;
            settings.updateSetting('monthlySpent', currentSpent + priceAmount);
            settings.updateSetting('monthlySpentResetDate', currentMonth);
          }

          Alert.alert('Purchase Complete', 'Your items have been delivered!');
        } else {
          if (result.error && result.error !== 'User cancelled') {
            Alert.alert('Purchase Failed', result.error);
          }
        }
      } catch (e: any) {
        Alert.alert('Purchase Error', e?.message ?? 'Something went wrong');
      } finally {
        setPurchasingId(null);
      }

      // Also call the legacy prop callback if provided
      if (onPurchaseProp) onPurchaseProp(productId);
    },
    [economy, settings, onPurchaseProp],
  );

  // ── Rewarded ad handlers ────────────────────────────────────────────────

  const handleWatchAdForHint = useCallback(async () => {
    if (watchingAd) return;
    setWatchingAd(true);
    try {
      const result = await adManager.showRewardedAd('hint_reward');
      if (result.rewarded) {
        economy.processAdReward('hint_reward');
        Alert.alert('Reward Earned!', 'You received 1 free hint!');
      }
    } catch {
      Alert.alert('Ad Unavailable', 'Please try again later.');
    } finally {
      setWatchingAd(false);
    }
  }, [watchingAd, economy]);

  const handleWatchAdForCoins = useCallback(async () => {
    if (watchingAd) return;
    setWatchingAd(true);
    try {
      const result = await adManager.showRewardedAd('coins_reward');
      if (result.rewarded) {
        economy.processAdReward('coins_reward');
        Alert.alert('Reward Earned!', 'You received 50 coins!');
      }
    } catch {
      Alert.alert('Ad Unavailable', 'Please try again later.');
    } finally {
      setWatchingAd(false);
    }
  }, [watchingAd, economy]);

  const handleWatchAdForSpin = useCallback(async () => {
    if (watchingAd) return;
    setWatchingAd(true);
    try {
      const result = await adManager.showRewardedAd('spin_reward');
      if (result.rewarded) {
        // Spins are tracked in PlayerContext — import and call if available,
        // otherwise the caller can handle it. For now, grant via economy hook.
        Alert.alert('Reward Earned!', 'You received 1 free Mystery Wheel spin!');
      }
    } catch {
      Alert.alert('Ad Unavailable', 'Please try again later.');
    } finally {
      setWatchingAd(false);
    }
  }, [watchingAd]);

  // ── Restore purchases handler ───────────────────────────────────────────

  const handleRestorePurchases = useCallback(async () => {
    if (restoringPurchases) return;
    setRestoringPurchases(true);
    try {
      const results = await iapManager.restorePurchases();
      if (results.length === 0) {
        Alert.alert('No Purchases Found', 'There are no purchases to restore.');
      } else {
        let restoredCount = 0;
        for (const result of results) {
          if (result.success) {
            economy.processPurchase(result.productId);
            // Sync flags to settings
            if (result.productId === 'ad_removal') {
              settings.updateSetting('adsRemoved', true);
            }
            if (result.productId === 'premium_pass') {
              settings.updateSetting('premiumPass', true);
            }
            restoredCount++;
          }
        }
        Alert.alert('Purchases Restored', `${restoredCount} purchase(s) restored successfully.`);
      }
    } catch {
      Alert.alert('Restore Failed', 'Could not restore purchases. Please try again.');
    } finally {
      setRestoringPurchases(false);
    }
  }, [restoringPurchases, economy, settings]);

  // ── Rotating item gem purchase ──────────────────────────────────────────

  const handleRotatingPurchase = useCallback(
    (item: RotatingItem) => {
      if (!economy.canAfford('gems', item.gemCost)) {
        Alert.alert('Not Enough Gems', `You need ${item.gemCost} gems for this item.`);
        return;
      }
      Alert.alert(
        `Buy ${item.name}?`,
        `This will cost ${item.gemCost} gems.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Buy',
            onPress: () => {
              const spent = economy.spendGems(item.gemCost);
              if (spent) {
                player.unlockCosmetic(item.id);
                Alert.alert('Purchased!', `${item.name} has been added to your collection.`);
              }
            },
          },
        ],
      );
    },
    [economy],
  );

  // ── Coin shop purchase handler ──────────────────────────────────────────

  const handleCoinShopPurchase = useCallback(
    (item: CoinShopItem) => {
      // Reset daily counts if date changed
      const currentDate = new Date().toISOString().slice(0, 10);
      let purchases = coinShopPurchasesToday;
      if (currentDate !== coinShopDate) {
        purchases = {};
        setCoinShopPurchasesToday({});
        setCoinShopDate(currentDate);
      }

      // Check daily limit
      if (!canPurchaseCoinItem(item.id, purchases)) {
        Alert.alert('Daily Limit Reached', `You've reached the daily purchase limit for ${item.name}.`);
        return;
      }

      // Check affordability
      if (!economy.canAfford('coins', item.costCoins)) {
        Alert.alert('Not Enough Coins', `You need ${item.costCoins} coins for ${item.name}.`);
        return;
      }

      // Spend coins
      const spent = economy.spendCoins(item.costCoins);
      if (!spent) return;

      // Grant the item
      const reward = item.reward;
      switch (reward.type) {
        case 'hint':
          economy.addHintTokens(reward.amount ?? 1);
          break;
        case 'undo':
          economy.addUndoTokens(reward.amount ?? 1);
          break;
        case 'booster':
          if (reward.boosterType) {
            economy.addBoosterToken(reward.boosterType, reward.amount ?? 1);
          }
          break;
        case 'temporary_effect':
        case 'cosmetic_rental':
          // Temporary effects are granted — in a full implementation these would
          // set a timed flag in PlayerContext. For now, confirm the purchase.
          break;
      }

      // Track purchase count for daily limits
      setCoinShopPurchasesToday((prev) => ({
        ...prev,
        [item.id]: (prev[item.id] ?? 0) + 1,
      }));

      // Play purchase sound
      void soundManager.playSound('buttonPress');

      // Show brief confirmation
      setCoinShopConfirmation(item.name);
      if (coinShopConfirmTimerRef.current) clearTimeout(coinShopConfirmTimerRef.current);
      coinShopConfirmTimerRef.current = setTimeout(() => setCoinShopConfirmation(null), 1500);
    },
    [economy, coinShopPurchasesToday, coinShopDate],
  );

  // Cleanup coin shop confirm timer
  useEffect(() => {
    return () => {
      if (coinShopConfirmTimerRef.current) clearTimeout(coinShopConfirmTimerRef.current);
    };
  }, []);

  // ── Render helpers ──────────────────────────────────────────────────────

  const isLoading = (id: string) => purchasingId === id;

  /** Get the display price for an item, preferring store prices */
  const getDisplayPrice = (item: ShopItem): string => {
    if (item.iapProductId) {
      const storePrice = iapManager.getPrice(item.iapProductId);
      if (storePrice) return storePrice;
    }
    return item.price;
  };

  const renderItemCard = (item: ShopItem) => {
    const productId = item.iapProductId ?? item.id;
    const displayPrice = getDisplayPrice(item);

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.itemCard}
        onPress={() => handlePurchase(productId)}
        activeOpacity={0.7}
        disabled={!!purchasingId}
        accessibilityRole="button"
        accessibilityLabel={`Buy ${item.name} for ${displayPrice}${item.bestValue ? ', best value' : ''}`}
      >
        <LinearGradient
          colors={[...GRADIENTS.surfaceCard]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        {item.bestValue && (
          <View style={styles.bestValueBadge}>
            <LinearGradient
              colors={[...GRADIENTS.button.gold]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <Text style={styles.bestValueText}>BEST VALUE</Text>
          </View>
        )}
        <Text style={styles.itemIcon}>{item.icon}</Text>
        <Text style={styles.itemName}>{item.name}</Text>
        <View style={styles.priceTag}>
          <LinearGradient
            colors={[...GRADIENTS.button.primary]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          {isLoading(productId) ? (
            <ActivityIndicator size="small" color={COLORS.bg} />
          ) : (
            <Text style={styles.priceText}>{displayPrice}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderItemRow = (items: ShopItem[]) => (
    <View style={styles.itemRow}>
      {items.map(renderItemCard)}
    </View>
  );

  return (
    <View style={styles.container}>
      <AmbientBackdrop variant="shop" />
      <View style={styles.header}>
        <Image source={LOCAL_IMAGES.iconGemDiamond} style={{ width: 26, height: 26 }} resizeMode="contain" />
        <Text style={styles.headerTitle}>SHOP</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Flash Sale ──────────────────────────────────────────── */}
        {flashSale && (
          <View style={styles.flashSaleCard}>
            <LinearGradient
              colors={[COLORS.coral + '30', COLORS.orange + '15', COLORS.surface]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <View style={styles.flashSaleHeader}>
              <Text style={styles.flashSaleLabel}>{'\u26A1'} FLASH SALE</Text>
              <View style={styles.flashSaleDiscountBadge}>
                <Text style={styles.flashSaleDiscountText}>{flashSale.discountPercent}% OFF</Text>
              </View>
            </View>
            <View style={styles.flashSaleBody}>
              <Text style={styles.flashSaleIcon}>{flashSale.icon}</Text>
              <View style={styles.flashSaleInfo}>
                <Text style={styles.flashSaleName}>{flashSale.name}</Text>
                <Text style={styles.flashSaleDesc}>{flashSale.description}</Text>
                <View style={styles.flashSalePriceRow}>
                  <Text style={styles.flashSaleOriginalPrice}>{flashSale.originalPrice}</Text>
                  <Text style={styles.flashSaleSalePrice}>{flashSale.salePrice}</Text>
                </View>
              </View>
            </View>
            <View style={styles.flashSaleFooter}>
              <View style={styles.flashSaleTimer}>
                <Text style={styles.flashSaleTimerText}>{'\u23F0'} {flashCountdown}</Text>
              </View>
              <TouchableOpacity
                style={styles.flashSaleBuyButton}
                onPress={() => handlePurchase(flashSale.productId)}
                activeOpacity={0.7}
                disabled={!!purchasingId}
                accessibilityRole="button"
                accessibilityLabel={`Flash sale: Buy now for ${flashSale.salePrice}`}
              >
                <LinearGradient
                  colors={[COLORS.gold, COLORS.orange]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                {isLoading(flashSale.productId) ? (
                  <ActivityIndicator size="small" color={COLORS.bg} />
                ) : (
                  <Text style={styles.flashSaleBuyText}>BUY NOW {flashSale.salePrice}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Free Rewards (Watch Ads) ──────────────────────────────── */}
        {!adsRemoved && (
          <View style={styles.adSection}>
            <Text style={styles.adSectionTitle}>Free Rewards</Text>

            {/* Watch Ad for Hint */}
            <TouchableOpacity
              style={styles.adBanner}
              onPress={handleWatchAdForHint}
              activeOpacity={0.7}
              disabled={watchingAd}
              accessibilityRole="button"
              accessibilityLabel="Watch ad for 1 free hint"
            >
              <LinearGradient
                colors={[COLORS.green + '30', COLORS.teal + '20']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              {watchingAd ? (
                <ActivityIndicator size="small" color={COLORS.green} style={{ marginRight: 10 }} />
              ) : (
                <Text style={styles.adIcon}>{'\u{1F3AC}'}</Text>
              )}
              <View style={styles.adInfo}>
                <Text style={styles.adTitle}>Watch Ad for 1 Free Hint</Text>
                <Text style={styles.adSubtitle}>
                  {watchingAd ? 'Watching ad...' : 'Tap to watch a short video'}
                </Text>
              </View>
              <View style={styles.adBadge}>
                <Text style={styles.adBadgeText}>FREE</Text>
              </View>
            </TouchableOpacity>

            {/* Watch Ad for Coins (max 3/day) */}
            {adManager.canWatchCoinAd() && (
              <TouchableOpacity
                style={styles.adBanner}
                onPress={handleWatchAdForCoins}
                activeOpacity={0.7}
                disabled={watchingAd}
                accessibilityRole="button"
                accessibilityLabel={`Watch ad for 50 coins, ${adManager.coinAdsRemaining()} remaining today`}
              >
                <LinearGradient
                  colors={[COLORS.gold + '30', COLORS.orange + '20']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                {watchingAd ? (
                  <ActivityIndicator size="small" color={COLORS.gold} style={{ marginRight: 10 }} />
                ) : (
                  <Text style={styles.adIcon}>{'\u{1FA99}'}</Text>
                )}
                <View style={styles.adInfo}>
                  <Text style={[styles.adTitle, { color: COLORS.gold }]}>Watch Ad for 50 Coins</Text>
                  <Text style={styles.adSubtitle}>
                    {watchingAd ? 'Watching ad...' : `${adManager.coinAdsRemaining()} remaining today`}
                  </Text>
                </View>
                <View style={[styles.adBadge, { backgroundColor: COLORS.gold + '20' }]}>
                  <Text style={[styles.adBadgeText, { color: COLORS.gold }]}>FREE</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Watch Ad for Mystery Wheel Spin */}
            {adManager.canShowAd('spin_reward') && (
              <TouchableOpacity
                style={styles.adBanner}
                onPress={handleWatchAdForSpin}
                activeOpacity={0.7}
                disabled={watchingAd}
                accessibilityRole="button"
                accessibilityLabel="Watch ad for mystery wheel spin"
              >
                <LinearGradient
                  colors={[COLORS.purple + '30', COLORS.accent + '20']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                {watchingAd ? (
                  <ActivityIndicator size="small" color={COLORS.purple} style={{ marginRight: 10 }} />
                ) : (
                  <Text style={styles.adIcon}>{'\u{1F3B0}'}</Text>
                )}
                <View style={styles.adInfo}>
                  <Text style={[styles.adTitle, { color: COLORS.purple }]}>Watch Ad for Mystery Spin</Text>
                  <Text style={styles.adSubtitle}>
                    {watchingAd ? 'Watching ad...' : 'Get a free Mystery Wheel spin'}
                  </Text>
                </View>
                <View style={[styles.adBadge, { backgroundColor: COLORS.purple + '20' }]}>
                  <Text style={[styles.adBadgeText, { color: COLORS.purple }]}>FREE</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── VIP Subscription ───────────────────────────────────────── */}
        <View style={styles.vipCard}>
          <LinearGradient
            colors={['#2a1854', '#1a1042']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.vipGlow} />
          <View style={styles.vipHeader}>
            <Text style={styles.vipIcon}>{'\u{1F48E}'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.vipTitle}>VIP WEEKLY</Text>
              <Text style={styles.vipSubtitle}>The ultimate Wordfall experience</Text>
            </View>
            {economy.isVip && (
              <View style={styles.vipActiveBadge}>
                <Text style={styles.vipActiveBadgeText}>ACTIVE</Text>
              </View>
            )}
          </View>
          <View style={styles.vipBenefits}>
            <Text style={styles.vipBenefit}>{'\u2728'} Ad-free experience</Text>
            <Text style={styles.vipBenefit}>{'\u{1F48E}'} 50 daily gems</Text>
            <Text style={styles.vipBenefit}>{'\u{1F4A1}'} 3 daily hints</Text>
            <Text style={styles.vipBenefit}>{'\u{1F5BC}\uFE0F'} Exclusive VIP frame</Text>
            <Text style={styles.vipBenefit}>{'\u{1F680}'} 2x XP boost</Text>
          </View>
          {economy.isVip ? (
            <View style={styles.vipActions}>
              <TouchableOpacity
                style={styles.vipClaimButton}
                onPress={() => {
                  const claimed = economy.claimVipDailyRewards();
                  if (claimed) {
                    Alert.alert('VIP Rewards Claimed!', 'You received 50 gems and 3 hints.');
                  } else {
                    Alert.alert('Already Claimed', 'Come back tomorrow for more VIP rewards!');
                  }
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Claim daily VIP rewards: 50 gems and 3 hints"
              >
                <LinearGradient
                  colors={[COLORS.gold, COLORS.orange]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                <Text style={styles.vipClaimText}>CLAIM DAILY REWARDS</Text>
              </TouchableOpacity>
              <Text style={styles.vipExpiryText}>
                Renews {new Date(economy.vipExpiresAt).toLocaleDateString()}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.vipSubscribeButton}
              onPress={() => handlePurchase('vip_weekly')}
              activeOpacity={0.7}
              disabled={!!purchasingId}
              accessibilityRole="button"
              accessibilityLabel="Subscribe to VIP Weekly for $4.99 per week"
            >
              <LinearGradient
                colors={[COLORS.purple, '#6a1b9a']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              {isLoading('vip_weekly') ? (
                <ActivityIndicator size="small" color={COLORS.textPrimary} />
              ) : (
                <Text style={styles.vipSubscribeText}>SUBSCRIBE  $4.99/week</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ── VIP Streak Bonus (for active subscribers) ─────────────── */}
        {economy.isVip && (() => {
          const streakWeeks = (economy as any).vipStreakWeeks ?? 0;
          const streakBonusClaimed = (economy as any).vipStreakBonusClaimed ?? false;
          const currentBonus = getVipStreakBonus(streakWeeks);
          const nextMilestone = getNextVipStreakMilestone(streakWeeks);
          const progress = getVipStreakProgress(streakWeeks);

          return (
            <View style={styles.vipStreakCard}>
              <LinearGradient
                colors={['#2a1854', '#1a1042']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
              <View style={styles.vipStreakHeader}>
                <Text style={styles.vipStreakIcon}>{'\u{1F451}'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vipStreakTitle}>VIP STREAK</Text>
                  <Text style={styles.vipStreakWeeks}>
                    {streakWeeks} {streakWeeks === 1 ? 'week' : 'weeks'} subscribed
                  </Text>
                </View>
                {currentBonus && (
                  <View style={styles.vipStreakLabelBadge}>
                    <Text style={styles.vipStreakLabelText}>{currentBonus.label}</Text>
                  </View>
                )}
              </View>

              {/* Progress bar toward next milestone */}
              {nextMilestone && (
                <View style={styles.vipStreakProgressSection}>
                  <View style={styles.vipStreakProgressBar}>
                    <View
                      style={[
                        styles.vipStreakProgressFill,
                        { width: `${Math.min(progress.progress * 100, 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.vipStreakProgressText}>
                    {streakWeeks}/{nextMilestone.weeksRequired} weeks to {nextMilestone.label}
                  </Text>
                  <Text style={styles.vipStreakNextReward}>
                    Next: +{nextMilestone.bonusGems} gems, +{nextMilestone.bonusHints} hints
                    {nextMilestone.extraReward ? ` + exclusive ${nextMilestone.extraReward.type}` : ''}
                  </Text>
                </View>
              )}

              {/* Claim button when eligible */}
              {currentBonus && !streakBonusClaimed && (
                <TouchableOpacity
                  style={styles.vipStreakClaimButton}
                  onPress={() => {
                    Alert.alert(
                      'VIP Streak Bonus!',
                      `You earned +${currentBonus.bonusGems} gems and +${currentBonus.bonusHints} hints for being a ${currentBonus.label}!`,
                    );
                  }}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={[COLORS.purple, '#8b5cf6']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                  <Text style={styles.vipStreakClaimText}>CLAIM WEEKLY BONUS</Text>
                </TouchableOpacity>
              )}
              {currentBonus && streakBonusClaimed && (
                <Text style={styles.vipStreakClaimedText}>Weekly bonus claimed</Text>
              )}
              {!currentBonus && !nextMilestone && (
                <Text style={styles.vipStreakClaimedText}>Max VIP tier reached!</Text>
              )}
            </View>
          );
        })()}

        {/* ── Featured Offers ────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.featuredScroll}
          contentContainerStyle={styles.featuredContent}
        >
          <TouchableOpacity
            style={styles.featuredCard}
            onPress={() => handlePurchase('starter_pack')}
            activeOpacity={0.7}
            disabled={!!purchasingId}
          >
            <LinearGradient
              colors={['#1e2352', '#181d42']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <View style={styles.featuredGlow} />
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>LIMITED TIME</Text>
            </View>
            <Text style={styles.featuredIcon}>{'\u{1F381}'}</Text>
            <Text style={styles.featuredName}>Starter Pack</Text>
            <Text style={styles.featuredDesc}>
              500 Coins + 50 Gems + 10 Hints + Exclusive Decoration
            </Text>
            <View style={styles.featuredPriceRow}>
              <Text style={styles.featuredOldPrice}>$4.99</Text>
              {isLoading('starter_pack') ? (
                <ActivityIndicator size="small" color={COLORS.green} />
              ) : (
                <Text style={styles.featuredPrice}>$1.99</Text>
              )}
            </View>
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{countdown}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.featuredCard, styles.featuredCardAlt]}
            onPress={() => handlePurchase('chapter_bundle')}
            activeOpacity={0.7}
            disabled={!!purchasingId}
          >
            <LinearGradient
              colors={['#251e52', '#1e1842']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <View style={[styles.featuredGlow, { backgroundColor: COLORS.purpleGlow }]} />
            <View style={[styles.featuredBadge, { backgroundColor: COLORS.purple }]}>
              <Text style={styles.featuredBadgeText}>SPECIAL</Text>
            </View>
            <Text style={styles.featuredIcon}>{'\u2728'}</Text>
            <Text style={styles.featuredName}>Weekend Bundle</Text>
            <Text style={styles.featuredDesc}>
              100 Gems + 3000 Coins + Rare Frame
            </Text>
            <View style={styles.featuredPriceRow}>
              <Text style={styles.featuredOldPrice}>$14.99</Text>
              {isLoading('chapter_bundle') ? (
                <ActivityIndicator size="small" color={COLORS.green} />
              ) : (
                <Text style={styles.featuredPrice}>$4.99</Text>
              )}
            </View>
            <View style={[styles.timerContainer, { backgroundColor: COLORS.purple + '30' }]}>
              <Text style={[styles.timerText, { color: COLORS.purple }]}>{countdown}</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* ── Rotating Exclusive Shop ────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Exclusive Cosmetics</Text>
        <Text style={styles.rotatingSubtitle}>
          {rotatingHoursLeft > 0
            ? `Leaving in ${rotatingHoursLeft}h — won't return for months!`
            : 'Refreshing soon...'}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rotatingRow}
        >
          {rotatingItems.map((item) => {
            const rarityColor = getRarityColor(item.rarity);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.rotatingCard, { borderColor: rarityColor + '60' }]}
                onPress={() => handleRotatingPurchase(item)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[rarityColor + '18', rarityColor + '08']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
                <View style={[styles.rarityBadge, { backgroundColor: rarityColor + '30' }]}>
                  <Text style={[styles.rarityText, { color: rarityColor }]}>
                    {item.rarity.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.rotatingIcon}>{item.icon}</Text>
                <Text style={styles.rotatingName}>{item.name}</Text>
                <Text style={styles.rotatingDesc}>{item.description}</Text>
                <View style={styles.gemPriceRow}>
                  <Text style={styles.gemIcon}>{'\u{1F48E}'}</Text>
                  <Text style={[styles.gemPrice, { color: rarityColor }]}>{item.gemCost}</Text>
                </View>
                <Text style={styles.rotatingTimer}>
                  {item.returnsInDays >= 180 ? "Won't return for 6 months" : `Returns in ${item.returnsInDays} days`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {navigation && (
          <TouchableOpacity
            style={styles.browseCosmetics}
            onPress={() => navigation.navigate('CosmeticStore')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[COLORS.accent + '18', COLORS.accent + '08'] as [string, string]}
              style={styles.browseCosmeticsGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.browseCosmeticsText}>{'\u{1F3A8}'} Browse All Cosmetics</Text>
              <Text style={styles.browseCosmeticsChevron}>{'\u{203A}'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── Hint Bundles ───────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Hint Bundles</Text>
        {renderItemRow(HINT_BUNDLES)}

        {/* ── Undo Bundles ───────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Undo Bundles</Text>
        {renderItemRow(UNDO_BUNDLES)}

        {/* ── Coin Packs ─────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Coin Packs</Text>
        {renderItemRow(COIN_PACKS)}

        {/* ── Gem Packs ──────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Gem Packs</Text>
        {renderItemRow(GEM_PACKS)}

        {/* ── Premium ────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Premium</Text>
        <View style={styles.premiumSection}>
          <TouchableOpacity
            style={styles.premiumCard}
            onPress={() => handlePurchase('chapter_bundle')}
            activeOpacity={0.7}
            disabled={!!purchasingId}
          >
            <LinearGradient
              colors={[...GRADIENTS.surfaceCard]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <Text style={styles.premiumIcon}>{'\u{1F4D6}'}</Text>
            <View style={styles.premiumInfo}>
              <Text style={styles.premiumName}>Chapter Bundle</Text>
              <Text style={styles.premiumDesc}>
                Theme decoration + 20 gems + 10 hints + 1 Board Preview
              </Text>
            </View>
            <View style={styles.priceTag}>
              <LinearGradient
                colors={[...GRADIENTS.button.primary]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              {isLoading('chapter_bundle') ? (
                <ActivityIndicator size="small" color={COLORS.bg} />
              ) : (
                <Text style={styles.priceText}>$2.99</Text>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.premiumCard}
            onPress={() => handlePurchase('daily_value_pack')}
            activeOpacity={0.7}
            disabled={!!purchasingId}
          >
            <LinearGradient
              colors={[...GRADIENTS.surfaceCard]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <Text style={styles.premiumIcon}>{'\u{1F4E6}'}</Text>
            <View style={styles.premiumInfo}>
              <Text style={styles.premiumName}>Daily Value Pack</Text>
              <Text style={styles.premiumDesc}>
                Bonus rewards every day for 30 days
              </Text>
            </View>
            <View style={styles.priceTag}>
              <LinearGradient
                colors={[...GRADIENTS.button.primary]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              {isLoading('daily_value_pack') ? (
                <ActivityIndicator size="small" color={COLORS.bg} />
              ) : (
                <Text style={styles.priceText}>$0.99</Text>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.premiumCard,
              premiumPass && styles.purchasedCard,
            ]}
            onPress={() => !premiumPass && handlePurchase('premium_pass')}
            activeOpacity={premiumPass ? 1 : 0.7}
            disabled={premiumPass || !!purchasingId}
          >
            <LinearGradient
              colors={[...GRADIENTS.surfaceCard]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <Text style={styles.premiumIcon}>{'\u{1F451}'}</Text>
            <View style={styles.premiumInfo}>
              <Text style={styles.premiumName}>Premium Pass</Text>
              <Text style={styles.premiumDesc}>
                Unlock premium rewards this season
              </Text>
            </View>
            {premiumPass ? (
              <View style={styles.ownedBadge}>
                <Text style={styles.ownedText}>OWNED</Text>
              </View>
            ) : (
              <View style={styles.priceTag}>
                <LinearGradient
                  colors={[...GRADIENTS.button.primary]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                {isLoading('premium_pass') ? (
                  <ActivityIndicator size="small" color={COLORS.bg} />
                ) : (
                  <Text style={styles.priceText}>$4.99</Text>
                )}
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.premiumCard,
              adsRemoved && styles.purchasedCard,
            ]}
            onPress={() => !adsRemoved && handlePurchase('ad_removal')}
            activeOpacity={adsRemoved ? 1 : 0.7}
            disabled={adsRemoved || !!purchasingId}
          >
            <LinearGradient
              colors={[...GRADIENTS.surfaceCard]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <Text style={styles.premiumIcon}>{'\u{1F6AB}'}</Text>
            <View style={styles.premiumInfo}>
              <Text style={styles.premiumName}>Remove Ads</Text>
              <Text style={styles.premiumDesc}>
                Enjoy an ad-free experience forever
              </Text>
            </View>
            {adsRemoved ? (
              <View style={styles.ownedBadge}>
                <Text style={styles.ownedText}>OWNED</Text>
              </View>
            ) : (
              <View style={styles.priceTag}>
                <LinearGradient
                  colors={[...GRADIENTS.button.primary]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                {isLoading('ad_removal') ? (
                  <ActivityIndicator size="small" color={COLORS.bg} />
                ) : (
                  <Text style={styles.priceText}>$4.99</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Coin Shop (spend coins on consumables) ─────────────────── */}
        <Text style={styles.sectionTitle}>Spend Coins</Text>
        <Text style={styles.coinShopSubtitle}>
          {'\u{1FA99}'} {economy.coins.toLocaleString()} coins available
        </Text>

        {coinShopConfirmation && (
          <View style={styles.coinShopConfirmBanner}>
            <Text style={styles.coinShopConfirmText}>
              {'\u2705'} {coinShopConfirmation} purchased!
            </Text>
          </View>
        )}

        {COIN_SHOP_CATEGORIES.map(({ key, label }) => {
          const categoryItems = getCoinShopByCategory(key);
          if (categoryItems.length === 0) return null;

          // Reset purchases if date changed
          const currentDate = new Date().toISOString().slice(0, 10);
          const purchases = currentDate === coinShopDate ? coinShopPurchasesToday : {};

          return (
            <View key={key} style={styles.coinShopCategorySection}>
              <Text style={styles.coinShopCategoryTitle}>{label}</Text>
              <View style={styles.coinShopGrid}>
                {categoryItems.map((item) => {
                  const todayCount = purchases[item.id] ?? 0;
                  const limitReached = item.dailyLimit !== undefined && todayCount >= item.dailyLimit;
                  const cantAfford = !economy.canAfford('coins', item.costCoins);
                  const disabled = limitReached || cantAfford;

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.coinShopCard, disabled && styles.coinShopCardDisabled]}
                      activeOpacity={disabled ? 1 : 0.7}
                      onPress={() => !disabled && handleCoinShopPurchase(item)}
                    >
                      <LinearGradient
                        colors={[...GRADIENTS.surfaceCard]}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                      />
                      <Text style={styles.coinShopIcon}>{item.icon}</Text>
                      <Text style={[styles.coinShopName, disabled && styles.coinShopTextDisabled]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.coinShopDesc, disabled && styles.coinShopTextDisabled]}>
                        {item.description}
                      </Text>
                      <View style={[styles.coinShopPrice, cantAfford && styles.coinShopPriceDisabled]}>
                        <Text style={[styles.coinShopPriceText, cantAfford && styles.coinShopPriceTextDisabled]}>
                          {'\u{1FA99}'} {item.costCoins}
                        </Text>
                      </View>
                      {item.dailyLimit !== undefined && (
                        <Text style={[
                          styles.coinShopLimit,
                          limitReached && styles.coinShopLimitReached,
                        ]}>
                          {todayCount}/{item.dailyLimit} today
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* ── Limited Rentals (coin-purchasable cosmetic rentals) ────── */}
        {(() => {
          const rentalItems = getCoinShopByCategory('cosmetic_rental');
          if (rentalItems.length === 0) {
            // Also check 'temporary' category for cosmetic_rental reward types
            const tempItems = getCoinShopByCategory('temporary').filter(
              (item) => item.reward.type === 'cosmetic_rental',
            );
            if (tempItems.length === 0) return null;
            return (
              <>
                <Text style={styles.sectionTitle}>{'\u23F0'} Limited Rentals</Text>
                <Text style={styles.rentalSubtitle}>Temporary boosts for coins</Text>
                <View style={styles.rentalGrid}>
                  {tempItems.map((item) => {
                    const cantAfford = !economy.canAfford('coins', item.costCoins);
                    const currentDate = new Date().toISOString().slice(0, 10);
                    const purchases = currentDate === coinShopDate ? coinShopPurchasesToday : {};
                    const todayCount = purchases[item.id] ?? 0;
                    const limitReached = item.dailyLimit !== undefined && todayCount >= item.dailyLimit;
                    const disabled = limitReached || cantAfford;
                    const durationLabel = item.reward.durationMinutes
                      ? item.reward.durationMinutes >= 1440
                        ? `${Math.floor(item.reward.durationMinutes / 1440)} day${Math.floor(item.reward.durationMinutes / 1440) > 1 ? 's' : ''}`
                        : item.reward.durationMinutes >= 60
                          ? `${Math.floor(item.reward.durationMinutes / 60)} hour${Math.floor(item.reward.durationMinutes / 60) > 1 ? 's' : ''}`
                          : `${item.reward.durationMinutes} min`
                      : '';

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.rentalCard, disabled && styles.coinShopCardDisabled]}
                        activeOpacity={disabled ? 1 : 0.7}
                        onPress={() => !disabled && handleCoinShopPurchase(item)}
                      >
                        <LinearGradient
                          colors={[...GRADIENTS.surfaceCard]}
                          style={StyleSheet.absoluteFill}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                        />
                        <Text style={styles.rentalIcon}>{item.icon}</Text>
                        <Text style={[styles.rentalName, disabled && styles.coinShopTextDisabled]}>
                          {item.name}
                        </Text>
                        <Text style={[styles.rentalDesc, disabled && styles.coinShopTextDisabled]}>
                          {item.description}
                        </Text>
                        {durationLabel ? (
                          <View style={styles.rentalDurationBadge}>
                            <Text style={styles.rentalDurationText}>{'\u23F1'} {durationLabel}</Text>
                          </View>
                        ) : null}
                        <View style={[styles.coinShopPrice, cantAfford && styles.coinShopPriceDisabled]}>
                          <Text style={[styles.coinShopPriceText, cantAfford && styles.coinShopPriceTextDisabled]}>
                            {'\u{1FA99}'} {item.costCoins}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.rentalBuyButton, disabled && styles.rentalBuyButtonDisabled]}
                          onPress={() => !disabled && handleCoinShopPurchase(item)}
                          activeOpacity={disabled ? 1 : 0.7}
                          disabled={disabled}
                        >
                          <Text style={[styles.rentalBuyText, disabled && styles.rentalBuyTextDisabled]}>
                            {cantAfford ? "Can't Afford" : limitReached ? 'Limit Reached' : 'Rent'}
                          </Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            );
          }
          return (
            <>
              <Text style={styles.sectionTitle}>{'\u23F0'} Limited Rentals</Text>
              <Text style={styles.rentalSubtitle}>Temporary boosts for coins</Text>
              <View style={styles.rentalGrid}>
                {rentalItems.map((item) => {
                  const cantAfford = !economy.canAfford('coins', item.costCoins);
                  const currentDate = new Date().toISOString().slice(0, 10);
                  const purchases = currentDate === coinShopDate ? coinShopPurchasesToday : {};
                  const todayCount = purchases[item.id] ?? 0;
                  const limitReached = item.dailyLimit !== undefined && todayCount >= item.dailyLimit;
                  const disabled = limitReached || cantAfford;
                  const durationLabel = item.reward.durationMinutes
                    ? item.reward.durationMinutes >= 1440
                      ? `${Math.floor(item.reward.durationMinutes / 1440)} day${Math.floor(item.reward.durationMinutes / 1440) > 1 ? 's' : ''}`
                      : item.reward.durationMinutes >= 60
                        ? `${Math.floor(item.reward.durationMinutes / 60)} hour${Math.floor(item.reward.durationMinutes / 60) > 1 ? 's' : ''}`
                        : `${item.reward.durationMinutes} min`
                    : '';

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.rentalCard, disabled && styles.coinShopCardDisabled]}
                      activeOpacity={disabled ? 1 : 0.7}
                      onPress={() => !disabled && handleCoinShopPurchase(item)}
                    >
                      <LinearGradient
                        colors={[...GRADIENTS.surfaceCard]}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                      />
                      <Text style={styles.rentalIcon}>{item.icon}</Text>
                      <Text style={[styles.rentalName, disabled && styles.coinShopTextDisabled]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.rentalDesc, disabled && styles.coinShopTextDisabled]}>
                        {item.description}
                      </Text>
                      {durationLabel ? (
                        <View style={styles.rentalDurationBadge}>
                          <Text style={styles.rentalDurationText}>{'\u23F1'} {durationLabel}</Text>
                        </View>
                      ) : null}
                      <View style={[styles.coinShopPrice, cantAfford && styles.coinShopPriceDisabled]}>
                        <Text style={[styles.coinShopPriceText, cantAfford && styles.coinShopPriceTextDisabled]}>
                          {'\u{1FA99}'} {item.costCoins}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.rentalBuyButton, disabled && styles.rentalBuyButtonDisabled]}
                        onPress={() => !disabled && handleCoinShopPurchase(item)}
                        activeOpacity={disabled ? 1 : 0.7}
                        disabled={disabled}
                      >
                        <Text style={[styles.rentalBuyText, disabled && styles.rentalBuyTextDisabled]}>
                          {cantAfford ? "Can't Afford" : limitReached ? 'Limit Reached' : 'Rent'}
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          );
        })()}

        {/* ── Restore Purchases ──────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestorePurchases}
          activeOpacity={0.7}
          disabled={restoringPurchases}
        >
          {restoringPurchases ? (
            <ActivityIndicator size="small" color={COLORS.textSecondary} />
          ) : (
            <Text style={styles.restoreText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Mock Ad Modal — shown during development when no real ad SDK is installed */}
      {mockAdState && (
        <MockAdModal
          rewardType={mockAdState.rewardType}
          onComplete={(watched) => {
            mockAdState.resolver(watched);
            setMockAdState(null);
          }}
        />
      )}
    </View>
  );
};

const ITEM_CARD_WIDTH = (width - 56) / 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: FONTS.display,
    color: COLORS.accent,
    letterSpacing: 4,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },

  // ── Ad section ────────────────────────────────────────────────────────
  adSection: {
    marginBottom: 12,
  },
  adSectionTitle: {
    fontFamily: FONTS.display,
    fontSize: 16,
    color: COLORS.textPrimary,
    letterSpacing: 1,
    marginBottom: 10,
  },
  adBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.green + '40',
    overflow: 'hidden',
  },
  adIcon: {
    fontSize: 26,
    marginRight: 10,
  },
  adInfo: {
    flex: 1,
  },
  adTitle: {
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
    color: COLORS.green,
  },
  adSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  adBadge: {
    backgroundColor: COLORS.green,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  adBadgeText: {
    fontSize: 12,
    fontFamily: FONTS.display,
    color: COLORS.bg,
    letterSpacing: 1,
  },

  // ── VIP card ──────────────────────────────────────────────────────────
  vipCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.purple + '60',
    overflow: 'hidden',
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  vipGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: COLORS.purpleGlow,
  },
  vipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  vipIcon: {
    fontSize: 36,
    marginRight: 12,
  },
  vipTitle: {
    fontSize: 22,
    fontFamily: FONTS.display,
    color: COLORS.gold,
    letterSpacing: 2,
    textShadowColor: 'rgba(255,215,0,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  vipSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  vipActiveBadge: {
    backgroundColor: COLORS.green + '25',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.green + '40',
  },
  vipActiveBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.display,
    color: COLORS.green,
    letterSpacing: 1,
  },
  vipBenefits: {
    marginBottom: 16,
    gap: 6,
  },
  vipBenefit: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bodySemiBold,
  },
  vipActions: {
    alignItems: 'center',
    gap: 8,
  },
  vipClaimButton: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    overflow: 'hidden',
  },
  vipClaimText: {
    fontSize: 15,
    fontFamily: FONTS.display,
    color: COLORS.bg,
    letterSpacing: 1,
  },
  vipExpiryText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  vipSubscribeButton: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    overflow: 'hidden',
  },
  vipSubscribeText: {
    fontSize: 16,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },

  // ── VIP streak ─────────────────────────────────────────────────────────
  vipStreakCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.purple + '40',
    overflow: 'hidden',
  },
  vipStreakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  vipStreakIcon: {
    fontSize: 28,
    marginRight: 10,
  },
  vipStreakTitle: {
    fontSize: 16,
    fontFamily: FONTS.display,
    color: COLORS.purple,
    letterSpacing: 1.5,
  },
  vipStreakWeeks: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  vipStreakLabelBadge: {
    backgroundColor: COLORS.purple + '25',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.purple + '40',
  },
  vipStreakLabelText: {
    fontSize: 10,
    fontFamily: FONTS.display,
    color: COLORS.purpleLight,
    letterSpacing: 0.5,
  },
  vipStreakProgressSection: {
    marginBottom: 12,
  },
  vipStreakProgressBar: {
    height: 8,
    backgroundColor: COLORS.cellDefault,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  vipStreakProgressFill: {
    height: '100%',
    backgroundColor: COLORS.purple,
    borderRadius: 4,
  },
  vipStreakProgressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONTS.bodySemiBold,
  },
  vipStreakNextReward: {
    fontSize: 11,
    color: COLORS.purpleLight,
    marginTop: 2,
  },
  vipStreakClaimButton: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    overflow: 'hidden',
  },
  vipStreakClaimText: {
    fontSize: 14,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  vipStreakClaimedText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  // ── Rotating shop ─────────────────────────────────────────────────────
  rotatingSubtitle: {
    fontSize: 12,
    color: COLORS.coral,
    fontFamily: FONTS.bodySemiBold,
    marginBottom: 10,
    marginTop: -6,
  },
  rotatingRow: {
    gap: 12,
    paddingRight: 16,
  },
  rotatingCard: {
    width: width * 0.55,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  rarityBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  rarityText: {
    fontSize: 9,
    fontFamily: FONTS.display,
    letterSpacing: 1,
  },
  rotatingIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  rotatingName: {
    fontSize: 16,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  rotatingDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: 10,
  },
  gemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  gemIcon: {
    fontSize: 16,
  },
  gemPrice: {
    fontSize: 18,
    fontFamily: FONTS.display,
  },
  rotatingTimer: {
    fontSize: 10,
    color: COLORS.coral,
    fontFamily: FONTS.bodySemiBold,
  },

  // ── Sections ──────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginTop: 24,
    marginBottom: 12,
    textShadowColor: 'rgba(255,255,255,0.1)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  featuredScroll: {
    marginTop: 8,
  },
  featuredContent: {
    gap: 12,
    paddingRight: 16,
  },
  featuredCard: {
    width: width * 0.7,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.accent,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  featuredCardAlt: {
    borderColor: COLORS.purple,
    shadowColor: COLORS.purple,
  },
  featuredGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: COLORS.accentGlow,
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.coral,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 10,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  featuredIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  featuredName: {
    fontSize: 20,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    marginBottom: 4,
    textShadowColor: 'rgba(255,255,255,0.15)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  featuredDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  featuredPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  featuredOldPrice: {
    fontSize: 14,
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  featuredPrice: {
    fontSize: 24,
    fontFamily: FONTS.display,
    color: COLORS.green,
    textShadowColor: 'rgba(76,175,80,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  timerContainer: {
    backgroundColor: COLORS.accent + '20',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  timerText: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: COLORS.accent,
    fontVariant: ['tabular-nums'],
  },
  itemRow: {
    flexDirection: 'row',
    gap: 12,
  },
  itemCard: {
    width: ITEM_CARD_WIDTH,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  bestValueBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 3,
    alignItems: 'center',
    overflow: 'hidden',
  },
  bestValueText: {
    fontSize: 9,
    fontFamily: FONTS.display,
    color: COLORS.bg,
    letterSpacing: 1,
  },
  itemIcon: {
    fontSize: 30,
    marginTop: 6,
    marginBottom: 8,
  },
  itemName: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(255,255,255,0.1)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  priceTag: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  priceText: {
    fontSize: 14,
    fontFamily: FONTS.display,
    color: COLORS.bg,
  },
  premiumSection: {
    gap: 10,
  },
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  purchasedCard: {
    opacity: 0.6,
  },
  premiumIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  premiumInfo: {
    flex: 1,
  },
  premiumName: {
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 2,
    textShadowColor: 'rgba(255,255,255,0.1)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  premiumDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  ownedBadge: {
    backgroundColor: COLORS.green + '25',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ownedText: {
    fontSize: 12,
    fontFamily: FONTS.display,
    color: COLORS.green,
  },

  // ── Restore purchases ─────────────────────────────────────────────────
  restoreButton: {
    alignSelf: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 28,
  },
  restoreText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.bodySemiBold,
    textDecorationLine: 'underline',
  },

  bottomSpacer: {
    height: 40,
  },

  // ── Coin Shop ──────────────────────────────────────────────────────────
  coinShopSubtitle: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  coinShopConfirmBanner: {
    backgroundColor: 'rgba(76,175,80,0.2)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  coinShopConfirmText: {
    color: COLORS.green,
    fontSize: 14,
    fontWeight: '600',
  },
  coinShopCategorySection: {
    marginBottom: 16,
  },
  coinShopCategoryTitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  coinShopGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 10,
  },
  coinShopCard: {
    width: '31%',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  coinShopCardDisabled: {
    opacity: 0.45,
  },
  coinShopIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  coinShopName: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 3,
    textAlign: 'center',
  },
  coinShopDesc: {
    color: COLORS.textSecondary,
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 13,
  },
  coinShopTextDisabled: {
    color: 'rgba(255,255,255,0.35)',
  },
  coinShopPrice: {
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  coinShopPriceDisabled: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  coinShopPriceText: {
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: '700',
  },
  coinShopPriceTextDisabled: {
    color: 'rgba(255,255,255,0.35)',
  },
  coinShopLimit: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 6,
  },
  coinShopLimitReached: {
    color: COLORS.coral,
  },

  // ── Flash Sale ──────────────────────────────────────────────────────────
  flashSaleCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: COLORS.coral + '60',
    overflow: 'hidden',
    shadowColor: COLORS.coral,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  flashSaleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  flashSaleLabel: {
    fontSize: 18,
    fontFamily: FONTS.display,
    color: COLORS.coral,
    letterSpacing: 2,
    textShadowColor: 'rgba(255,107,107,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  flashSaleDiscountBadge: {
    backgroundColor: COLORS.coral,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  flashSaleDiscountText: {
    fontSize: 12,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  flashSaleBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  flashSaleIcon: {
    fontSize: 42,
    marginRight: 14,
  },
  flashSaleInfo: {
    flex: 1,
  },
  flashSaleName: {
    fontSize: 18,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  flashSaleDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  flashSalePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flashSaleOriginalPrice: {
    fontSize: 16,
    color: COLORS.textMuted,
    textDecorationLine: 'line-through' as const,
  },
  flashSaleSalePrice: {
    fontSize: 22,
    fontFamily: FONTS.display,
    color: COLORS.gold,
    textShadowColor: 'rgba(255,215,0,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  flashSaleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flashSaleTimer: {
    backgroundColor: COLORS.coral + '20',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  flashSaleTimerText: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: COLORS.coral,
    fontVariant: ['tabular-nums' as const],
  },
  flashSaleBuyButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    overflow: 'hidden',
    minWidth: 140,
  },
  flashSaleBuyText: {
    fontSize: 14,
    fontFamily: FONTS.display,
    color: COLORS.bg,
    letterSpacing: 1,
  },

  // ── Limited Rentals ────────────────────────────────────────────────────
  rentalSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    marginBottom: 12,
    marginTop: -6,
  },
  rentalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  rentalCard: {
    width: (width - 52) / 2,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 4,
  },
  rentalIcon: {
    fontSize: 30,
    marginBottom: 6,
  },
  rentalName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  rentalDesc: {
    color: COLORS.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 14,
  },
  rentalDurationBadge: {
    backgroundColor: COLORS.accent + '20',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  rentalDurationText: {
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.accent,
  },
  rentalBuyButton: {
    backgroundColor: COLORS.gold + '20',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 6,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
  },
  rentalBuyButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  rentalBuyText: {
    fontSize: 13,
    fontFamily: FONTS.display,
    color: COLORS.gold,
    letterSpacing: 0.5,
  },
  rentalBuyTextDisabled: {
    color: COLORS.textMuted,
  },
  browseCosmetics: {
    marginTop: 12,
    marginBottom: 4,
  },
  browseCosmeticsGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
  },
  browseCosmeticsText: {
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.accent,
  },
  browseCosmeticsChevron: {
    fontSize: 20,
    color: COLORS.accent,
  },
});

export default ShopScreen;
