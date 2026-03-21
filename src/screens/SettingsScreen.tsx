import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, FONTS } from '../constants';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';

const THEMES = [
  { id: 'dark', name: 'Dark', color: '#0a0e27' },
  { id: 'midnight', name: 'Midnight', color: '#0d1117' },
  { id: 'ocean', name: 'Ocean', color: '#0a1628' },
  { id: 'forest', name: 'Forest', color: '#0a1a0f' },
  { id: 'sunset', name: 'Sunset', color: '#1a0a0a' },
];

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
  const contextSettings = useSettings();
  const { signOut } = useAuth();

  const settings = settingsProp ?? contextSettings;
  const onUpdateSetting = onUpdateSettingProp ?? ((key: string, value: any) => contextSettings.updateSetting(key as any, value));
  const onResetProgress = onResetProgressProp ?? (() => {});
  const onSignOut = onSignOutProp ?? signOut;

  const sfxVolume = settings?.sfxVolume ?? 80;
  const musicVolume = settings?.musicVolume ?? 60;
  const hapticsEnabled = settings?.hapticsEnabled ?? settings?.haptics ?? true;
  const notificationsEnabled = settings?.notificationsEnabled ?? settings?.notifications ?? true;
  const selectedTheme = settings?.theme ?? 'dark';
  const isSignedIn = settings?.isSignedIn ?? false;
  const adsRemoved = settings?.adsRemoved ?? false;
  const premiumPass = settings?.premiumPass ?? false;
  const appVersion = settings?.version ?? '1.0.0';

  const handleVolumeChange = (key: string, currentValue: number, delta: number) => {
    const newValue = Math.max(0, Math.min(100, currentValue + delta));
    onUpdateSetting(key, newValue);
  };

  const confirmResetProgress = () => {
    Alert.alert(
      'Reset Progress',
      'This will permanently delete all your game progress. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: onResetProgress },
      ],
    );
  };

  const confirmSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', onPress: onSignOut },
      ],
    );
  };

  const renderVolumeControl = (label: string, settingKey: string, value: number) => (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.volumeControl}>
        <TouchableOpacity
          style={styles.volumeBtn}
          onPress={() => handleVolumeChange(settingKey, value, -10)}
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
      >
        <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
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
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          {isSignedIn ? (
            <>
              <TouchableOpacity style={styles.actionRow}>
                <Text style={styles.settingLabel}>Link Account</Text>
                <Text style={styles.chevron}>{'\u203A'}</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.actionRow} onPress={confirmSignOut}>
                <Text style={[styles.settingLabel, { color: COLORS.coral }]}>
                  Sign Out
                </Text>
                <Text style={[styles.chevron, { color: COLORS.coral }]}>{'\u203A'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => onUpdateSetting('isSignedIn', true)}
            >
              <Text style={[styles.settingLabel, { color: COLORS.accent }]}>
                Sign In
              </Text>
              <Text style={[styles.chevron, { color: COLORS.accent }]}>{'\u203A'}</Text>
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
          <TouchableOpacity style={styles.actionRow}>
            <Text style={styles.settingLabel}>Privacy Policy</Text>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.actionRow}>
            <Text style={styles.settingLabel}>Terms of Service</Text>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <Text style={[styles.sectionTitle, { color: COLORS.coral }]}>
          Danger Zone
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
          >
            <Text style={styles.dangerButtonText}>Reset Progress</Text>
            <Text style={styles.dangerSubtext}>
              This will permanently delete all data
            </Text>
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
    borderColor: 'rgba(0,212,255,0.3)',
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
  },
  bottomSpacer: {
    height: 40,
  },
});

export default SettingsScreen;
