import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, FONTS } from '../constants';
import { AmbientBackdrop } from '../components/common/AmbientBackdrop';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { useCommerce } from '../hooks/useCommerce';
import {
  useEconomyStore,
  selectIsAdFreeComputed,
  selectIsPremiumPassFlag,
} from '../stores/economyStore';
import {
  requestAccountDeletion,
  clearLocalUserData,
  isAccountDeletionConfigured,
} from '../services/accountDeletion';
import type { ColorblindMode } from '../contexts/SettingsContext';
import { COLORBLIND_MODE_LABELS } from '../services/colorblind';
import i18n, { SUPPORTED_LOCALES, LOCALE_LABELS, type SupportedLocale } from '../i18n';

const COLORBLIND_MODES: ColorblindMode[] = [
  'off',
  'deuteranopia',
  'protanopia',
  'tritanopia',
];

const THEMES = [
  { id: 'dark', name: 'Dark', color: '#0a0e27' },
  { id: 'midnight', name: 'Midnight', color: '#0d1117' },
  { id: 'ocean', name: 'Ocean', color: '#0a1628' },
  { id: 'forest', name: 'Forest', color: '#0a1a0f' },
  { id: 'sunset', name: 'Sunset', color: '#1a0a0a' },
];

const PRIVACY_POLICY_URL = 'https://wordfallgame.app/privacy';
const TERMS_OF_SERVICE_URL = 'https://wordfallgame.app/terms';
const SUPPORT_EMAIL = 'info@iridescent-games.com';

async function openUrlSafe(url: string, fallbackTitle: string) {
  try {
    const ok = await Linking.canOpenURL(url);
    if (ok) {
      await Linking.openURL(url);
      return;
    }
  } catch {
    // fall through to alert
  }
  Alert.alert(fallbackTitle, url);
}

