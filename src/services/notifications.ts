import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const REMINDER_IDENTIFIER = 'worddrop-daily-reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type ReminderOutcome = 'scheduled' | 'permission_denied' | 'failed';

/**
 * Schedules (or reschedules) the once-a-day reminder at the player's chosen
 * local time. Returns why it failed rather than a bare boolean, so Settings can
 * tell "you declined notifications" from "something went wrong".
 */
export async function scheduleDailyReminder(
  hour: number,
  minute: number,
  title: string,
  body: string,
): Promise<ReminderOutcome> {
  try {
    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    if (!granted) {
      const asked = await Notifications.requestPermissionsAsync();
      granted = asked.granted;
    }
    if (!granted) return 'permission_denied';

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('daily', {
        name: 'Daily puzzle',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    await cancelDailyReminder();
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_IDENTIFIER,
      content: { title, body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: Platform.OS === 'android' ? 'daily' : undefined,
      },
    });
    return 'scheduled';
  } catch (error) {
    console.warn('[Notifications] Could not schedule the reminder:', error);
    return 'failed';
  }
}

export async function cancelDailyReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER);
  } catch {
    // Nothing scheduled under that identifier; nothing to undo.
  }
}
