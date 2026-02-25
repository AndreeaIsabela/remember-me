import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { useNotes } from '../contexts/NotesContext';
import { ScheduleSettings, Note } from '../types';

const SCHEDULE_STORAGE_KEY = 'schedule_settings';

const DEFAULT_SETTINGS: ScheduleSettings = {
  startHour: 9,
  endHour: 18,
  notificationCount: 3,
  isEnabled: false,
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function formatHour(hour: number): string {
  const h = hour % 24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:00 ${suffix}`;
}

async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleAllNotifications(
  settings: ScheduleSettings,
  notes: Note[],
): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!settings.isEnabled || notes.length === 0) return 0;

  const { startHour, endHour, notificationCount } = settings;
  const intervalMinutes = (endHour - startHour) * 60;

  for (let i = 0; i < notificationCount; i++) {
    const randomNote = notes[Math.floor(Math.random() * notes.length)];
    const randomMinutes = Math.floor(Math.random() * intervalMinutes);
    const hour = Math.floor((startHour * 60 + randomMinutes) / 60);
    const minute = (startHour * 60 + randomMinutes) % 60;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Remember This',
        body: randomNote.text,
        data: { noteId: randomNote.id },
        ...(Platform.OS === 'android' && { sound: true }),
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }

  return notificationCount;
}

function HourStepper({
  label,
  value,
  onChange,
  min = 0,
  max = 23,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <TouchableOpacity
          style={[styles.stepperButton, value <= min && styles.stepperButtonDisabled]}
          onPress={() => value > min && onChange(value - 1)}
          disabled={value <= min}
        >
          <Ionicons name="remove" size={20} color={value <= min ? '#ccc' : '#4CAF50'} />
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{formatHour(value)}</Text>
        <TouchableOpacity
          style={[styles.stepperButton, value >= max && styles.stepperButtonDisabled]}
          onPress={() => value < max && onChange(value + 1)}
          disabled={value >= max}
        >
          <Ionicons name="add" size={20} color={value >= max ? '#ccc' : '#4CAF50'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CountStepper({
  label,
  value,
  onChange,
  min = 1,
  max = 20,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <TouchableOpacity
          style={[styles.stepperButton, value <= min && styles.stepperButtonDisabled]}
          onPress={() => value > min && onChange(value - 1)}
          disabled={value <= min}
        >
          <Ionicons name="remove" size={20} color={value <= min ? '#ccc' : '#4CAF50'} />
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{value}</Text>
        <TouchableOpacity
          style={[styles.stepperButton, value >= max && styles.stepperButtonDisabled]}
          onPress={() => value < max && onChange(value + 1)}
          disabled={value >= max}
        >
          <Ionicons name="add" size={20} color={value >= max ? '#ccc' : '#4CAF50'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function ScheduleScreen() {
  const navigation = useNavigation();
  const { notes } = useNotes();
  const [settings, setSettings] = useState<ScheduleSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<ScheduleSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges =
    settings.startHour !== savedSettings.startHour ||
    settings.endHour !== savedSettings.endHour ||
    settings.notificationCount !== savedSettings.notificationCount ||
    settings.isEnabled !== savedSettings.isEnabled;

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(SCHEDULE_STORAGE_KEY);
      if (stored) {
        const parsed: ScheduleSettings = JSON.parse(stored);
        setSettings(parsed);
        setSavedSettings(parsed);
      }
    } catch (error) {
      console.error('Failed to load schedule settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = useCallback(
    <K extends keyof ScheduleSettings>(key: K, value: ScheduleSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSave = async () => {
    if (settings.startHour >= settings.endHour) {
      Alert.alert('Invalid Time Range', 'Start hour must be before end hour.');
      return;
    }

    setIsSaving(true);
    try {
      if (settings.isEnabled) {
        const granted = await requestNotificationPermissions();
        if (!granted) {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to receive reminders.',
          );
          setIsSaving(false);
          return;
        }

        if (notes.length === 0) {
          Alert.alert(
            'No Notes',
            'Add some notes first so we have something to remind you about!',
          );
          setIsSaving(false);
          return;
        }
      }

      await AsyncStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(settings));
      const count = await scheduleAllNotifications(settings, notes);
      setSavedSettings(settings);

      Alert.alert(
        'Saved',
        settings.isEnabled
          ? `${count} daily reminders set between ${formatHour(settings.startHour)} and ${formatHour(settings.endHour)}. They'll repeat every day until you change or disable them.`
          : 'Schedule saved. Notifications are currently off.',
      );
    } catch (error) {
      console.error('Failed to save schedule:', error);
      Alert.alert('Error', 'Something went wrong while saving your schedule.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <Ionicons name="notifications-outline" size={22} color="#4CAF50" />
            </View>
            <Text style={styles.cardTitle}>Notifications</Text>
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Enable daily reminders</Text>
            <Switch
              value={settings.isEnabled}
              onValueChange={(v) => updateSetting('isEnabled', v)}
              trackColor={{ false: '#e0e0e0', true: '#a5d6a7' }}
              thumbColor={settings.isEnabled ? '#4CAF50' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={[styles.card, !settings.isEnabled && styles.cardDisabled]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <Ionicons name="time-outline" size={22} color="#4CAF50" />
            </View>
            <Text style={styles.cardTitle}>Time Window</Text>
          </View>
          <Text style={styles.cardDescription}>
            Set the hours between which you want to receive reminders.
          </Text>
          <HourStepper
            label="From"
            value={settings.startHour}
            onChange={(v) => updateSetting('startHour', v)}
            max={22}
          />
          <View style={styles.divider} />
          <HourStepper
            label="Until"
            value={settings.endHour}
            onChange={(v) => updateSetting('endHour', v)}
            min={1}
          />
          {settings.startHour >= settings.endHour && (
            <Text style={styles.validationError}>Start hour must be before end hour</Text>
          )}
        </View>

        <View style={[styles.card, !settings.isEnabled && styles.cardDisabled]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <Ionicons name="repeat-outline" size={22} color="#4CAF50" />
            </View>
            <Text style={styles.cardTitle}>Frequency</Text>
          </View>
          <Text style={styles.cardDescription}>
            How many random notes to send per day.
          </Text>
          <CountStepper
            label="Per day"
            value={settings.notificationCount}
            onChange={(v) => updateSetting('notificationCount', v)}
          />
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color="#666" />
          <Text style={styles.infoText}>
            {notes.length === 0
              ? 'You have no notes yet. Add some notes first to receive reminders.'
              : `You have ${notes.length} note${notes.length === 1 ? '' : 's'}. Each notification will show a random note from your collection.`}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            (!hasChanges || isSaving) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Schedule</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  cardDescription: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
    lineHeight: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  stepperLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonDisabled: {
    backgroundColor: '#fafafa',
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    minWidth: 80,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 4,
  },
  validationError: {
    fontSize: 13,
    color: '#e74c3c',
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f4f0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  saveButtonDisabled: {
    backgroundColor: '#c8e6c9',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
});