interface SettingsScreenProps {
  settings?: any;
  onUpdateSetting?: (key: string, value: any) => void;
  onResetProgress?: () => void;
  onSignOut?: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings: settingsProp,
  onUpdateSetting: onUpdateSettingProp,
  onResetProgress: onResetProgressProp,
  onSignOut: onSignOutProp,
}) => {
  const { t } = useTranslation();
  const contextSettings = useSettings();
  const isAdFreeComputed = useEconomyStore(selectIsAdFreeComputed);
  const isPremiumPassFlag = useEconomyStore(selectIsPremiumPassFlag);
  const { signOut } = useAuth();
  const { restorePurchases } = useCommerce();

  const settings = settingsProp ?? contextSettings;
  const onUpdateSetting = onUpdateSettingProp ?? ((key: string, value: any) => contextSettings.updateSetting(key as any, value));
  const onResetProgress = onResetProgressProp ?? (() => {});
  const onSignOut = onSignOutProp ?? signOut;

  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleRestorePurchases = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const { results, restoredCount } = await restorePurchases();
      if (results.length === 0) {
        Alert.alert('No Purchases Found', 'There are no purchases to restore on this account.');
      } else {
        Alert.alert(
          'Purchases Restored',
          `${restoredCount} purchase${restoredCount === 1 ? '' : 's'} restored successfully.`,
        );
      }
    } catch (error: any) {
      Alert.alert('Restore Failed', error?.message ?? 'Could not restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  const handleSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      await Promise.resolve(onUpdateSetting('isSignedIn', true));
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await Promise.resolve(onSignOut());
    } finally {
      setSigningOut(false);
    }
  };

  const sfxVolume = settings?.sfxVolume ?? 80;
  const musicVolume = settings?.musicVolume ?? 60;
  const hapticsEnabled = settings?.hapticsEnabled ?? settings?.haptics ?? true;
  const notificationsEnabled = settings?.notificationsEnabled ?? settings?.notifications ?? true;
  const selectedTheme = settings?.theme ?? 'dark';
  const colorblindMode: ColorblindMode = settings?.colorblindMode ?? 'off';
  const isSignedIn = settings?.isSignedIn ?? false;
  const adsRemoved = isAdFreeComputed ?? false;
  const premiumPass = isPremiumPassFlag ?? false;
  const appVersion = settings?.version ?? '1.0.0';

  const handleVolumeChange = (key: string, currentValue: number, delta: number) => {
    const newValue = Math.max(0, Math.min(100, currentValue + delta));
    onUpdateSetting(key, newValue);
  };

  const performAccountDeletion = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const result = await requestAccountDeletion();
      if (!result.ok) {
        Alert.alert(
          'Deletion Failed',
          result.error ??
            'We could not complete the deletion. Please contact support so we can finish it manually.',
        );
        return;
      }
      await clearLocalUserData();
      try {
        await signOut();
      } catch {
        // signOut errors are non-fatal — auth state will settle on next launch
      }
      Alert.alert(
        'Account Deleted',
        'Your account and all associated data have been deleted. We are sorry to see you go.',
      );
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteAccount = () => {
    if (deleting) return;
    if (!isAccountDeletionConfigured()) {
      Alert.alert(
        'Unavailable',
        `Account deletion is temporarily unavailable from the app. Please email ${SUPPORT_EMAIL} and we will delete your account within 30 days.`,
      );
      return;
    }
    Alert.alert(
      'Delete Account?',
      'This permanently deletes your profile, progress, club memberships, and friends list. Purchase records are retained in anonymized form for tax and fraud auditing only.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are You Absolutely Sure?',
              'This cannot be undone. Any unspent gems, purchased VIP time, and tournament progress will be lost.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Forever',
                  style: 'destructive',
                  onPress: () => void performAccountDeletion(),
                },
              ],
            );
          },
        },
      ],
    );
  };

  const confirmResetProgress = () => {
    Alert.alert(
      'Reset Local Data',
      'This clears on-device progress only. Your account, purchases, and cloud-synced stats stay intact. Use "Delete Account & Data" below if you want full erasure.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: onResetProgress },
      ],
    );
  };

  const renderVolumeControl = (label: string, settingKey: string, value: number) => (
    <View style={styles.settingRow} accessibilityRole="adjustable" accessibilityLabel={`${label}: ${value} percent`} accessibilityValue={{ min: 0, max: 100, now: value }}>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.volumeControl}>
        <TouchableOpacity
          style={styles.volumeBtn}
          onPress={() => handleVolumeChange(settingKey, value, -10)}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
        >
          <Text style={styles.volumeBtnText}>-</Text>
        </TouchableOpacity>
        <View style={styles.volumeBarContainer}>
          <View style={styles.volumeBarBg}>
            <View
              style={[styles.volumeBarFill, { width: `${value}%` }]}
            />
          </View>
          <Text style={styles.volumeValue}>{value}%</Text>
        </View>
        <TouchableOpacity
          style={styles.volumeBtn}
          onPress={() => handleVolumeChange(settingKey, value, 10)}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
        >
          <Text style={styles.volumeBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderToggle = (label: string, value: boolean, settingKey: string) => (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.toggle, value && styles.toggleOn]}
        onPress={() => onUpdateSetting(settingKey, !value)}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value }}
      >
        <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <AmbientBackdrop variant="settings" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SETTINGS</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Sound Section */}
        <Text style={styles.sectionTitle}>Sound</Text>
        <View style={styles.card}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          {renderVolumeControl('SFX Volume', 'sfxVolume', sfxVolume)}
          <View style={styles.divider} />
          {renderVolumeControl('Music Volume', 'musicVolume', musicVolume)}
        </View>

        {/* Gameplay Section */}
        <Text style={styles.sectionTitle}>Gameplay</Text>
        <View style={styles.card}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          {renderToggle('Haptics', hapticsEnabled, 'haptics')}
          <View style={styles.divider} />
          {renderToggle('Notifications', notificationsEnabled, 'notifications')}
        </View>

        {/* Accessibility Section */}
        <Text style={styles.sectionTitle}>{t('settings.accessibility')}</Text>
        <View style={styles.card}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={[styles.settingRow, { flexDirection: 'column', alignItems: 'stretch' }]}>
            <Text style={[styles.settingLabel, { marginBottom: 4 }]}>Colorblind Mode</Text>
            <Text style={[styles.dangerSubtext, { textAlign: 'left', marginBottom: 12 }]}>
              Swaps letter-cell, selection, and valid-word colors so they remain distinct.
            </Text>
          </View>
          {COLORBLIND_MODES.map((mode, idx) => (
            <React.Fragment key={mode}>
              {idx > 0 && <View style={styles.divider} />}
              <TouchableOpacity
                style={styles.themeRow}
                onPress={() => onUpdateSetting('colorblindMode', mode)}
                accessibilityRole="radio"
                accessibilityLabel={`Colorblind mode: ${COLORBLIND_MODE_LABELS[mode]}`}
                accessibilityState={{ selected: colorblindMode === mode }}
              >
                <Text style={styles.settingLabel}>{COLORBLIND_MODE_LABELS[mode]}</Text>
                <View style={styles.radioOuter}>
                  {colorblindMode === mode && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* Language Section */}
        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
        <View style={styles.card}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={[styles.settingRow, { flexDirection: 'column', alignItems: 'stretch' }]}>
            <Text style={[styles.dangerSubtext, { textAlign: 'left', marginBottom: 12 }]}>
              UI language. Puzzles remain English.
            </Text>
          </View>
          {SUPPORTED_LOCALES.map((loc, idx) => (
            <React.Fragment key={loc}>
              {idx > 0 && <View style={styles.divider} />}
              <TouchableOpacity
                style={styles.themeRow}
                onPress={() => {
                  onUpdateSetting('language', loc);
                  void i18n.changeLanguage(loc);
                }}
                accessibilityRole="radio"
                accessibilityLabel={`Language: ${LOCALE_LABELS[loc as SupportedLocale]}`}
                accessibilityState={{ selected: (settings?.language ?? 'en') === loc }}
              >
                <Text style={styles.settingLabel}>{LOCALE_LABELS[loc as SupportedLocale]}</Text>
                <View style={styles.radioOuter}>
                  {(settings?.language ?? 'en') === loc && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* Theme Section */}
        <Text style={styles.sectionTitle}>Theme</Text>
        <View style={styles.card}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          {THEMES.map((theme, index) => (
            <React.Fragment key={theme.id}>
              {index > 0 && <View style={styles.divider} />}
              <TouchableOpacity
                style={styles.themeRow}
                onPress={() => onUpdateSetting('theme', theme.id)}
                accessibilityRole="radio"
                accessibilityLabel={`${theme.name} theme`}
                accessibilityState={{ selected: selectedTheme === theme.id }}
              >
                <View
                  style={[styles.themePreview, { backgroundColor: theme.color }]}
                />
                <Text style={styles.settingLabel}>{theme.name}</Text>
                <View style={styles.radioOuter}>
                  {selectedTheme === theme.id && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* Account Section */}
        <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
        <View style={styles.card}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          {isSignedIn ? (
            <>
              <TouchableOpacity style={styles.actionRow} accessibilityRole="button" accessibilityLabel="Link account">
                <Text style={styles.settingLabel}>Link Account</Text>
                <Text style={styles.chevron}>{'\u203A'}</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  // Defer the confirmation prompt then run the async handler
                  Alert.alert(
                    'Sign Out',
                    'Are you sure you want to sign out?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Sign Out', onPress: () => void handleSignOut() },
                    ],
                  );
                }}
                accessibilityRole="button"
                accessibilityLabel="Sign out"
                accessibilityState={{ busy: signingOut }}
                disabled={signingOut}
              >
                <Text style={[styles.settingLabel, { color: COLORS.coral }]}>
                  Sign Out
                </Text>
                {signingOut ? (
                  <ActivityIndicator size="small" color={COLORS.coral} />
                ) : (
                  <Text style={[styles.chevron, { color: COLORS.coral }]}>{'\u203A'}</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => void handleSignIn()}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              accessibilityState={{ busy: signingIn }}
              disabled={signingIn}
            >
              <Text style={[styles.settingLabel, { color: COLORS.accent }]}>
                {signingIn ? 'Signing in…' : 'Sign In'}
              </Text>
              {signingIn ? (
                <ActivityIndicator size="small" color={COLORS.accent} />
              ) : (
                <Text style={[styles.chevron, { color: COLORS.accent }]}>{'\u203A'}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Purchases Section */}
        <Text style={styles.sectionTitle}>Purchases</Text>
        <View style={styles.card}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Ad Removal</Text>
            <View
              style={[
                styles.statusBadge,
                adsRemoved ? styles.statusActive : styles.statusInactive,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  adsRemoved ? styles.statusTextActive : styles.statusTextInactive,
                ]}
              >
                {adsRemoved ? 'Active' : 'Not Purchased'}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Premium Pass</Text>
            <View
              style={[
                styles.statusBadge,
                premiumPass ? styles.statusActive : styles.statusInactive,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  premiumPass ? styles.statusTextActive : styles.statusTextInactive,
                ]}
              >
                {premiumPass ? 'Active' : 'Not Purchased'}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => void handleRestorePurchases()}
            accessibilityRole="button"
            accessibilityLabel="Restore previous purchases"
            accessibilityHint="Re-applies purchases made on this account. Use this after reinstalling or switching devices."
            accessibilityState={{ busy: restoring }}
            disabled={restoring}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.settingLabel, { color: COLORS.accent }]}>
              {restoring ? `${t('common.loading')}` : t('settings.restorePurchases')}
            </Text>
            {restoring ? (
              <ActivityIndicator size="small" color={COLORS.accent} />
            ) : (
              <Text style={[styles.chevron, { color: COLORS.accent }]}>{'\u203A'}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Parental Controls */}
        <Text style={styles.sectionTitle}>Parental Controls</Text>
        <View style={styles.card}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          {renderToggle('Spending Limit', settings?.spendingLimitEnabled ?? false, 'spendingLimitEnabled')}
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Monthly Limit</Text>
            <View style={styles.volumeControl}>
              <TouchableOpacity
                style={styles.volumeBtn}
                onPress={() => onUpdateSetting('monthlySpendingLimit', Math.max(0, (settings?.monthlySpendingLimit ?? 25) - 5))}
                accessibilityRole="button"
                accessibilityLabel="Decrease monthly spending limit"
              >
                <Text style={styles.volumeBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={[styles.settingValue, { minWidth: 50, textAlign: 'center' }]}>
                ${settings?.monthlySpendingLimit ?? 25}
              </Text>
              <TouchableOpacity
                style={styles.volumeBtn}
                onPress={() => onUpdateSetting('monthlySpendingLimit', Math.min(500, (settings?.monthlySpendingLimit ?? 25) + 5))}
                accessibilityRole="button"
                accessibilityLabel="Increase monthly spending limit"
              >
                <Text style={styles.volumeBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.divider} />
          {renderToggle('Require PIN for Purchases', settings?.requirePurchasePin ?? false, 'requirePurchasePin')}
        </View>

        {/* Privacy Section */}
        <Text style={styles.sectionTitle}>Privacy</Text>
        <View style={styles.card}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          {renderToggle(
            'Analytics',
            settings?.analyticsEnabled ?? true,
            'analyticsEnabled',
          )}
          <View style={styles.divider} />
          {renderToggle(
            'Personalized Ads',
            settings?.personalizedAdsEnabled ?? true,
            'personalizedAdsEnabled',
          )}
        </View>

        {/* About Section */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Version</Text>
            <Text style={styles.settingValue}>{appVersion}</Text>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.actionRow}
            accessibilityRole="button"
            accessibilityLabel="Privacy Policy"
            onPress={() => openUrlSafe(PRIVACY_POLICY_URL, 'Privacy Policy')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.settingLabel}>Privacy Policy</Text>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.actionRow}
            accessibilityRole="button"
            accessibilityLabel="Terms of Service"
            onPress={() => openUrlSafe(TERMS_OF_SERVICE_URL, 'Terms of Service')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.settingLabel}>Terms of Service</Text>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.actionRow}
            accessibilityRole="button"
            accessibilityLabel="Contact Support"
            onPress={() =>
              openUrlSafe(
                `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Wordfall Support')}`,
                'Contact Support',
              )
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.settingLabel}>Contact Support</Text>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <Text style={[styles.sectionTitle, { color: COLORS.coral }]}>
          {t('settings.dangerZone')}
        </Text>
        <View style={[styles.card, styles.dangerCard]}>
          <LinearGradient
            colors={['#2a1520', '#1e1218']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={confirmResetProgress}
            accessibilityRole="button"
            accessibilityLabel="Reset local data. Clears on-device progress only"
          >
            <Text style={styles.dangerButtonText}>{t('settings.resetLocalData')}</Text>
            <Text style={styles.dangerSubtext}>
              Clears on-device progress only. Account and purchases are kept.
            </Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={confirmDeleteAccount}
            accessibilityRole="button"
            accessibilityLabel="Delete account and data. Permanently erases your cloud profile"
            accessibilityState={{ busy: deleting, disabled: deleting }}
            disabled={deleting}
          >
            <Text style={styles.dangerButtonText}>
              {deleting ? `${t('common.loading')}` : t('settings.deleteAccount')}
            </Text>
            <Text style={styles.dangerSubtext}>
              Permanently erases your profile, progress, and cloud data. Cannot be undone.
            </Text>
            {deleting ? (
              <ActivityIndicator
                size="small"
                color={COLORS.coral}
                style={styles.dangerSpinner}
              />
            ) : null}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: FONTS.display,
    color: COLORS.accent,
    letterSpacing: 4,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
    textShadowColor: 'rgba(255,255,255,0.08)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...SHADOWS.medium,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLabel: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bodyMedium,
  },
  settingValue: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  volumeControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  volumeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeBtnText: {
    fontSize: 18,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  volumeBarContainer: {
    alignItems: 'center',
    width: 100,
  },
  volumeBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.cellDefault,
    borderRadius: 3,
    overflow: 'hidden',
  },
  volumeBarFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  volumeValue: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  toggle: {
    width: 52,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.cellDefault,
    padding: 2,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  toggleOn: {
    backgroundColor: COLORS.accent,
    borderColor: 'rgba(255,45,149,0.3)',
    ...SHADOWS.glow(COLORS.accent),
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.textSecondary,
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.textPrimary,
    ...SHADOWS.soft,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  themePreview: {
    width: 32,
    height: 32,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    ...SHADOWS.medium,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  chevron: {
    fontSize: 22,
    color: COLORS.textMuted,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statusActive: {
    backgroundColor: COLORS.green + '25',
    borderColor: COLORS.green + '40',
    ...SHADOWS.glow(COLORS.green),
  },
  statusInactive: {
    backgroundColor: 'rgba(42, 48, 96, 0.5)',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statusText: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
  },
  statusTextActive: {
    color: COLORS.green,
    textShadowColor: 'rgba(76,175,80,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  statusTextInactive: {
    color: COLORS.textMuted,
  },
  dangerCard: {
    borderColor: COLORS.coral + '40',
    ...SHADOWS.glow(COLORS.coral),
  },
  dangerButton: {
    padding: 20,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: COLORS.coral,
    marginBottom: 4,
    textShadowColor: 'rgba(255,107,107,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  dangerSubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  dangerSpinner: {
    marginTop: 8,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default SettingsScreen;
