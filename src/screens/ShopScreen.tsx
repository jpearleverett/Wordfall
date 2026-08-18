import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  ViewStyle,
  StyleProp,
  ImageSourcePropType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, FONTS, SHADOWS, RADIUS } from '../constants';
import ScreenScaffold from '../components/common/ScreenScaffold';
import SectionHeader from '../components/common/SectionHeader';
import IconMedallion from '../components/common/IconMedallion';
import PrimaryButton from '../components/common/PrimaryButton';
import NeonProgressBar from '../components/common/NeonProgressBar';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { LOCAL_IMAGES } from '../utils/localAssets';
import LocalErrorBoundary from '../components/LocalErrorBoundary';
import type { CommercialEffectId } from '../services/commercialEntitlements';
import { useSettings } from '../contexts/SettingsContext';
import {
  useEconomyStore,
  useEconomyActions,
  selectCoins,
  selectGems,
  selectVipExpiresAt,
  selectIsVipActive,
  selectIsAdFreeComputed,
  selectIsPremiumPassFlag,
  selectVipStreakWeeks,
  selectVipStreakBonusClaimed,
} from '../stores/economyStore';
import {
  usePlayerActions,
  usePlayerStore,
  selectSegments,
  selectCurrentLevel,
} from '../stores/playerStore';
import { iapManager } from '../services/iap';
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
import { getFlashSale, FlashSale, getDynamicOffers, DynamicOffer } from '../data/dynamicPricing';
import { getRemoteBoolean } from '../services/remoteConfig';
import { getProductById } from '../data/shopProducts';
import { soundManager } from '../services/sound';
import {
  getVipStreakBonus,
  getNextVipStreakMilestone,
  getVipStreakProgress,
  VIP_STREAK_BONUSES,
} from '../data/vipBenefits';
import { useCommerce } from '../hooks/useCommerce';
import PiggyBankCard from '../components/PiggyBankCard';
import { analytics } from '../services/analytics';

