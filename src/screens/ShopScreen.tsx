import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, FONTS } from '../constants';
import { useSettings } from '../contexts/SettingsContext';

const { width } = Dimensions.get('window');

interface ShopItem {
  id: string;
  name: string;
  icon: string;
  price: string;
  quantity?: number;
  bestValue?: boolean;
}

const HINT_BUNDLES: ShopItem[] = [
  { id: 'hints_10', name: '10 Hints', icon: '\u{1F4A1}', price: '$0.99', quantity: 10 },
  { id: 'hints_25', name: '25 Hints', icon: '\u{1F4A1}', price: '$1.99', quantity: 25 },
  { id: 'hints_50', name: '50 Hints', icon: '\u{1F4A1}', price: '$2.99', quantity: 50, bestValue: true },
];

const UNDO_BUNDLES: ShopItem[] = [
  { id: 'undos_10', name: '10 Undos', icon: '\u21A9\uFE0F', price: '$0.99', quantity: 10 },
  { id: 'undos_25', name: '25 Undos', icon: '\u21A9\uFE0F', price: '$1.99', quantity: 25 },
  { id: 'undos_50', name: '50 Undos', icon: '\u21A9\uFE0F', price: '$2.99', quantity: 50, bestValue: true },
];

const COIN_PACKS: ShopItem[] = [
  { id: 'coins_500', name: '500 Coins', icon: '\u{1FA99}', price: '$0.99', quantity: 500 },
  { id: 'coins_1500', name: '1,500 Coins', icon: '\u{1FA99}', price: '$2.99', quantity: 1500 },
  { id: 'coins_5000', name: '5,000 Coins', icon: '\u{1FA99}', price: '$7.99', quantity: 5000, bestValue: true },
];

const GEM_PACKS: ShopItem[] = [
  { id: 'gems_50', name: '50 Gems', icon: '\u{1F48E}', price: '$1.99', quantity: 50 },
  { id: 'gems_150', name: '150 Gems', icon: '\u{1F48E}', price: '$4.99', quantity: 150 },
  { id: 'gems_500', name: '500 Gems', icon: '\u{1F48E}', price: '$14.99', quantity: 500, bestValue: true },
];

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
  const onPurchase = onPurchaseProp ?? ((_itemId: string) => {});
  const adsRemoved = adsRemovedProp ?? settings.adsRemoved;
  const premiumPass = premiumPassProp ?? settings.premiumPass;
  const [countdown, setCountdown] = useState('23:59:59');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const renderItemCard = (item: ShopItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.itemCard}
      onPress={() => onPurchase(item.id)}
      activeOpacity={0.7}
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
        <Text style={styles.priceText}>{item.price}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderItemRow = (items: ShopItem[]) => (
    <View style={styles.itemRow}>
      {items.map(renderItemCard)}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SHOP</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Featured Offers */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.featuredScroll}
          contentContainerStyle={styles.featuredContent}
        >
          <TouchableOpacity
            style={styles.featuredCard}
            onPress={() => onPurchase('starter_pack')}
            activeOpacity={0.7}
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
              50 Hints + 25 Undos + 1000 Coins
            </Text>
            <View style={styles.featuredPriceRow}>
              <Text style={styles.featuredOldPrice}>$9.99</Text>
              <Text style={styles.featuredPrice}>$2.99</Text>
            </View>
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{countdown}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.featuredCard, styles.featuredCardAlt]}
            onPress={() => onPurchase('weekend_special')}
            activeOpacity={0.7}
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
              <Text style={styles.featuredPrice}>$4.99</Text>
            </View>
            <View style={[styles.timerContainer, { backgroundColor: COLORS.purple + '30' }]}>
              <Text style={[styles.timerText, { color: COLORS.purple }]}>{countdown}</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* Hint Bundles */}
        <Text style={styles.sectionTitle}>Hint Bundles</Text>
        {renderItemRow(HINT_BUNDLES)}

        {/* Undo Bundles */}
        <Text style={styles.sectionTitle}>Undo Bundles</Text>
        {renderItemRow(UNDO_BUNDLES)}

        {/* Coin Packs */}
        <Text style={styles.sectionTitle}>Coin Packs</Text>
        {renderItemRow(COIN_PACKS)}

        {/* Gem Packs */}
        <Text style={styles.sectionTitle}>Gem Packs</Text>
        {renderItemRow(GEM_PACKS)}

        {/* Premium */}
        <Text style={styles.sectionTitle}>Premium</Text>
        <View style={styles.premiumSection}>
          <TouchableOpacity
            style={styles.premiumCard}
            onPress={() => onPurchase('daily_value')}
            activeOpacity={0.7}
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
              <Text style={styles.priceText}>$0.99</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.premiumCard,
              premiumPass && styles.purchasedCard,
            ]}
            onPress={() => !premiumPass && onPurchase('premium_pass')}
            activeOpacity={premiumPass ? 1 : 0.7}
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
                <Text style={styles.priceText}>$4.99</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.premiumCard,
              adsRemoved && styles.purchasedCard,
            ]}
            onPress={() => !adsRemoved && onPurchase('ad_removal')}
            activeOpacity={adsRemoved ? 1 : 0.7}
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
                <Text style={styles.priceText}>$4.99</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  bottomSpacer: {
    height: 40,
  },
});

export default ShopScreen;
