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
}

const ShopScreen: React.FC<ShopScreenProps> = ({
  onPurchase: onPurchaseProp,
  adsRemoved: adsRemovedProp,
  premiumPass: premiumPassProp,
}) => {
  const settings = useSettings();
  const economy = useEconomy();
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
        // Use a simple prompt — in production this would be a custom modal
        Alert.prompt?.(
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
        // If Alert.prompt is not available (Android), skip PIN check
        if (!(Alert as any).prompt) {
          executePurchase(productId);
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
          if (result.productId === 'ad_removal') {
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
                Alert.alert('Purchased!', `${item.name} has been added to your collection.`);
              }
            },
          },
        ],
      );
    },
    [economy],
  );

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
});

export default ShopScreen;