const { width } = Dimensions.get('window');
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function formatCountdown(msRemaining: number): string {
  const remaining = Math.max(0, msRemaining);
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

const LiveCountdownText = React.memo(function LiveCountdownText({
  style,
  prefix = '',
  targetTime,
  untilMidnight = false,
}: {
  style: any;
  prefix?: string;
  targetTime?: number;
  untilMidnight?: boolean;
}) {
  const getText = useCallback(() => {
    if (untilMidnight) {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(23, 59, 59, 999);
      return formatCountdown(midnight.getTime() - now.getTime());
    }

    return formatCountdown((targetTime ?? Date.now()) - Date.now());
  }, [targetTime, untilMidnight]);

  const [text, setText] = useState(() => getText());

  useEffect(() => {
    setText(getText());
    const interval = setInterval(() => {
      setText(getText());
    }, 1000);
    return () => clearInterval(interval);
  }, [getText]);

  return <Text style={style}>{prefix}{text}</Text>;
});

// ─── Shared visual helpers ───────────────────────────────────────────────────

/** Pressable with the standard press-scale feel for every tappable card. */
function PressableScale({
  onPress,
  disabled,
  style,
  children,
  accessibilityLabel,
  accessibilityState,
}: {
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityState?: { disabled?: boolean };
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      style={({ pressed }) => [
        style,
        pressed && !disabled && helperStyles.pressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

/** Angled gradient ribbon pinned to a card's top-right corner. */
function Ribbon({
  label,
  colors,
}: {
  label: string;
  colors: readonly [string, string, ...string[]];
}) {
  return (
    <View style={helperStyles.ribbonHost} pointerEvents="none">
      <View style={helperStyles.ribbonRotator}>
        <LinearGradient
          colors={colors as [string, string, ...string[]]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
        <Text style={helperStyles.ribbonText} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

/** Strikethrough anchor + bold sale price inside one capsule chip. */
function PriceCapsule({
  price,
  originalPrice,
  loading,
  accent = COLORS.gold,
}: {
  price: string;
  originalPrice?: string | null;
  loading?: boolean;
  accent?: string;
}) {
  return (
    <View style={[helperStyles.priceCapsule, { borderColor: accent + '55' }]}>
      <LinearGradient
        colors={[accent + '2E', 'rgba(10,0,21,0.65)'] as [string, string]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      {loading ? (
        <ActivityIndicator size="small" color={accent} />
      ) : (
        <>
          {originalPrice != null && (
            <Text style={helperStyles.priceCapsuleAnchor}>{originalPrice}</Text>
          )}
          <Text style={[helperStyles.priceCapsulePrice, { color: accent }]}>{price}</Text>
        </>
      )}
    </View>
  );
}

/**
 * HaloMedallion — bigger-presence product art for featured / flash cards:
 * an outer accent ring with inner glow wash wrapping the shared
 * IconMedallion, so hero product art reads as crafted rather than a small
 * emoji floating on the card.
 */
function HaloMedallion({
  glyph,
  source,
  size = 52,
  accent,
  style,
}: {
  glyph?: string;
  source?: ImageSourcePropType;
  size?: number;
  accent: string;
  style?: StyleProp<ViewStyle>;
}) {
  const outer = size + 14;
  return (
    <View
      style={[
        {
          width: outer,
          height: outer,
          borderRadius: outer / 2,
          borderWidth: 1.5,
          borderColor: accent + '59',
          backgroundColor: accent + '14',
          alignItems: 'center',
          justifyContent: 'center',
          ...SHADOWS.glow(accent),
        },
        style,
      ]}
    >
      <IconMedallion glyph={glyph} source={source} size={size} accent={accent} />
    </View>
  );
}

/**
 * Stacked-contents row for bundle cards — mini medallions of what's inside
 * (AAA-shop treatment), replacing a plain "+"-joined text description.
 */
function BundleContentsRow({
  items,
  accent,
}: {
  items: { source?: ImageSourcePropType; glyph?: string; label: string }[];
  accent: string;
}) {
  return (
    <View style={helperStyles.bundleRow}>
      {items.map((it, i) => (
        <View key={i} style={[helperStyles.bundleChip, { borderColor: accent + '30' }]}>
          <IconMedallion glyph={it.glyph} source={it.source} size={22} accent={accent} />
          <Text style={helperStyles.bundleChipLabel}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Animated shine sweep for the flash-sale card — a skewed light band loops
 * across the card. Skipped entirely under reduce-motion.
 */
function ShineSweep({ sweepWidth }: { sweepWidth: number }) {
  const reduceMotion = useReduceMotion();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(2400),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, anim]);

  if (reduceMotion) return null;

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-180, sweepWidth + 180],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}
    >
      <LinearGradient
        colors={[
          'transparent',
          'rgba(255,255,255,0.07)',
          'rgba(255,255,255,0.16)',
          'rgba(255,255,255,0.07)',
          'transparent',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={helperStyles.shineBand}
      />
    </Animated.View>
  );
}

const helperStyles = StyleSheet.create({
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  ribbonHost: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: 14,
  },
  ribbonRotator: {
    position: 'absolute',
    top: 12,
    right: -34,
    width: 130,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    transform: [{ rotate: '35deg' }],
    ...SHADOWS.soft,
  },
  ribbonText: {
    fontSize: 8,
    fontFamily: FONTS.display,
    color: COLORS.bg,
    letterSpacing: 1,
  },
  priceCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    overflow: 'hidden',
    minHeight: 26,
  },
  priceCapsuleAnchor: {
    fontSize: 11,
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
    fontFamily: FONTS.bodyMedium,
  },
  priceCapsulePrice: {
    fontSize: 14,
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
  },
  shineBand: {
    width: 140,
    height: '100%',
    transform: [{ skewX: '-20deg' }],
  },
  bundleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  bundleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingLeft: 3,
    paddingRight: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(10,0,21,0.5)',
  },
  bundleChipLabel: {
    fontFamily: FONTS.display,
    fontSize: 10,
    letterSpacing: 0.5,
    color: COLORS.textPrimary,
  },
});

// ─── Static item data ────────────────────────────────────────────────────────

interface ShopItem {
  id: string;
  name: string;
  icon: string;
  /** Real image asset for the medallion \u2014 takes priority over the emoji icon. */
  image?: ImageSourcePropType;
  price: string;
  quantity?: number;
  bestValue?: boolean;
  iapProductId?: string;
}

const HINT_BUNDLES: ShopItem[] = [
  { id: 'hints_10', name: '10 Hints', icon: '\u{1F4A1}', image: LOCAL_IMAGES.iconHint, price: '$0.99', quantity: 10, iapProductId: 'hint_bundle_10' },
  { id: 'hints_25', name: '25 Hints', icon: '\u{1F4A1}', image: LOCAL_IMAGES.iconHint, price: '$1.99', quantity: 25, iapProductId: 'hint_bundle_25' },
  { id: 'hints_50', name: '50 Hints', icon: '\u{1F4A1}', image: LOCAL_IMAGES.iconHint, price: '$2.99', quantity: 50, bestValue: true, iapProductId: 'hint_bundle_50' },
];

const UNDO_BUNDLES: ShopItem[] = [
  { id: 'undos_10', name: '10 Undos', icon: '\u21A9\uFE0F', image: LOCAL_IMAGES.iconUndo, price: '$0.99', quantity: 10, iapProductId: 'undo_bundle_10' },
  { id: 'undos_25', name: '25 Undos', icon: '\u21A9\uFE0F', image: LOCAL_IMAGES.iconUndo, price: '$1.99', quantity: 25, iapProductId: 'undo_bundle_25' },
  { id: 'undos_50', name: '50 Undos', icon: '\u21A9\uFE0F', image: LOCAL_IMAGES.iconUndo, price: '$2.99', quantity: 50, bestValue: true, iapProductId: 'undo_bundle_50' },
];

const COIN_PACKS: ShopItem[] = [
  { id: 'coins_500', name: '500 Coins', icon: '\u{1FA99}', image: LOCAL_IMAGES.iconCoinGold, price: '$0.99', quantity: 500 },
  { id: 'coins_1500', name: '1,500 Coins', icon: '\u{1FA99}', image: LOCAL_IMAGES.iconCoinGold, price: '$2.99', quantity: 1500 },
  { id: 'coins_5000', name: '5,000 Coins', icon: '\u{1FA99}', image: LOCAL_IMAGES.iconCoinGold, price: '$7.99', quantity: 5000, bestValue: true },
];

const GEM_PACKS: ShopItem[] = [
  { id: 'gems_50', name: '50 Gems', icon: '\u{1F48E}', image: LOCAL_IMAGES.iconGemDiamond, price: '$0.99', quantity: 50, iapProductId: 'gems_50' },
  { id: 'gems_250', name: '250 Gems', icon: '\u{1F48E}', image: LOCAL_IMAGES.iconGemDiamond, price: '$4.99', quantity: 250, iapProductId: 'gems_250' },
  { id: 'gems_500', name: '500 Gems', icon: '\u{1F48E}', image: LOCAL_IMAGES.iconGemDiamond, price: '$9.99', quantity: 500, bestValue: true, iapProductId: 'gems_500' },
];

// Stacked-contents rows for the hardcoded bundle cards (mini medallions).
const STARTER_PACK_CONTENTS = [
  { source: LOCAL_IMAGES.iconCoinGold, label: '500' },
  { source: LOCAL_IMAGES.iconGemDiamond, label: '50' },
  { source: LOCAL_IMAGES.iconHint, label: '10' },
  { glyph: '\u{1F3A8}', label: 'DECOR' },
];
const WEEKEND_BUNDLE_CONTENTS = [
  { source: LOCAL_IMAGES.iconGemDiamond, label: '100' },
  { source: LOCAL_IMAGES.iconCoinGold, label: '3,000' },
  { glyph: '\u{1F5BC}\uFE0F', label: 'FRAME' },
];

// ─── Coin Shop categories ────────────────────────────────────────────────────

const COIN_SHOP_TRACKING_KEY = '@wordfall_coinshop_daily';

const COIN_SHOP_CATEGORIES: { key: string; label: string }[] = [
  { key: 'consumables', label: 'Consumables' },
  { key: 'boosters', label: 'Boosters' },
];

function getCommerceStatusMessage(status: ReturnType<typeof iapManager.getStatus>): {
  tone: 'success' | 'warning' | 'info';
  title: string;
  detail: string;
} {
  if (status.commerceLaunchReady) {
    return {
      tone: 'success',
      title: 'Billing ready',
      detail: 'Store billing and server validation are configured for this build.',
    };
  }

  if (status.isMockMode) {
    return {
      tone: 'info',
      title: 'Development billing',
      detail: 'This build can preview purchase UI, but real charges still depend on a native dev client and deployed validation.',
    };
  }

  if (!status.validationAvailable) {
    return {
      tone: 'warning',
      title: 'Validation required',
      detail: 'Set EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL before enabling production purchases.',
    };
  }

  return {
    tone: 'warning',
    title: 'Billing unavailable',
    detail: 'Create a fresh native dev-client / EAS build to test real purchases in-app.',
  };
}

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
  const { t } = useTranslation();
  const settings = useSettings();
  // Narrow zustand subscriptions — ShopScreen no longer re-renders on every
  // economy churn; only on the slices it actually reads.
  const coins = useEconomyStore(selectCoins);
  const gems = useEconomyStore(selectGems);
  const vipExpiresAt = useEconomyStore(selectVipExpiresAt);
  const isVip = useEconomyStore(selectIsVipActive);
  const isAdFreeComputed = useEconomyStore(selectIsAdFreeComputed);
  const isPremiumPassFlag = useEconomyStore(selectIsPremiumPassFlag);
  const vipStreakWeeks = useEconomyStore(selectVipStreakWeeks);
  const vipStreakBonusClaimed = useEconomyStore(selectVipStreakBonusClaimed);
  const {
    canAfford,
    spendCoins,
    spendGems,
    addHintTokens,
    addUndoTokens,
    addBoosterToken,
    grantTemporaryEntitlement,
    processAdReward,
    claimVipDailyRewards,
    claimVipStreakBonus,
  } = useEconomyActions();
  const { unlockCosmetic, awardFreeSpin } = usePlayerActions();
  // Tier 6 B6 — read player segments + current level to compute the dynamic
  // "For You" row. When segments haven't been computed yet (first session),
  // the hook returns an empty offer list so the section simply doesn't render.
  const segments = usePlayerStore(selectSegments);
  const currentLevel = usePlayerStore(selectCurrentLevel);
  const dynamicOffers = useMemo<DynamicOffer[]>(() => {
    if (!segments) return [];
    if (!getRemoteBoolean('dynamicOffersEnabled')) return [];
    return getDynamicOffers(
      segments.spending,
      segments.engagement,
      currentLevel,
      (segments as { daysSinceActive?: number }).daysSinceActive,
    );
  }, [segments, currentLevel]);
  // Fire offer_surfaced once per distinct offer set so the funnel analytics
  // dimension (segment × tier) shows up without re-firing on re-renders.
  const lastSurfacedKeyRef = useRef<string>('');
  useEffect(() => {
    if (dynamicOffers.length === 0) return;
    const key = dynamicOffers.map((o) => `${o.productId}@${o.discountPercent}`).join('|');
    if (key === lastSurfacedKeyRef.current) return;
    lastSurfacedKeyRef.current = key;
    for (const offer of dynamicOffers) {
      void analytics.logEvent('offer_surfaced', {
        product_id: offer.productId,
        discount_percent: offer.discountPercent,
        badge: offer.badge ?? '',
        engagement: segments?.engagement ?? 'unknown',
        spending: segments?.spending ?? 'unknown',
        days_since_active:
          (segments as { daysSinceActive?: number } | null | undefined)?.daysSinceActive ?? 0,
      });
    }
  }, [dynamicOffers, segments]);
  const adsRemoved = adsRemovedProp ?? isAdFreeComputed;
  const premiumPass = premiumPassProp ?? isPremiumPassFlag;
  const { commerceStatus, checkPurchaseAllowed, purchaseProduct, restorePurchases } = useCommerce();
  const featuredExpiryAtRef = useRef(Date.now() + DAY_IN_MS);

  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [watchingAd, setWatchingAd] = useState(false);
  const [restoringPurchases, setRestoringPurchases] = useState(false);
  const [mockAdState, setMockAdState] = useState<{
    rewardType: AdRewardType;
    resolver: (watched: boolean) => void;
  } | null>(null);

  // Coin shop daily purchase tracking (resets each day). PERSISTED: this was
  // component-local state with no storage, so backing out of the Shop screen
  // (native-stack pop unmounts it) reset every daily limit to zero —
  // converting coins into hint/undo tokens without bound at prices that
  // undercut the real-money packs, despite coinShop.ts's stated purpose of
  // preventing exactly that. Same storage pattern as the ad-cap tracking in
  // services/ads.ts.
  const [coinShopPurchasesToday, setCoinShopPurchasesToday] = useState<Record<string, number>>({});
  const [coinShopDate, setCoinShopDate] = useState<string>(new Date().toISOString().slice(0, 10));
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(COIN_SHOP_TRACKING_KEY);
        if (!stored || cancelled) return;
        const parsed = JSON.parse(stored) as { date: string; counts: Record<string, number> };
        if (parsed.date === new Date().toISOString().slice(0, 10)) {
          setCoinShopPurchasesToday(parsed.counts ?? {});
          setCoinShopDate(parsed.date);
        }
      } catch {
        // Unreadable tracking is treated as a fresh day — fail open.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (Object.keys(coinShopPurchasesToday).length === 0) return;
    void AsyncStorage.setItem(
      COIN_SHOP_TRACKING_KEY,
      JSON.stringify({ date: coinShopDate, counts: coinShopPurchasesToday }),
    ).catch(() => {});
  }, [coinShopPurchasesToday, coinShopDate]);
  const [coinShopConfirmation, setCoinShopConfirmation] = useState<string | null>(null);
  const coinShopConfirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flash sale state
  const flashSale = useMemo(() => getFlashSale(new Date()), []);

  // Today's rotating items
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const rotatingItems = useMemo(() => getCurrentRotatingItems(today), [today]);
  const rotatingHoursLeft = useMemo(() => getTimeRemainingHours(today), [today]);

  // Initialise IAP + Ads
  useEffect(() => {
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

  // ── Purchase handler ────────────────────────────────────────────────────

  const handlePurchase = useCallback(
    async (productId: string) => {
      if (purchasingId) return; // already in flight

      // Funnel: record that the user tapped a specific product tile. This
      // closes the drop-off gap between 'shop_view' and 'iap_initiated'.
      void funnelTracker.trackPurchase('shop_product_tapped', productId);

      // Check parental controls
      const parentalCheck = checkPurchaseAllowed(productId);

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
    [checkPurchaseAllowed, purchasingId, settings],
  );

  const executePurchase = useCallback(
    async (productId: string) => {
      setPurchasingId(productId);

      try {
        const result = await purchaseProduct(productId);
        if (result.success) {
          if (productId === 'piggy_bank_break') {
            void analytics.logEvent('piggy_bank_broken', {});
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
    [onPurchaseProp, purchaseProduct],
  );

  // ── Rewarded ad handlers ────────────────────────────────────────────────

  const handleWatchAdForHint = useCallback(async () => {
    if (watchingAd) return;
    setWatchingAd(true);
    try {
      const result = await adManager.showRewardedAd('hint_reward');
      if (result.rewarded) {
        processAdReward('hint_reward');
        Alert.alert('Reward Earned!', 'You received 1 free hint!');
      }
    } catch {
      Alert.alert('Ad Unavailable', 'Please try again later.');
    } finally {
      setWatchingAd(false);
    }
  }, [watchingAd, processAdReward]);

  const handleWatchAdForCoins = useCallback(async () => {
    if (watchingAd) return;
    setWatchingAd(true);
    try {
      const result = await adManager.showRewardedAd('coins_reward');
      if (result.rewarded) {
        processAdReward('coins_reward');
        Alert.alert('Reward Earned!', 'You received 50 coins!');
      }
    } catch {
      Alert.alert('Ad Unavailable', 'Please try again later.');
    } finally {
      setWatchingAd(false);
    }
  }, [watchingAd, processAdReward]);

  const handleWatchAdForSpin = useCallback(async () => {
    if (watchingAd) return;
    setWatchingAd(true);
    try {
      const result = await adManager.showRewardedAd('spin_reward');
      if (result.rewarded) {
        // The ad view has already been counted against the daily rewarded-ad
        // cap by adManager, so failing to grant here didn't just do nothing —
        // it burned one of the player's limited ad slots for nothing.
        awardFreeSpin();
        Alert.alert('Reward Earned!', 'You received 1 free Mystery Wheel spin!');
      }
    } catch {
      Alert.alert('Ad Unavailable', 'Please try again later.');
    } finally {
      setWatchingAd(false);
    }
  }, [watchingAd, awardFreeSpin]);

  // ── Restore purchases handler ───────────────────────────────────────────

  const handleRestorePurchases = useCallback(async () => {
    if (restoringPurchases) return;
    setRestoringPurchases(true);
    try {
      const { results, restoredCount } = await restorePurchases();
      // restorePurchases() resolves on every path; failed attempts surface
      // as a row with productId='restore_failed' (see iap.ts contract).
      const failureRow = results.find((r) => r.productId === 'restore_failed' && !r.success);
      if (failureRow) {
        Alert.alert('Restore Failed', failureRow.error ?? 'Could not restore purchases. Please try again.');
      } else if (results.length === 0) {
        Alert.alert('No Purchases Found', 'There are no purchases to restore.');
      } else {
        Alert.alert('Purchases Restored', `${restoredCount} purchase(s) restored successfully.`);
      }
    } finally {
      setRestoringPurchases(false);
    }
  }, [restorePurchases, restoringPurchases]);

  // ── Rotating item gem purchase ──────────────────────────────────────────

  const handleRotatingPurchase = useCallback(
    (item: RotatingItem) => {
      if (!canAfford('gems', item.gemCost)) {
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
              const spent = spendGems(item.gemCost);
              if (spent) {
                unlockCosmetic(item.id);
                Alert.alert('Purchased!', `${item.name} has been added to your collection.`);
              }
            },
          },
        ],
      );
    },
    [canAfford, spendGems, unlockCosmetic],
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
      if (!canAfford('coins', item.costCoins)) {
        Alert.alert('Not Enough Coins', `You need ${item.costCoins} coins for ${item.name}.`);
        return;
      }

      // Spend coins
      const spent = spendCoins(item.costCoins);
      if (!spent) return;

      // Grant the item
      const reward = item.reward;
      switch (reward.type) {
        case 'hint':
          addHintTokens(reward.amount ?? 1);
          break;
        case 'undo':
          addUndoTokens(reward.amount ?? 1);
          break;
        case 'booster':
          if (reward.boosterType) {
            addBoosterToken(reward.boosterType, reward.amount ?? 1);
          }
          break;
        case 'temporary_effect':
        case 'cosmetic_rental':
          // This arm was empty: Board Freeze (300c) and Score Doubler (500c)
          // debited coins, showed the "purchased!" banner, and delivered
          // nothing. The entitlement store existed the whole time with zero
          // callers. Timed effects use their declared duration; one-shot
          // "next puzzle" items get a 24h window and are consumed by
          // GameScreen the moment they activate — the window only exists so
          // an unused purchase survives an app restart.
          if (reward.effectId) {
            grantTemporaryEntitlement(
              reward.effectId as CommercialEffectId,
              reward.durationMinutes ?? 24 * 60,
            );
          }
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
    [
      canAfford,
      spendCoins,
      addHintTokens,
      addUndoTokens,
      addBoosterToken,
      grantTemporaryEntitlement,
      coinShopPurchasesToday,
      coinShopDate,
    ],
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

  /** Anchor price + discount badge derived from SHOP_PRODUCTS.originalPrice */
  const getAnchor = (
    item: ShopItem,
  ): { originalPrice: string; discountPercent: number } | null => {
    if (!item.iapProductId) return null;
    const product = getProductById(item.iapProductId);
    if (!product?.originalPrice || !product.originalPriceAmount) return null;
    const discount = Math.round(
      (1 - product.fallbackPriceAmount / product.originalPriceAmount) * 100,
    );
    if (discount <= 0) return null;
    return { originalPrice: product.originalPrice, discountPercent: discount };
  };

  const renderItemCard = (item: ShopItem, accent: string = COLORS.gold) => {
    const productId = item.iapProductId ?? item.id;
    const displayPrice = getDisplayPrice(item);
    const anchor = getAnchor(item);
    // Pull the ribbon badge from the catalog so ops can rotate emphasis
    // via product data without touching the shop screen. Legacy
    // `item.bestValue` still forces a BEST VALUE ribbon for older
    // call sites; the catalog `badge` takes priority when set.
    const catalogProduct = item.iapProductId ? getProductById(item.iapProductId) : undefined;
    const ribbon: 'popular' | 'best_value' | 'limited' | null =
      catalogProduct?.badge ?? (item.bestValue ? 'best_value' : null);
    const ribbonLabel =
      ribbon === 'popular'
        ? 'MOST POPULAR'
        : ribbon === 'best_value'
        ? 'BEST VALUE'
        : ribbon === 'limited'
        ? 'LIMITED'
        : null;
    const ribbonGradient =
      ribbon === 'popular'
        ? ['#7E5BEF', '#B56CFB']
        : ribbon === 'limited'
        ? ['#E94B4B', '#FF7A7A']
        : [...GRADIENTS.button.gold];

    return (
      <PressableScale
        key={item.id}
        style={[styles.itemCard, { borderColor: accent + '3D' }]}
        onPress={() => handlePurchase(productId)}
        disabled={!!purchasingId}
        accessibilityLabel={`Buy ${item.name} for ${displayPrice}${
          ribbonLabel ? `, ${ribbonLabel.toLowerCase()}` : ''
        }`}
      >
        <LinearGradient
          colors={[accent + '14', 'rgba(26,10,46,0.94)'] as [string, string]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        <LinearGradient
          colors={['transparent', accent + '99', 'transparent'] as [string, string, string]}
          style={styles.itemTopEdge}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        />
        <IconMedallion
          glyph={item.icon}
          source={item.image}
          size={48}
          accent={accent}
          style={styles.itemMedallion}
        />
        <Text style={styles.itemName}>{item.name}</Text>
        {anchor && (
          <View style={styles.itemDiscountBadge}>
            <Text style={styles.itemDiscountText}>{anchor.discountPercent}% OFF</Text>
          </View>
        )}
        <PriceCapsule
          price={displayPrice}
          originalPrice={anchor?.originalPrice}
          loading={isLoading(productId)}
          accent={accent}
        />
        {ribbonLabel && (
          <Ribbon
            label={ribbonLabel}
            colors={ribbonGradient as unknown as readonly [string, string, ...string[]]}
          />
        )}
      </PressableScale>
    );
  };

  const renderItemRow = (items: ShopItem[], accent: string) => (
    <View style={styles.itemRow}>
      {items.map((item) => renderItemCard(item, accent))}
    </View>
  );

  return (
    <View style={styles.root}>
      <ScreenScaffold
        title="SHOP"
        eyebrow="DAILY DEALS"
        accent={COLORS.accent}
        backdrop="shop"
        onBack={navigation ? () => navigation.goBack() : undefined}
        headerRight={
          <View style={styles.headerCurrency}>
            <View style={styles.currencyChip}>
              <Image
                source={LOCAL_IMAGES.iconCoinGold}
                style={styles.currencyChipIcon}
                resizeMode="contain"
              />
              <Text style={styles.currencyChipText}>{coins.toLocaleString()}</Text>
            </View>
            <View style={styles.currencyChip}>
              <Image
                source={LOCAL_IMAGES.iconGemDiamond}
                style={styles.currencyChipIcon}
                resizeMode="contain"
              />
              <Text style={[styles.currencyChipText, { color: COLORS.cyan }]}>
                {gems.toLocaleString()}
              </Text>
            </View>
          </View>
        }
      >
        {/* ── Piggy Bank ──────────────────────────────────────────── */}
        <PiggyBankCard
          onBreak={() => handlePurchase('piggy_bank_break')}
          purchasing={purchasingId === 'piggy_bank_break'}
        />

        {/* ── Flash Sale ──────────────────────────────────────────── */}
        {flashSale && (
          <View style={styles.flashSaleCard}>
            <LinearGradient
              colors={[COLORS.coral + '30', COLORS.orange + '15', 'rgba(26,10,46,0.96)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <LinearGradient
              colors={['transparent', COLORS.coral, 'transparent'] as [string, string, string]}
              style={styles.flashTopEdge}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
            />
            <View style={styles.flashSaleHeader}>
              <Text style={styles.flashSaleLabel}>{'\u26A1'} FLASH SALE</Text>
              <View style={styles.flashSaleDiscountBadge}>
                <LinearGradient
                  colors={[COLORS.coral, COLORS.orange] as [string, string]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                <Text style={styles.flashSaleDiscountText}>{flashSale.discountPercent}% OFF</Text>
              </View>
            </View>
            <View style={styles.flashSaleBody}>
              <HaloMedallion
                glyph={flashSale.icon}
                size={60}
                accent={COLORS.coral}
                style={styles.flashSaleMedallion}
              />
              <View style={styles.flashSaleInfo}>
                <Text style={styles.flashSaleName}>{flashSale.name}</Text>
                <Text style={styles.flashSaleDesc}>{flashSale.description}</Text>
                <View style={styles.flashSalePriceRow}>
                  <PriceCapsule
                    price={flashSale.salePrice}
                    originalPrice={flashSale.originalPrice}
                    accent={COLORS.gold}
                  />
                </View>
              </View>
            </View>
            <View style={styles.flashSaleFooter}>
              <View style={styles.flashSaleTimer}>
                <LiveCountdownText
                  prefix={'\u23F0 '}
                  style={styles.flashSaleTimerText}
                  untilMidnight
                />
              </View>
              {isLoading(flashSale.productId) ? (
                <View style={styles.flashSaleLoadingPill}>
                  <ActivityIndicator size="small" color={COLORS.gold} />
                </View>
              ) : (
                <PrimaryButton
                  label={`BUY NOW ${flashSale.salePrice}`}
                  onPress={() => handlePurchase(flashSale.productId)}
                  variant="gold"
                  size="medium"
                  disabled={!!purchasingId}
                  accessibilityLabel={`Flash sale: Buy now for ${flashSale.salePrice}`}
                />
              )}
            </View>
            <ShineSweep sweepWidth={width - 32} />
          </View>
        )}

        {/* ── Free Rewards (Watch Ads) ──────────────────────────────── */}
        {!adsRemoved && (
          <View style={styles.adSection}>
            <SectionHeader label="FREE REWARDS" accent={COLORS.green} />

            {/* Watch Ad for Hint */}
            <PressableScale
              style={styles.adBanner}
              onPress={handleWatchAdForHint}
              disabled={watchingAd}
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
                <IconMedallion glyph={'\u{1F3AC}'} size={40} accent={COLORS.green} style={styles.adMedallion} />
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
            </PressableScale>

            {/* Watch Ad for Coins (max 3/day) */}
            {adManager.canWatchCoinAd() && (
              <PressableScale
                style={[styles.adBanner, { borderColor: COLORS.gold + '40' }]}
                onPress={handleWatchAdForCoins}
                disabled={watchingAd}
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
                  <IconMedallion source={LOCAL_IMAGES.iconCoinGold} size={40} accent={COLORS.gold} style={styles.adMedallion} />
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
              </PressableScale>
            )}

            {/* Watch Ad for Mystery Wheel Spin */}
            {adManager.canShowAd('spin_reward') && (
              <PressableScale
                style={[styles.adBanner, { borderColor: COLORS.purple + '40' }]}
                onPress={handleWatchAdForSpin}
                disabled={watchingAd}
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
                  <IconMedallion glyph={'\u{1F3B0}'} size={40} accent={COLORS.purple} style={styles.adMedallion} />
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
              </PressableScale>
            )}
          </View>
        )}

        {/* ── VIP Subscription ───────────────────────────────────────── */}
        <View style={styles.vipCard}>
          <LinearGradient
            colors={['#3a1466', '#22093f', '#160528']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          {/* Holographic top edge — royal purple/gold treatment */}
          <LinearGradient
            colors={[...GRADIENTS.synthwave.holographic] as [string, string, ...string[]]}
            style={styles.vipHoloEdge}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
          />
          <LinearGradient
            colors={[COLORS.gold + '1F', 'transparent'] as [string, string]}
            style={styles.vipGlow}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
          <View style={styles.vipHeader}>
            <HaloMedallion source={LOCAL_IMAGES.iconGemDiamond} size={52} accent={COLORS.gold} style={styles.vipMedallion} />
            <View style={{ flex: 1 }}>
              <Text style={styles.vipTitle}>{t('shop.vipWeekly')}</Text>
              <Text style={styles.vipSubtitle}>The ultimate Wordfall experience</Text>
            </View>
            {isVip && (
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
          {isVip ? (
            <View style={styles.vipActions}>
              <PrimaryButton
                label="CLAIM DAILY REWARDS"
                onPress={() => {
                  const claimed = claimVipDailyRewards();
                  if (claimed) {
                    Alert.alert('VIP Rewards Claimed!', 'You received 50 gems and 3 hints.');
                  } else {
                    Alert.alert('Already Claimed', 'Come back tomorrow for more VIP rewards!');
                  }
                }}
                variant="gold"
                size="large"
                fullWidth
                accessibilityLabel="Claim daily VIP rewards: 50 gems and 3 hints"
              />
              <Text style={styles.vipExpiryText}>
                Renews {new Date(vipExpiresAt).toLocaleDateString()}
              </Text>
            </View>
          ) : isLoading('vip_weekly') ? (
            <View style={styles.vipLoadingRow}>
              <ActivityIndicator size="small" color={COLORS.gold} />
            </View>
          ) : (
            <PrimaryButton
              label="SUBSCRIBE  $4.99/WEEK"
              onPress={() => handlePurchase('vip_weekly')}
              variant="primary"
              size="large"
              fullWidth
              disabled={!!purchasingId}
              accessibilityLabel="Subscribe to VIP Weekly for $4.99 per week"
            />
          )}
        </View>

        {/* ── VIP Streak Bonus (for active subscribers) ─────────────── */}
        {isVip && (() => {
          const streakWeeks = vipStreakWeeks;
          const streakBonusClaimed = vipStreakBonusClaimed;
          const currentBonus = getVipStreakBonus(streakWeeks);
          const nextMilestone = getNextVipStreakMilestone(streakWeeks);
          const progress = getVipStreakProgress(streakWeeks);

          return (
            <View style={styles.vipStreakCard}>
              <LinearGradient
                colors={['#341260', '#1d0838']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
              <View style={styles.vipStreakHeader}>
                <IconMedallion glyph={'\u{1F451}'} size={44} accent={COLORS.purple} style={styles.vipStreakMedallion} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.vipStreakTitle}>{t('shop.vipStreak')}</Text>
                  <Text style={styles.vipStreakWeeks}>
                    {t('common.weeksSubscribed', { count: streakWeeks })}
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
                    <NeonProgressBar
                      progress={Math.min(progress.progress, 1)}
                      color={COLORS.purple}
                      height={8}
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
                <PrimaryButton
                  label="CLAIM WEEKLY BONUS"
                  variant="primary"
                  size="medium"
                  fullWidth
                  accessibilityLabel={`Claim VIP streak weekly bonus: ${currentBonus?.bonusGems} gems and ${currentBonus?.bonusHints} hints`}
                  onPress={() => {
                    const result = claimVipStreakBonus();
                    if (!result) return;
                    if (result.cosmetic?.id) {
                      unlockCosmetic(result.cosmetic.id);
                    }
                    const cosmeticLine = result.cosmetic
                      ? `\n+ exclusive ${result.cosmetic.type}: ${result.cosmetic.id.replace(/_/g, ' ')}`
                      : '';
                    Alert.alert(
                      'VIP Streak Bonus!',
                      `You earned +${currentBonus.bonusGems} gems and +${currentBonus.bonusHints} hints for being a ${currentBonus.label}!${cosmeticLine}`,
                    );
                  }}
                />
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

        {/* ── VIP Cosmetic Ladder ───────────────────────────────────── */}
        {isVip && (
          <View style={styles.vipLadderCard}>
            <Text style={styles.vipLadderTitle}>Exclusive VIP Cosmetics</Text>
            <Text style={styles.vipLadderSubtitle}>
              Keep your VIP streak alive to unlock every tier.
            </Text>
            {VIP_STREAK_BONUSES.map((tier) => {
              const reached = vipStreakWeeks >= tier.weeksRequired;
              const cosmetic = tier.extraReward;
              if (!cosmetic?.id) return null;
              const typeGlyph =
                cosmetic.type === 'frame'
                  ? '\u{1F3F5}'
                  : cosmetic.type === 'title'
                    ? '\u{1F3C6}'
                    : cosmetic.type === 'decoration'
                      ? '\u{1F3C6}'
                      : '\u2728';
              return (
                <View key={tier.weeksRequired} style={styles.vipLadderRow}>
                  <Text style={styles.vipLadderWeeks}>
                    Week {tier.weeksRequired}
                  </Text>
                  <View style={styles.vipLadderBody}>
                    <Text style={styles.vipLadderCosmetic}>
                      {typeGlyph} {cosmetic.id.replace(/_/g, ' ')}
                    </Text>
                    <Text style={styles.vipLadderTypeLabel}>
                      {cosmetic.type}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.vipLadderStatus,
                      reached && styles.vipLadderStatusUnlocked,
                    ]}
                  >
                    {reached ? 'Unlocked' : 'Locked'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Tier 6 B6 — For You (dynamic offers) ─────────────────────── */}
        {dynamicOffers.length > 0 && (
          <View style={styles.dynamicOffersSection}>
            <SectionHeader label="FOR YOU" accent={COLORS.pink} meta="PERSONAL" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredContent}
            >
              {dynamicOffers.map((offer) => {
                const product = getProductById(offer.productId as any);
                const name = product?.name ?? offer.productId;
                const price = product?.fallbackPrice ?? '$1.99';
                const originalPrice = product?.originalPrice;
                const icon = product?.icon ?? '\u{1F381}';
                return (
                  <PressableScale
                    key={`${offer.productId}-${offer.discountPercent}`}
                    style={styles.featuredCard}
                    onPress={() => {
                      void analytics.logEvent('offer_tapped', {
                        product_id: offer.productId,
                        discount_percent: offer.discountPercent,
                        engagement: segments?.engagement ?? 'unknown',
                      });
                      handlePurchase(offer.productId);
                    }}
                    disabled={!!purchasingId}
                    accessibilityLabel={`Personalized offer: ${name} at ${offer.discountPercent} percent off`}
                  >
                    <LinearGradient
                      colors={[...GRADIENTS.surfaceCard] as [string, string]}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                    />
                    <LinearGradient
                      colors={[COLORS.accent + '30', 'transparent'] as [string, string]}
                      style={styles.featuredGlow}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                    />
                    {offer.badge && (
                      <View style={styles.featuredBadge}>
                        <Text style={styles.featuredBadgeText}>{offer.badge}</Text>
                      </View>
                    )}
                    <HaloMedallion glyph={icon} size={56} accent={COLORS.pink} style={styles.featuredMedallion} />
                    <Text style={styles.featuredName}>{name}</Text>
                    <Text style={styles.featuredDesc}>
                      {`${offer.discountPercent}% off for you`}
                    </Text>
                    <View style={styles.featuredPriceRow}>
                      <PriceCapsule
                        price={price}
                        originalPrice={originalPrice}
                        loading={isLoading(offer.productId)}
                        accent={COLORS.green}
                      />
                    </View>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Featured Offers ────────────────────────────────────────── */}
        <SectionHeader label="FEATURED OFFERS" accent={COLORS.accent} meta="LIMITED" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.featuredScroll}
          contentContainerStyle={styles.featuredContent}
        >
          <PressableScale
            style={styles.featuredCard}
            onPress={() => handlePurchase('starter_pack')}
            disabled={!!purchasingId}
            accessibilityLabel="Buy Starter Pack: 500 coins, 50 gems, 10 hints, and exclusive decoration for $1.99"
          >
            <LinearGradient
              colors={[...GRADIENTS.surfaceCard] as [string, string]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <LinearGradient
              colors={[COLORS.accent + '30', 'transparent'] as [string, string]}
              style={styles.featuredGlow}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>LIMITED TIME</Text>
            </View>
            <HaloMedallion glyph={'\u{1F381}'} size={56} accent={COLORS.accent} style={styles.featuredMedallion} />
            <Text style={styles.featuredName}>Starter Pack</Text>
            <BundleContentsRow items={STARTER_PACK_CONTENTS} accent={COLORS.accent} />
            <View style={styles.featuredPriceRow}>
              <PriceCapsule
                price="$1.99"
                originalPrice="$4.99"
                loading={isLoading('starter_pack')}
                accent={COLORS.green}
              />
            </View>
            <View style={styles.timerContainer}>
              <LiveCountdownText
                style={styles.timerText}
                targetTime={featuredExpiryAtRef.current}
              />
            </View>
          </PressableScale>

          <PressableScale
            style={[styles.featuredCard, styles.featuredCardAlt]}
            onPress={() => handlePurchase('chapter_bundle')}
            disabled={!!purchasingId}
            accessibilityLabel="Buy Weekend Bundle: 100 gems, 3000 coins, and rare frame for $4.99"
          >
            <LinearGradient
              colors={[...GRADIENTS.surfaceCard] as [string, string]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <LinearGradient
              colors={[COLORS.purple + '33', 'transparent'] as [string, string]}
              style={styles.featuredGlow}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
            <View style={[styles.featuredBadge, { backgroundColor: COLORS.purple }]}>
              <Text style={styles.featuredBadgeText}>SPECIAL</Text>
            </View>
            <HaloMedallion glyph={'\u2728'} size={56} accent={COLORS.purple} style={styles.featuredMedallion} />
            <Text style={styles.featuredName}>Weekend Bundle</Text>
            <BundleContentsRow items={WEEKEND_BUNDLE_CONTENTS} accent={COLORS.purple} />
            <View style={styles.featuredPriceRow}>
              <PriceCapsule
                price="$4.99"
                originalPrice="$14.99"
                loading={isLoading('chapter_bundle')}
                accent={COLORS.green}
              />
            </View>
            <View style={[styles.timerContainer, { backgroundColor: COLORS.purple + '30' }]}>
              <LiveCountdownText
                style={[styles.timerText, { color: COLORS.purpleLight }]}
                targetTime={featuredExpiryAtRef.current}
              />
            </View>
          </PressableScale>
        </ScrollView>

        {/* ── Rotating Exclusive Shop ────────────────────────────────── */}
        <SectionHeader
          label={t('shop.exclusiveCosmetics').toUpperCase()}
          accent={COLORS.purple}
          meta="ROTATING"
        />
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
              <PressableScale
                key={item.id}
                style={[styles.rotatingCard, { borderColor: rarityColor + '60', ...SHADOWS.glow(rarityColor) }]}
                onPress={() => handleRotatingPurchase(item)}
                accessibilityLabel={`${item.name}, ${item.rarity} rarity, ${item.gemCost} gems`}
              >
                <LinearGradient
                  colors={[rarityColor + '18', 'rgba(26,10,46,0.94)']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
                <LinearGradient
                  colors={['transparent', rarityColor + 'AA', 'transparent'] as [string, string, string]}
                  style={styles.itemTopEdge}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                />
                <View style={[styles.rarityBadge, { backgroundColor: rarityColor + '26', borderColor: rarityColor + '66' }]}>
                  <Text style={[styles.rarityText, { color: rarityColor }]}>
                    {item.rarity.toUpperCase()}
                  </Text>
                </View>
                <IconMedallion glyph={item.icon} size={48} accent={rarityColor} style={styles.rotatingMedallion} />
                <Text style={styles.rotatingName}>{item.name}</Text>
                <Text style={styles.rotatingDesc}>{item.description}</Text>
                <View style={styles.gemPriceRow}>
                  <Image
                    source={LOCAL_IMAGES.iconGemDiamond}
                    style={styles.gemIconImg}
                    resizeMode="contain"
                  />
                  <Text style={[styles.gemPrice, { color: rarityColor }]}>{item.gemCost}</Text>
                </View>
                <Text style={styles.rotatingTimer}>
                  {item.returnsInDays >= 180 ? "Won't return for 6 months" : `Returns in ${item.returnsInDays} days`}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>

        {navigation && (
          <PressableScale
            style={styles.browseCosmetics}
            onPress={() => navigation.navigate('CosmeticStore')}
            accessibilityLabel="Browse all cosmetics"
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
          </PressableScale>
        )}

        {/* ── Hint Bundles ───────────────────────────────────────────── */}
        <SectionHeader label={t('shop.hintBundles').toUpperCase()} accent={COLORS.gold} />
        {renderItemRow(HINT_BUNDLES, COLORS.gold)}

        {/* ── Undo Bundles ───────────────────────────────────────────── */}
        <SectionHeader label={t('shop.undoBundles').toUpperCase()} accent={COLORS.teal} />
        {renderItemRow(UNDO_BUNDLES, COLORS.teal)}

        {/* ── Coin Packs ─────────────────────────────────────────────── */}
        <SectionHeader label={t('shop.coinPacks').toUpperCase()} accent={COLORS.orange} />
        {renderItemRow(COIN_PACKS, COLORS.orange)}

        {/* ── Gem Packs ──────────────────────────────────────────────── */}
        <SectionHeader label={t('shop.gemPacks').toUpperCase()} accent={COLORS.cyan} />
        {renderItemRow(GEM_PACKS, COLORS.cyan)}

        {/* ── Premium ────────────────────────────────────────────────── */}
        <SectionHeader label={t('shop.premium').toUpperCase()} accent={COLORS.purple} />
        <View style={styles.premiumSection}>
          <PressableScale
            style={[styles.premiumCard, { borderColor: COLORS.purple + '3D' }]}
            onPress={() => handlePurchase('chapter_bundle')}
            disabled={!!purchasingId}
            accessibilityLabel="Buy Chapter Bundle for $2.99: theme decoration, 20 gems, 10 hints, and 1 board preview"
          >
            <LinearGradient
              colors={[COLORS.purple + '12', 'rgba(26,10,46,0.94)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <IconMedallion glyph={'\u{1F4D6}'} size={44} accent={COLORS.purple} style={styles.premiumMedallion} />
            <View style={styles.premiumInfo}>
              <Text style={styles.premiumName}>{t('shop.chapterBundle')}</Text>
              <Text style={styles.premiumDesc}>
                Theme decoration + 20 gems + 10 hints + 1 Board Preview
              </Text>
            </View>
            <PriceCapsule price="$2.99" loading={isLoading('chapter_bundle')} accent={COLORS.purpleLight} />
          </PressableScale>

          <PressableScale
            style={[styles.premiumCard, { borderColor: COLORS.teal + '3D' }]}
            onPress={() => handlePurchase('daily_value_pack')}
            disabled={!!purchasingId}
            accessibilityLabel="Buy Daily Value Pack for $0.99: bonus rewards every day for 30 days"
          >
            <LinearGradient
              colors={[COLORS.teal + '10', 'rgba(26,10,46,0.94)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <IconMedallion glyph={'\u{1F4E6}'} size={44} accent={COLORS.teal} style={styles.premiumMedallion} />
            <View style={styles.premiumInfo}>
              <Text style={styles.premiumName}>{t('shop.dailyValuePack')}</Text>
              <Text style={styles.premiumDesc}>
                Bonus rewards every day for 30 days
              </Text>
            </View>
            <PriceCapsule price="$0.99" loading={isLoading('daily_value_pack')} accent={COLORS.teal} />
          </PressableScale>

          <PressableScale
            style={[
              styles.premiumCard,
              { borderColor: COLORS.gold + '3D' },
              premiumPass && styles.purchasedCard,
            ]}
            onPress={() => !premiumPass && handlePurchase('premium_pass')}
            disabled={premiumPass || !!purchasingId}
            accessibilityLabel={premiumPass ? 'Premium Pass, owned' : 'Buy Premium Pass for $4.99: unlock premium rewards this season'}
            accessibilityState={{ disabled: premiumPass }}
          >
            <LinearGradient
              colors={[COLORS.gold + '10', 'rgba(26,10,46,0.94)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <IconMedallion glyph={'\u{1F451}'} size={44} accent={COLORS.gold} muted={premiumPass} style={styles.premiumMedallion} />
            <View style={styles.premiumInfo}>
              <Text style={styles.premiumName}>{t('shop.premiumPass')}</Text>
              <Text style={styles.premiumDesc}>
                Unlock premium rewards this season
              </Text>
            </View>
            {premiumPass ? (
              <View style={styles.ownedBadge}>
                <Text style={styles.ownedText}>OWNED</Text>
              </View>
            ) : (
              <PriceCapsule price="$4.99" loading={isLoading('premium_pass')} accent={COLORS.gold} />
            )}
          </PressableScale>

          <PressableScale
            style={[
              styles.premiumCard,
              { borderColor: COLORS.coral + '3D' },
              adsRemoved && styles.purchasedCard,
            ]}
            onPress={() => !adsRemoved && handlePurchase('ad_removal')}
            disabled={adsRemoved || !!purchasingId}
            accessibilityLabel={adsRemoved ? 'Remove Ads, owned' : 'Buy Remove Ads for $4.99: ad-free experience forever'}
            accessibilityState={{ disabled: adsRemoved }}
          >
            <LinearGradient
              colors={[COLORS.coral + '10', 'rgba(26,10,46,0.94)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <IconMedallion glyph={'\u{1F6AB}'} size={44} accent={COLORS.coral} muted={adsRemoved} style={styles.premiumMedallion} />
            <View style={styles.premiumInfo}>
              <Text style={styles.premiumName}>{t('shop.removeAds')}</Text>
              <Text style={styles.premiumDesc}>
                Enjoy an ad-free experience forever
              </Text>
            </View>
            {adsRemoved ? (
              <View style={styles.ownedBadge}>
                <Text style={styles.ownedText}>OWNED</Text>
              </View>
            ) : (
              <PriceCapsule price="$4.99" loading={isLoading('ad_removal')} accent={COLORS.coral} />
            )}
          </PressableScale>
        </View>

        {/* ── Coin Shop (spend coins on consumables) ─────────────────── */}
        <SectionHeader
          label={t('shop.spendCoins').toUpperCase()}
          accent={COLORS.gold}
          meta={`${coins.toLocaleString()} COINS`}
        />

        {coinShopConfirmation && (
          <View style={styles.coinShopConfirmBanner}>
            <Text style={styles.coinShopConfirmText}>
              {'\u2713'} {coinShopConfirmation} purchased!
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
                  const cantAfford = !canAfford('coins', item.costCoins);
                  const disabled = limitReached || cantAfford;

                  return (
                    <PressableScale
                      key={item.id}
                      style={[styles.coinShopCard, disabled && styles.coinShopCardDisabled]}
                      onPress={() => !disabled && handleCoinShopPurchase(item)}
                      disabled={disabled}
                      accessibilityLabel={`${item.name} for ${item.costCoins} coins${limitReached ? ', daily limit reached' : cantAfford ? ', not enough coins' : ''}`}
                      accessibilityState={{ disabled }}
                    >
                      <LinearGradient
                        colors={[...GRADIENTS.surfaceCard]}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                      />
                      <IconMedallion
                        glyph={item.icon}
                        size={40}
                        accent={COLORS.gold}
                        muted={disabled}
                        style={styles.coinShopMedallion}
                      />
                      <Text style={[styles.coinShopName, disabled && styles.coinShopTextDisabled]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.coinShopDesc, disabled && styles.coinShopTextDisabled]}>
                        {item.description}
                      </Text>
                      <View style={[styles.coinShopPrice, cantAfford && styles.coinShopPriceDisabled]}>
                        <Image
                          source={LOCAL_IMAGES.iconCoinGold}
                          style={[styles.coinPriceIcon, cantAfford && { opacity: 0.4 }]}
                          resizeMode="contain"
                        />
                        <Text style={[styles.coinShopPriceText, cantAfford && styles.coinShopPriceTextDisabled]}>
                          {item.costCoins.toLocaleString()}
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
                    </PressableScale>
                  );
                })}
              </View>
            </View>
          );
        })}

        <SectionHeader label={t('shop.limitedRentals').toUpperCase()} accent={COLORS.orange} meta="SOON" />
        <Text style={styles.rentalSubtitle}>
          Timed rentals and temporary boosts return in a future update after their gameplay hooks are fully wired.
        </Text>
        <View style={styles.rentalPlaceholderCard}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <IconMedallion glyph={'\u{1F6A7}'} size={44} accent={COLORS.orange} muted style={styles.rentalPlaceholderMedallion} />
          <Text style={styles.rentalPlaceholderTitle}>Temporarily Unavailable</Text>
          <Text style={styles.rentalPlaceholderText}>
            These timed rentals return once each effect is fully playable in live gameplay.
          </Text>
        </View>

        {/* ── Restore Purchases ──────────────────────────────────────── */}
        <PressableScale
          style={styles.restoreButton}
          onPress={handleRestorePurchases}
          disabled={restoringPurchases}
          accessibilityLabel={t('shop.restorePurchases')}
        >
          {restoringPurchases ? (
            <ActivityIndicator size="small" color={COLORS.textSecondary} />
          ) : (
            <Text style={styles.restoreText}>{t('shop.restorePurchases')}</Text>
          )}
        </PressableScale>

      </ScreenScaffold>

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
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // ── Header currency cluster ───────────────────────────────────────────
  headerCurrency: {
    alignItems: 'flex-end',
    gap: 4,
  },
  currencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.surfaceGlass,
  },
  currencyChipIcon: {
    width: 14,
    height: 14,
  },
  currencyChipText: {
    fontFamily: FONTS.display,
    fontSize: 11,
    color: COLORS.gold,
    fontVariant: ['tabular-nums'],
  },

  // ── Ad section ────────────────────────────────────────────────────────
  adSection: {
    marginBottom: 12,
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
  adMedallion: {
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
  vipHoloEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  vipGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  vipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  vipMedallion: {
    marginRight: 12,
  },
  vipLoadingRow: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
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
  vipExpiryText: {
    fontSize: 11,
    color: COLORS.textMuted,
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
  vipStreakMedallion: {
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
    marginBottom: 6,
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
  vipStreakClaimedText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  // ── VIP cosmetic ladder ─────────────────────────────────────────────
  vipLadderCard: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.purple + '30',
  },
  vipLadderTitle: {
    fontSize: 14,
    fontFamily: FONTS.display,
    color: COLORS.purple,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  vipLadderSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  vipLadderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.purple + '20',
  },
  vipLadderWeeks: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textPrimary,
    width: 64,
  },
  vipLadderBody: {
    flex: 1,
  },
  vipLadderCosmetic: {
    fontSize: 13,
    color: COLORS.textPrimary,
    textTransform: 'capitalize',
  },
  vipLadderTypeLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  vipLadderStatus: {
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  vipLadderStatusUnlocked: {
    color: COLORS.green,
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
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  rarityText: {
    fontSize: 9,
    fontFamily: FONTS.display,
    letterSpacing: 1,
  },
  rotatingMedallion: {
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
  gemIconImg: {
    width: 16,
    height: 16,
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
  featuredScroll: {
    marginTop: 2,
  },
  featuredContent: {
    gap: 12,
    paddingRight: 16,
  },
  dynamicOffersSection: {
    marginTop: 4,
    marginBottom: 4,
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
  },
  featuredMedallion: {
    marginBottom: 8,
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
    paddingTop: 16,
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  itemTopEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  itemMedallion: {
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
  itemDiscountBadge: {
    backgroundColor: COLORS.coral,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginBottom: 6,
  },
  itemDiscountText: {
    fontSize: 9,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
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
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  purchasedCard: {
    opacity: 0.6,
  },
  premiumMedallion: {
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


  // ── Coin Shop ──────────────────────────────────────────────────────────
  coinShopConfirmBanner: {
    backgroundColor: 'rgba(0,255,135,0.14)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.green + '44',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  coinShopConfirmText: {
    color: COLORS.green,
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
  },
  coinShopCategorySection: {
    marginBottom: 16,
  },
  coinShopCategoryTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  coinShopGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  coinShopCard: {
    width: '31%',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.gold + '2E',
    ...SHADOWS.soft,
  },
  coinShopCardDisabled: {
    opacity: 0.45,
  },
  coinShopMedallion: {
    marginBottom: 6,
  },
  coinShopName: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    marginBottom: 3,
    textAlign: 'center',
  },
  coinShopDesc: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 13,
  },
  coinShopTextDisabled: {
    color: 'rgba(255,255,255,0.35)',
  },
  coinShopPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.gold + '26',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.gold + '55',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  coinPriceIcon: {
    width: 12,
    height: 12,
  },
  coinShopPriceDisabled: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: COLORS.borderSubtle,
  },
  coinShopPriceText: {
    color: COLORS.gold,
    fontSize: 13,
    fontFamily: FONTS.display,
    fontVariant: ['tabular-nums'],
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
  flashTopEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2.5,
  },
  flashSaleDiscountBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
    ...SHADOWS.glow(COLORS.coral),
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
  flashSaleMedallion: {
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
  flashSaleLoadingPill: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    minWidth: 140,
    backgroundColor: COLORS.surfaceGlass,
    borderWidth: 1,
    borderColor: COLORS.gold + '44',
  },

  // ── Limited Rentals ────────────────────────────────────────────────────
  rentalSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    marginBottom: 12,
    marginTop: -6,
  },
  rentalPlaceholderCard: {
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 8,
  },
  rentalPlaceholderMedallion: {
    marginBottom: 8,
  },
  rentalPlaceholderTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontFamily: FONTS.display,
    letterSpacing: 1,
    marginBottom: 6,
  },
  rentalPlaceholderText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    lineHeight: 17,
    textAlign: 'center',
    maxWidth: 280,
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

// Wrap ShopScreen in a local error boundary so render errors during a
// purchase (or anywhere else in this large screen) don't crash the whole app
// and leave the player without context on what they were buying.
const ShopScreenWithBoundary: React.FC<any> = (props) => (
  <LocalErrorBoundary
    scope="shop"
    title="Shop ran into an error"
    actionLabel="Back"
    onReset={props.onNavigate ? () => props.onNavigate('Home') : undefined}
  >
    <ShopScreen {...props} />
  </LocalErrorBoundary>
);

export default ShopScreenWithBoundary;
