import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';
import { ScheduleSettings, Note } from '../types';

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
