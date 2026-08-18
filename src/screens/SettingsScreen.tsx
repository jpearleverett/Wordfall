import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
  Platform,
  Pressable,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, FONTS, RADIUS } from '../constants';
import ScreenScaffold from '../components/common/ScreenScaffold';
import SectionHeader from '../components/common/SectionHeader';
import IconMedallion from '../components/common/IconMedallion';
import PrimaryButton from '../components/common/PrimaryButton';
import NeonProgressBar from '../components/common/NeonProgressBar';
import { bentoPanel, bentoDividerColor, type BentoAccent } from '../styles/bentoPanel';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { useCommerce } from '../hooks/useCommerce';
import {
  useEconomyStore,
  selectIsAdFreeComputed,
  selectIsPremiumPassFlag,
} from '../stores/economyStore';
import { usePlayerActions } from '../stores/playerStore';
import {
  requestAccountDeletion,
  clearLocalUserData,
  isAccountDeletionConfigured,
} from '../services/accountDeletion';
import { analytics } from '../services/analytics';
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
const MANAGE_SUBSCRIPTIONS_URL =
  'https://play.google.com/store/account/subscriptions?package=com.iridescent_games.wordfall';

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

/** #rrggbb + alpha suffix; non-hex colors pass through unchanged. */
function withAlpha(color: string, alphaHex: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color + alphaHex : color;
}

/**
 * Volumes are stored as 0–1 fractions (see SettingsContext DEFAULT_SETTINGS:
 * sfxVolume 0.8). The old UI printed the raw fraction with a "%" suffix
 * ("0.8%") and stepped it ±10 in 0–100 space, corrupting the stored value.
 * Display + stepping now happen in percent; storage keeps fraction semantics.
 * Legacy corrupted values > 1 are read as percent so they self-heal on the
 * next write.
 */
const toPercent = (raw: number): number =>
  Math.round(Math.max(0, Math.min(100, raw <= 1 ? raw * 100 : raw)));

/** Glass bento card shell with accent-tinted border, glow, and surface gradient. */
const Panel: React.FC<{ accent: BentoAccent; style?: ViewStyle; children: React.ReactNode }> = ({
  accent,
  style,
  children,
}) => (
  <View style={[bentoPanel(accent, { padding: 0 }), styles.panelClip, style]}>
    <LinearGradient
      colors={[...GRADIENTS.surfaceCard]}
      style={StyleSheet.absoluteFill}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    />
    {children}
  </View>
);

const Divider: React.FC<{ accent: BentoAccent }> = ({ accent }) => (
  <View style={[styles.divider, { backgroundColor: bentoDividerColor(accent) }]} />
);

/** Circular glass +/- button with an accent glow ring. */
const StepButton: React.FC<{
  glyph: string;
  accent: string;
  onPress: () => void;
  accessibilityLabel: string;
}> = ({ glyph, accent, onPress, accessibilityLabel }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    hitSlop={6}
    style={({ pressed }) => [
      styles.stepBtn,
      { borderColor: withAlpha(accent, '66'), shadowColor: accent },
      pressed && styles.stepBtnPressed,
    ]}
  >
    <LinearGradient
      colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.03)']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={StyleSheet.absoluteFillObject}
    />
    <Text style={styles.stepBtnText}>{glyph}</Text>
  </Pressable>
);

