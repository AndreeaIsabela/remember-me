import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleAllNotifications } from '../utils/scheduleNotifications';
import { ScheduleSettings, Note } from '../types';

export const RESCHEDULE_TASK_NAME = 'RESCHEDULE_NOTIFICATIONS';

const LAST_RESCHEDULE_KEY = 'last_reschedule_date';
const SCHEDULE_STORAGE_KEY = 'schedule_settings';
const NOTES_STORAGE_KEY = 'local_notes';

// Must be defined at module level (outside any component) so it's registered on app boot.
TaskManager.defineTask(RESCHEDULE_TASK_NAME, async () => {
  try {
    const today = new Date().toDateString();
    const lastReschedule = await AsyncStorage.getItem(LAST_RESCHEDULE_KEY);
    if (lastReschedule === today) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const settingsRaw = await AsyncStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (!settingsRaw) return BackgroundFetch.BackgroundFetchResult.NoData;

    const settings: ScheduleSettings = JSON.parse(settingsRaw);
    if (!settings.isEnabled) return BackgroundFetch.BackgroundFetchResult.NoData;

    const notesRaw = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    const allNotes: Note[] = notesRaw ? JSON.parse(notesRaw) : [];
    const notes = allNotes.filter((n) => !n.isDeleted);

    await scheduleAllNotifications(settings, notes);
    await AsyncStorage.setItem(LAST_RESCHEDULE_KEY, today);

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerRescheduleTask(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(RESCHEDULE_TASK_NAME);
  if (!isRegistered) {
    await BackgroundFetch.registerTaskAsync(RESCHEDULE_TASK_NAME, {
      minimumInterval: 60 * 60 * 24, // once per day at minimum
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }
}

export async function unregisterRescheduleTask(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(RESCHEDULE_TASK_NAME);
  if (isRegistered) {
    await BackgroundFetch.unregisterTaskAsync(RESCHEDULE_TASK_NAME);
  }
}
