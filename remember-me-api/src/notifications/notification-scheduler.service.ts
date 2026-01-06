import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  NotificationPreferences,
  NotificationPreferencesDocument,
  ScheduledTime,
} from './schemas/notification-preferences.schema';
import { NotesService } from '../notes/notes.service';

interface IntervalMinutes {
  start: number;
  end: number;
  duration: number;
}

@Injectable()
export class NotificationSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    @InjectModel(NotificationPreferences.name)
    private preferencesModel: Model<NotificationPreferencesDocument>,
    private notesService: NotesService,
  ) {}

  /**
   * Initialize next notification times for users that don't have one set
   */
  async onModuleInit(): Promise<void> {
    await this.initializeMissingNextNotificationTimes();
  }

  /**
   * Initialize nextNotificationAt for users who don't have it set
   */
  private async initializeMissingNextNotificationTimes(): Promise<void> {
    const prefsWithoutNextTime = await this.preferencesModel.find({
      isActive: true,
      $or: [
        { nextNotificationAt: null },
        { nextNotificationAt: { $exists: false } },
      ],
    });

    for (const prefs of prefsWithoutNextTime) {
      await this.scheduleNotificationsForUser(prefs);
    }

    this.logger.log(
      `Initialized notification times for ${prefsWithoutNextTime.length} users`,
    );
  }

  /**
   * Main cron job - runs every minute to check for due notifications
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processNotifications(): Promise<void> {
    const now = new Date();

    const duePreferences = await this.preferencesModel.find({
      isActive: true,
      nextNotificationAt: { $lte: now },
    }).limit(100);

    if (duePreferences.length > 0) {
      this.logger.log(`Processing ${duePreferences.length} due notifications`);
    }

    await Promise.all(
      duePreferences.map(async (prefs) => {
        try {
          await this.sendNotification(prefs.user.toString());
          await this.advanceToNextNotification(prefs);
        } catch (error) {
          this.logger.error(
            `Failed to process notification for user ${prefs.user}`,
            error,
          );
        }
      }),
    );
  }

  /**
   * Schedule notifications for a user based on their preferences
   * Calculates all daily notification times and sets the next one
   */
  async scheduleNotificationsForUser(
    preferences: NotificationPreferencesDocument,
  ): Promise<void> {
    if (!preferences.isActive || preferences.timeIntervals.length === 0) {
      await this.preferencesModel.updateOne(
        { _id: preferences._id },
        { 
          nextNotificationAt: null,
          scheduledTimes: [],
          currentNotificationIndex: 0,
        },
      );
      return;
    }

    const scheduledTimes = this.calculateNotificationTimes(
      preferences.notificationsPerDay,
      preferences.timeIntervals,
    );

    const { nextNotificationAt, nextIndex } = this.calculateNextNotificationTime(
      scheduledTimes,
      preferences.timezone,
    );

    await this.preferencesModel.updateOne(
      { _id: preferences._id },
      {
        scheduledTimes,
        currentNotificationIndex: nextIndex,
        nextNotificationAt,
      },
    );

    this.logger.log(
      `Scheduled ${scheduledTimes.length} notifications for user ${preferences.user}. Next at: ${nextNotificationAt?.toISOString()}`,
    );
  }

  /**
   * Advance to the next notification after sending one
   */
  private async advanceToNextNotification(
    preferences: NotificationPreferencesDocument,
  ): Promise<void> {
    const scheduledTimes = preferences.scheduledTimes || [];
    
    if (scheduledTimes.length === 0) {
      await this.preferencesModel.updateOne(
        { _id: preferences._id },
        { nextNotificationAt: null },
      );
      return;
    }

    const nextIndex = (preferences.currentNotificationIndex + 1) % scheduledTimes.length;
    
    const { nextNotificationAt } = this.calculateNextNotificationTimeFromIndex(
      scheduledTimes,
      nextIndex,
      preferences.timezone,
      preferences.currentNotificationIndex >= scheduledTimes.length - 1,
    );

    await this.preferencesModel.updateOne(
      { _id: preferences._id },
      {
        currentNotificationIndex: nextIndex,
        nextNotificationAt,
      },
    );
  }

  /**
   * Calculate all evenly distributed notification times across intervals
   */
  private calculateNotificationTimes(
    count: number,
    intervals: { startTime: string; endTime: string }[],
  ): ScheduledTime[] {
    const times: ScheduledTime[] = [];

    const intervalMinutes: IntervalMinutes[] = [];
    let totalMinutes = 0;

    for (const interval of intervals) {
      const [startHour, startMin] = interval.startTime.split(':').map(Number);
      const [endHour, endMin] = interval.endTime.split(':').map(Number);

      const startInMinutes = startHour * 60 + startMin;
      let endInMinutes = endHour * 60 + endMin;

      if (endInMinutes <= startInMinutes) {
        endInMinutes += 24 * 60;
      }

      const duration = endInMinutes - startInMinutes;
      intervalMinutes.push({ start: startInMinutes, end: endInMinutes, duration });
      totalMinutes += duration;
    }

    const spacing = totalMinutes / count;

    for (let i = 0; i < count; i++) {
      const targetMinute = spacing * i + spacing / 2;
      let accumulatedMinutes = 0;

      for (const interval of intervalMinutes) {
        if (targetMinute < accumulatedMinutes + interval.duration) {
          const minuteWithinInterval = targetMinute - accumulatedMinutes;
          const absoluteMinute =
            (interval.start + minuteWithinInterval) % (24 * 60);

          times.push({
            hour: Math.floor(absoluteMinute / 60),
            minute: Math.floor(absoluteMinute % 60),
          });
          break;
        }
        accumulatedMinutes += interval.duration;
      }
    }

    times.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));

    return times;
  }

  /**
   * Calculate the next notification time from the current moment
   */
  private calculateNextNotificationTime(
    scheduledTimes: ScheduledTime[],
    timezone: string,
  ): { nextNotificationAt: Date | null; nextIndex: number } {
    if (scheduledTimes.length === 0) {
      return { nextNotificationAt: null, nextIndex: 0 };
    }

    const now = new Date();
    const userNow = this.getTimeInTimezone(now, timezone);

    for (let i = 0; i < scheduledTimes.length; i++) {
      const time = scheduledTimes[i];
      if (
        time.hour > userNow.hour ||
        (time.hour === userNow.hour && time.minute > userNow.minute)
      ) {
        const nextNotificationAt = this.createDateInTimezone(
          time.hour,
          time.minute,
          timezone,
          false,
        );
        return { nextNotificationAt, nextIndex: i };
      }
    }

    const firstTime = scheduledTimes[0];
    const nextNotificationAt = this.createDateInTimezone(
      firstTime.hour,
      firstTime.minute,
      timezone,
      true,
    );
    return { nextNotificationAt, nextIndex: 0 };
  }

  /**
   * Calculate the next notification time from a specific index
   */
  private calculateNextNotificationTimeFromIndex(
    scheduledTimes: ScheduledTime[],
    index: number,
    timezone: string,
    isNextDay: boolean,
  ): { nextNotificationAt: Date | null } {
    if (scheduledTimes.length === 0 || index >= scheduledTimes.length) {
      return { nextNotificationAt: null };
    }

    const time = scheduledTimes[index];
    const nextNotificationAt = this.createDateInTimezone(
      time.hour,
      time.minute,
      timezone,
      isNextDay,
    );

    return { nextNotificationAt };
  }

  /**
   * Get current time in a specific timezone
   */
  private getTimeInTimezone(date: Date, timezone: string): { hour: number; minute: number } {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);

    return { hour, minute };
  }

  /**
   * Create a UTC Date for a specific time in a timezone
   */
  private createDateInTimezone(
    hour: number,
    minute: number,
    timezone: string,
    tomorrow: boolean,
  ): Date {
    const now = new Date();
    
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    const dateStr = formatter.format(now);
    const [year, month, day] = dateStr.split('-').map(Number);

    const targetDate = new Date(year, month - 1, day + (tomorrow ? 1 : 0));
    
    const utcDate = new Date(
      Date.UTC(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
        hour,
        minute,
        0,
      ),
    );

    const tzOffset = this.getTimezoneOffsetMinutes(timezone, utcDate);
    
    return new Date(utcDate.getTime() + tzOffset * 60 * 1000);
  }

  /**
   * Get timezone offset in minutes (positive = behind UTC, negative = ahead of UTC)
   */
  private getTimezoneOffsetMinutes(timezone: string, date: Date): number {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return (utcDate.getTime() - tzDate.getTime()) / 60000;
  }

  /**
   * Clear scheduling for a user (set nextNotificationAt to null)
   */
  async clearUserSchedule(userId: string): Promise<void> {
    await this.preferencesModel.updateOne(
      { user: userId },
      { 
        nextNotificationAt: null,
        currentNotificationIndex: 0,
      },
    );
    this.logger.log(`Cleared schedule for user ${userId}`);
  }

  /**
   * Send notification with a random note
   */
  private async sendNotification(userId: string): Promise<void> {
    try {
      const randomNote = await this.notesService.findRandom(userId);

      if (!randomNote) {
        this.logger.warn(`No notes found for user ${userId}`);
        return;
      }

      // TODO: Implement actual notification sending
      this.logger.log(
        `📬 Notification for user ${userId}: "${randomNote.text}" - Source: ${randomNote.source}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send notification to user ${userId}`,
        error,
      );
    }
  }

  /**
   * Get scheduled notification info for a user
   */
  async getUserScheduleInfo(userId: string): Promise<{
    scheduledTimes: ScheduledTime[];
    nextNotificationAt: Date | null;
    currentNotificationIndex: number;
  } | null> {
    const prefs = await this.preferencesModel.findOne({ user: userId });
    
    if (!prefs) {
      return null;
    }

    return {
      scheduledTimes: prefs.scheduledTimes || [],
      nextNotificationAt: prefs.nextNotificationAt,
      currentNotificationIndex: prefs.currentNotificationIndex,
    };
  }
}