interface SettingsScreenProps {
  settings?: any;
  onUpdateSetting?: (key: string, value: any) => void;
  onResetProgress?: () => void;
  onSignOut?: () => void;
  /** Injected by React Navigation (both stacks mount this screen directly). */
  navigation?: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings: settingsProp,
  onUpdateSetting: onUpdateSettingProp,
  onResetProgress: onResetProgressProp,
  onSignOut: onSignOutProp,
  navigation,
}) => {
  const { t } = useTranslation();
  const contextSettings = useSettings();
  const isAdFreeComputed = useEconomyStore(selectIsAdFreeComputed);
  const isPremiumPassFlag = useEconomyStore(selectIsPremiumPassFlag);
  const { signOut, isAnonymous, linkedEmail, canLinkGoogle, linkGoogle } = useAuth();
  const { restorePurchases } = useCommerce();
  const playerActions = usePlayerActions();

  const settings = settingsProp ?? contextSettings;
  const onUpdateSetting = onUpdateSettingProp ?? ((key: string, value: any) => contextSettings.updateSetting(key as any, value));
  // Default to a REAL reset. Both navigator registrations mount this screen
  // with no props (`component={SettingsScreen}`), so the old `() => {}`
  // default made "Reset Local Data" a confirmed no-op: the player read the
  // warning, tapped the destructive button, and nothing happened. A reset
  // control that silently does nothing is worse than none — it burns trust
  // in every other control on the screen.
  const onResetProgress =
    onResetProgressProp ??
    (() => {
      playerActions.updateProgress({
        currentLevel: 1,
        highestLevel: 1,
        totalScore: 0,
        puzzlesSolved: 0,
        perfectSolves: 0,
        starsByLevel: {},
        totalStars: 0,
      });
    });
  const onSignOut = onSignOutProp ?? signOut;

  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleRestorePurchases = async () => {
    if (restoring) return;
    void analytics.logEvent('settings_account_row_tapped', { action: 'restore' });
    setRestoring(true);
    try {
      const { results, restoredCount } = await restorePurchases();
      // restorePurchases() resolves on every path; failed attempts surface as
      // a row with productId='restore_failed' (see iap.ts contract comment).
      const failureRow = results.find((r) => r.productId === 'restore_failed' && !r.success);
      if (failureRow) {
        Alert.alert('Restore Failed', failureRow.error ?? 'Could not restore purchases. Please try again.');
      } else if (results.length === 0) {
        Alert.alert('No Purchases Found', 'There are no purchases to restore on this account.');
      } else {
        Alert.alert(
          'Purchases Restored',
          t('common.purchasesRestored', { count: restoredCount }),
        );
      }
    } finally {
      setRestoring(false);
    }
  };

  const handleSignIn = async () => {
    if (signingIn) return;
    void analytics.logEvent('settings_account_row_tapped', { action: 'link_google' });
    if (!canLinkGoogle) {
      Alert.alert(
        'Sign-In Unavailable',
        'Google Sign-In is not available in this build. Please update to the latest version of Wordfall.',
      );
      return;
    }
    setSigningIn(true);
    try {
      const result = await linkGoogle();
      if (!result.ok) {
        if (result.code !== 'CANCELLED') {
          Alert.alert('Sign-In Failed', result.error);
        }
        return;
      }
      await Promise.resolve(onUpdateSetting('isSignedIn', true));
      Alert.alert(
        'Account Linked',
        result.email
          ? `Signed in as ${result.email}. Your progress is now backed up to the cloud.`
          : 'Signed in. Your progress is now backed up to the cloud.',
      );
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

  const sfxVolume = settings?.sfxVolume ?? 0.8;
  const musicVolume = settings?.musicVolume ?? 0.5;
  const ceremonyVolume = settings?.ceremonyVolume ?? 0.8;
  const hapticsEnabled = settings?.hapticsEnabled ?? settings?.haptics ?? true;
  const notificationsEnabled = settings?.notificationsEnabled ?? settings?.notifications ?? true;
  const selectedTheme = settings?.theme ?? 'dark';
  const colorblindMode: ColorblindMode = settings?.colorblindMode ?? 'off';
  const isSignedIn = settings?.isSignedIn ?? false;
  const adsRemoved = isAdFreeComputed ?? false;
  const premiumPass = isPremiumPassFlag ?? false;
  const appVersion = settings?.version ?? '1.0.0';

  // Steps in whole percent, stores the context's native 0–1 fraction.
  const handleVolumeChange = (key: string, rawValue: number, deltaPct: number) => {
    const pct = Math.max(0, Math.min(100, toPercent(rawValue) + deltaPct));
    onUpdateSetting(key, pct / 100);
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

  const handleManageSubscription = async () => {
    void analytics.logEvent('settings_account_row_tapped', { action: 'manage_subscription' });
    await openUrlSafe(MANAGE_SUBSCRIPTIONS_URL, 'Manage Subscription');
  };

  const confirmDeleteAccount = () => {
    if (deleting) return;
    void analytics.logEvent('settings_account_row_tapped', { action: 'delete_account' });
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

  const renderVolumeControl = (label: string, settingKey: string, rawValue: number, glyph: string) => {
    const pct = toPercent(rawValue);
    return (
      <View
        style={styles.volumeBlock}
        accessibilityRole="adjustable"
        accessibilityLabel={`${label}: ${pct} percent`}
        accessibilityValue={{ min: 0, max: 100, now: pct }}
      >
        <View style={styles.volumeHeaderRow}>
          <View style={styles.rowLeft}>
            <IconMedallion glyph={glyph} size={34} accent={COLORS.cyan} />
            <Text style={styles.settingLabel}>{label}</Text>
          </View>
          <Text style={styles.volumePct}>{pct}%</Text>
        </View>
        <View style={styles.volumeControls}>
          <StepButton
            glyph={'−'}
            accent={COLORS.cyan}
            onPress={() => handleVolumeChange(settingKey, rawValue, -10)}
            accessibilityLabel={`Decrease ${label}`}
          />
          <View style={styles.volumeTrack}>
            <NeonProgressBar progress={pct / 100} color={COLORS.cyan} height={10} />
          </View>
          <StepButton
            glyph="+"
            accent={COLORS.cyan}
            onPress={() => handleVolumeChange(settingKey, rawValue, 10)}
            accessibilityLabel={`Increase ${label}`}
          />
        </View>
      </View>
    );
  };

  const renderToggle = (
    label: string,
    value: boolean,
    settingKey: string,
    glyph: string,
    accent: string,
  ) => (
    <View style={styles.settingRow}>
      <View style={styles.rowLeft}>
        <IconMedallion glyph={glyph} size={34} accent={accent} />
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <Pressable
        onPress={() => onUpdateSetting(settingKey, !value)}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value }}
        hitSlop={8}
        style={({ pressed }) => [
          styles.toggle,
          value && styles.toggleOn,
          pressed && styles.togglePressed,
        ]}
      >
        <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
      </Pressable>
    </View>
  );

  const renderChip = (opts: {
    key: string;
    label: string;
    selected: boolean;
    onPress: () => void;
    accent: string;
    a11yLabel: string;
    swatch?: string;
  }) => (
    <Pressable
      key={opts.key}
      onPress={opts.onPress}
      accessibilityRole="radio"
      accessibilityLabel={opts.a11yLabel}
      accessibilityState={{ selected: opts.selected }}
      style={({ pressed }) => [
        styles.chip,
        opts.selected && {
          borderColor: opts.accent,
          backgroundColor: withAlpha(opts.accent, '26'),
          ...SHADOWS.glow(opts.accent),
        },
        pressed && styles.chipPressed,
      ]}
    >
      {opts.swatch != null && (
        <View style={[styles.chipSwatch, { backgroundColor: opts.swatch }]} />
      )}
      <Text style={[styles.chipText, opts.selected && styles.chipTextSelected]}>
        {opts.label}
      </Text>
      {opts.selected && (
        <Text style={[styles.chipCheck, { color: opts.accent }]}>{'✓'}</Text>
      )}
    </Pressable>
  );

  return (
    <ScreenScaffold
      title={t('settings.title').toUpperCase()}
      accent={COLORS.accent}
      backdrop="settings"
      onBack={navigation ? () => navigation.goBack() : undefined}
    >
      {/* Sound */}
      <SectionHeader label="SOUND" accent={COLORS.cyan} />
      <Panel accent="cyan">
        {renderVolumeControl('SFX Volume', 'sfxVolume', sfxVolume, '\u{1F50A}')}
        <Divider accent="cyan" />
        {renderVolumeControl('Music Volume', 'musicVolume', musicVolume, '\u{1F3B5}')}
        <Divider accent="cyan" />
        {renderVolumeControl('Ceremony Volume', 'ceremonyVolume', ceremonyVolume, '\u{1F389}')}
      </Panel>

      {/* Gameplay */}
      <SectionHeader label="GAMEPLAY" accent={COLORS.pink} />
      <Panel accent="pink">
        {renderToggle('Haptics', hapticsEnabled, 'hapticsEnabled', '\u{1F4F3}', COLORS.pink)}
        <Divider accent="pink" />
        {renderToggle('Notifications', notificationsEnabled, 'notificationsEnabled', '\u{1F514}', COLORS.pink)}
      </Panel>

      {/* Accessibility */}
      <SectionHeader label={t('settings.accessibility').toUpperCase()} accent={COLORS.purple} />
      <Panel accent="purple">
        <View style={styles.panelIntro}>
          <View style={styles.rowLeft}>
            <IconMedallion glyph={'\u{1F441}'} size={34} accent={COLORS.purple} />
            <Text style={styles.settingLabel}>Colorblind Mode</Text>
          </View>
          <Text style={styles.panelIntroText}>
            Swaps letter-cell, selection, and valid-word colors so they remain distinct.
          </Text>
        </View>
        <View style={styles.chipWrap}>
          {COLORBLIND_MODES.map((mode) =>
            renderChip({
              key: mode,
              label: COLORBLIND_MODE_LABELS[mode],
              selected: colorblindMode === mode,
              onPress: () => onUpdateSetting('colorblindMode', mode),
              accent: COLORS.purple,
              a11yLabel: `Colorblind mode: ${COLORBLIND_MODE_LABELS[mode]}`,
            }),
          )}
        </View>
      </Panel>

      {/* Language */}
      <SectionHeader label={t('settings.language').toUpperCase()} accent={COLORS.cyan} />
      <Panel accent="cyan">
        <View style={styles.panelIntro}>
          <View style={styles.rowLeft}>
            <IconMedallion glyph={'\u{1F310}'} size={34} accent={COLORS.cyan} />
            <Text style={styles.panelIntroText}>UI language. Puzzles remain English.</Text>
          </View>
        </View>
        <View style={styles.chipWrap}>
          {SUPPORTED_LOCALES.map((loc) =>
            renderChip({
              key: loc,
              label: LOCALE_LABELS[loc as SupportedLocale],
              selected: (settings?.language ?? 'en') === loc,
              onPress: () => {
                onUpdateSetting('language', loc);
                void i18n.changeLanguage(loc);
              },
              accent: COLORS.cyan,
              a11yLabel: `Language: ${LOCALE_LABELS[loc as SupportedLocale]}`,
            }),
          )}
        </View>
      </Panel>

      {/* Theme */}
      <SectionHeader label="THEME" accent={COLORS.purple} />
      <Panel accent="purple">
        <View style={styles.chipWrap}>
          {THEMES.map((theme) =>
            renderChip({
              key: theme.id,
              label: theme.name,
              selected: selectedTheme === theme.id,
              onPress: () => onUpdateSetting('theme', theme.id),
              accent: COLORS.purple,
              a11yLabel: `${theme.name} theme`,
              swatch: theme.color,
            }),
          )}
        </View>
      </Panel>

      {/* Account */}
      <SectionHeader label={t('settings.account').toUpperCase()} accent={COLORS.gold} />
      <Panel accent="gold">
        {isSignedIn ? (
          <>
            <View
              style={styles.actionRow}
              accessibilityRole="text"
              accessibilityLabel={
                linkedEmail
                  ? `Signed in as ${linkedEmail}`
                  : isAnonymous
                    ? 'Guest account — progress is stored on this device only'
                    : 'Signed in'
              }
            >
              <IconMedallion glyph={'\u{1F464}'} size={34} accent={COLORS.gold} />
              <Text style={styles.settingLabel}>
                {linkedEmail ? 'Google Account' : 'Account'}
              </Text>
              <Text
                style={[styles.rowValueText, { flex: 1, textAlign: 'right' }]}
                numberOfLines={1}
              >
                {linkedEmail
                  ? linkedEmail
                  : isAnonymous
                    ? 'Guest (not backed up)'
                    : 'Signed in'}
              </Text>
            </View>
            <Divider accent="gold" />
            <Pressable
              style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
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
              <IconMedallion glyph={'\u{1F6AA}'} size={34} accent={COLORS.coral} />
              <Text style={[styles.settingLabel, { color: COLORS.coral, flex: 1 }]}>
                Sign Out
              </Text>
              {signingOut ? (
                <ActivityIndicator size="small" color={COLORS.coral} />
              ) : (
                <Text style={[styles.chevron, { color: COLORS.coral }]}>{'›'}</Text>
              )}
            </Pressable>
          </>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
            onPress={() => void handleSignIn()}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            accessibilityState={{ busy: signingIn }}
            disabled={signingIn}
          >
            <IconMedallion glyph={'\u{1F464}'} size={34} accent={COLORS.accent} />
            <Text style={[styles.settingLabel, { color: COLORS.accent, flex: 1 }]}>
              {signingIn ? 'Signing in…' : 'Sign In with Google'}
            </Text>
            {signingIn ? (
              <ActivityIndicator size="small" color={COLORS.accent} />
            ) : (
              <Text style={[styles.chevron, { color: COLORS.accent }]}>{'›'}</Text>
            )}
          </Pressable>
        )}

        <Divider accent="gold" />
        <Pressable
          style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
          onPress={() => void handleRestorePurchases()}
          accessibilityRole="button"
          accessibilityLabel="Restore previous purchases"
          accessibilityHint="Re-applies purchases made on this account. Use this after reinstalling or switching devices."
          accessibilityState={{ busy: restoring }}
          disabled={restoring}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <IconMedallion glyph={'\u{1F9FE}'} size={34} accent={COLORS.gold} />
          <Text style={[styles.settingLabel, { color: COLORS.accent, flex: 1 }]}>
            {restoring ? `${t('common.loading')}` : t('settings.restorePurchases')}
          </Text>
          {restoring ? (
            <ActivityIndicator size="small" color={COLORS.accent} />
          ) : (
            <Text style={[styles.chevron, { color: COLORS.accent }]}>{'›'}</Text>
          )}
        </Pressable>

        {Platform.OS === 'android' ? (
          <>
            <Divider accent="gold" />
            <Pressable
              style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
              onPress={() => void handleManageSubscription()}
              accessibilityRole="button"
              accessibilityLabel="Manage subscription"
              accessibilityHint="Opens the Google Play subscription management page."
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <IconMedallion glyph={'\u{1F4B3}'} size={34} accent={COLORS.gold} />
              <Text style={[styles.settingLabel, { flex: 1 }]}>Manage Subscription</Text>
              <Text style={styles.chevron}>{'›'}</Text>
            </Pressable>
          </>
        ) : null}

        <Divider accent="gold" />
        <View style={styles.panelFooter}>
          <PrimaryButton
            label={deleting ? `${t('common.loading')}` : t('settings.deleteAccount')}
            onPress={confirmDeleteAccount}
            variant="danger"
            size="medium"
            fullWidth
            disabled={deleting}
            accessibilityLabel="Delete account and data. Permanently erases your cloud profile"
          />
        </View>
      </Panel>
      {/* Purchases */}
      <SectionHeader label="PURCHASES" accent={COLORS.gold} />
      <Panel accent="gold">
        <View style={styles.settingRow}>
          <View style={styles.rowLeft}>
            <IconMedallion glyph={'\u{1F6E1}'} size={34} accent={COLORS.gold} />
            <Text style={styles.settingLabel}>Ad Removal</Text>
          </View>
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
        <Divider accent="gold" />
        <View style={styles.settingRow}>
          <View style={styles.rowLeft}>
            <IconMedallion glyph={'\u{1F451}'} size={34} accent={COLORS.gold} />
            <Text style={styles.settingLabel}>Premium Pass</Text>
          </View>
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
      </Panel>

      {/* Parental Controls */}
      <SectionHeader label="PARENTAL CONTROLS" accent={COLORS.purple} />
      <Panel accent="purple">
        {renderToggle('Spending Limit', settings?.spendingLimitEnabled ?? false, 'spendingLimitEnabled', '\u{1F6E1}', COLORS.purple)}
        <Divider accent="purple" />
        <View style={styles.settingRow}>
          <View style={styles.rowLeft}>
            <IconMedallion glyph={'\u{1F4B0}'} size={34} accent={COLORS.purple} />
            <Text style={styles.settingLabel}>Monthly Limit</Text>
          </View>
          <View style={styles.stepperGroup}>
            <StepButton
              glyph={'−'}
              accent={COLORS.purple}
              onPress={() => onUpdateSetting('monthlySpendingLimit', Math.max(0, (settings?.monthlySpendingLimit ?? 25) - 5))}
              accessibilityLabel="Decrease monthly spending limit"
            />
            <Text style={styles.stepperValue}>
              ${settings?.monthlySpendingLimit ?? 25}
            </Text>
            <StepButton
              glyph="+"
              accent={COLORS.purple}
              onPress={() => onUpdateSetting('monthlySpendingLimit', Math.min(500, (settings?.monthlySpendingLimit ?? 25) + 5))}
              accessibilityLabel="Increase monthly spending limit"
            />
          </View>
        </View>
        <Divider accent="purple" />
        {renderToggle('Require PIN for Purchases', settings?.requirePurchasePin ?? false, 'requirePurchasePin', '\u{1F510}', COLORS.purple)}
      </Panel>

      {/* Privacy */}
      <SectionHeader label="PRIVACY" accent={COLORS.cyan} />
      <Panel accent="cyan">
        {renderToggle(
          'Analytics',
          settings?.analyticsEnabled ?? true,
          'analyticsEnabled',
          '\u{1F4CA}',
          COLORS.cyan,
        )}
        <Divider accent="cyan" />
        {renderToggle(
          'Personalized Ads',
          settings?.personalizedAdsEnabled ?? true,
          'personalizedAdsEnabled',
          '\u{1F3AF}',
          COLORS.cyan,
        )}
      </Panel>

      {/* About */}
      <SectionHeader label="ABOUT" accent={COLORS.purple} />
      <Panel accent="purple">
        <View style={styles.settingRow}>
          <View style={styles.rowLeft}>
            <IconMedallion glyph={'ℹ️'} size={34} accent={COLORS.purple} />
            <Text style={styles.settingLabel}>Version</Text>
          </View>
          <Text style={styles.rowValueText}>{appVersion}</Text>
        </View>
        <Divider accent="purple" />
        <Pressable
          style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
          accessibilityRole="button"
          accessibilityLabel="Privacy Policy"
          onPress={() => openUrlSafe(PRIVACY_POLICY_URL, 'Privacy Policy')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <IconMedallion glyph={'\u{1F4C4}'} size={34} accent={COLORS.purple} />
          <Text style={[styles.settingLabel, { flex: 1 }]}>Privacy Policy</Text>
          <Text style={styles.chevron}>{'›'}</Text>
        </Pressable>
        <Divider accent="purple" />
        <Pressable
          style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
          accessibilityRole="button"
          accessibilityLabel="Terms of Service"
          onPress={() => openUrlSafe(TERMS_OF_SERVICE_URL, 'Terms of Service')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <IconMedallion glyph={'\u{1F4DC}'} size={34} accent={COLORS.purple} />
          <Text style={[styles.settingLabel, { flex: 1 }]}>Terms of Service</Text>
          <Text style={styles.chevron}>{'›'}</Text>
        </Pressable>
        <Divider accent="purple" />
        <Pressable
          style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
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
          <IconMedallion glyph={'✉️'} size={34} accent={COLORS.purple} />
          <Text style={[styles.settingLabel, { flex: 1 }]}>Contact Support</Text>
          <Text style={styles.chevron}>{'›'}</Text>
        </Pressable>
      </Panel>

      {/* Danger Zone */}
      <SectionHeader label={t('settings.dangerZone').toUpperCase()} accent={COLORS.coral} />
      <View style={styles.dangerPanel}>
        <LinearGradient
          colors={['#2a1520', '#1e1218']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <View style={styles.dangerBody}>
          <PrimaryButton
            label={t('settings.resetLocalData')}
            onPress={confirmResetProgress}
            variant="danger"
            size="medium"
            fullWidth
            accessibilityLabel="Reset local data. Clears on-device progress only"
          />
          <Text style={styles.dangerSubtext}>
            Clears on-device progress only. Account and purchases are kept.
            Use "Delete Account" above for full erasure.
          </Text>
        </View>
      </View>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  panelClip: {
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    marginHorizontal: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  settingLabel: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bodySemiBold,
    letterSpacing: 0.2,
  },
  rowValueText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: FONTS.bodyMedium,
    flexShrink: 1,
  },

  // Volume control
  volumeBlock: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  volumeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  volumePct: {
    fontSize: 14,
    fontFamily: FONTS.display,
    color: COLORS.cyan,
    letterSpacing: 1,
    textShadowColor: COLORS.cyanGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  volumeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  volumeTrack: {
    flex: 1,
  },
  stepBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    backgroundColor: 'rgba(20, 8, 40, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 5,
  },
  stepBtnPressed: {
    transform: [{ scale: 0.9 }],
    opacity: 0.85,
  },
  stepBtnText: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
  },
  stepperGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperValue: {
    minWidth: 52,
    textAlign: 'center',
    fontSize: 15,
    fontFamily: FONTS.display,
    color: COLORS.gold,
    letterSpacing: 0.5,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  // Toggle
  toggle: {
    width: 52,
    height: 30,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.cellDefault,
    padding: 2,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  toggleOn: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.borderAccent,
    ...SHADOWS.glow(COLORS.accent),
  },
  togglePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
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

  // Selectable chips (colorblind / language / theme)
  panelIntro: {
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 8,
  },
  panelIntroText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONTS.bodyMedium,
    flexShrink: 1,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  chipSwatch: {
    width: 18,
    height: 18,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  chipText: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  chipTextSelected: {
    color: COLORS.textPrimary,
  },
  chipCheck: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
  },

  // Action rows (account / about)
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  rowPressed: {
    opacity: 0.75,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chevron: {
    fontSize: 22,
    color: COLORS.textMuted,
    fontFamily: FONTS.display,
  },
  panelFooter: {
    padding: 14,
  },

  // Purchases status
  statusBadge: {
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  statusActive: {
    backgroundColor: withAlpha(COLORS.green, '25'),
    borderColor: withAlpha(COLORS.green, '40'),
    ...SHADOWS.glow(COLORS.green),
  },
  statusInactive: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: COLORS.borderDisabled,
  },
  statusText: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
  },
  statusTextActive: {
    color: COLORS.green,
    textShadowColor: COLORS.greenGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  statusTextInactive: {
    color: COLORS.textMuted,
  },

  // Danger zone
  dangerPanel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: withAlpha(COLORS.coral, '40'),
    overflow: 'hidden',
    marginBottom: 14,
    ...SHADOWS.glow(COLORS.coral),
  },
  dangerBody: {
    padding: 18,
    gap: 12,
  },
  dangerSubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONTS.bodyMedium,
    textAlign: 'center',
  },
});

export default SettingsScreen;
