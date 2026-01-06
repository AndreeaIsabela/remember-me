import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  NotificationPreferences,
  NotificationPreferencesDocument,
  ScheduledTime,
} from './schemas/notification-preferences.schema';
import { CreateNotificationPreferencesDto } from './dto/create-notification-preferences.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { NotificationSchedulerService } from './notification-scheduler.service';

@Injectable()
export class NotificationPreferencesService {
  constructor(
    @InjectModel(NotificationPreferences.name)
    private preferencesModel: Model<NotificationPreferencesDocument>,
    private schedulerService: NotificationSchedulerService,
  ) {}

  async create(
    userId: string,
    dto: CreateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesDocument> {
    if (!this.isValidTimezone(dto.timezone)) {
      throw new BadRequestException('Invalid timezone');
    }

    this.validateTimeIntervals(dto.timeIntervals);

    const existing = await this.preferencesModel.findOne({ user: userId });
    if (existing) {
      throw new BadRequestException(
        'Notification preferences already exist. Use update instead.',
      );
    }

    const preferences = await this.preferencesModel.create({
      user: userId,
      ...dto,
    });

    await this.schedulerService.scheduleNotificationsForUser(preferences);

    return (await this.preferencesModel.findById(preferences._id))!;
  }

  async findOne(userId: string): Promise<NotificationPreferencesDocument> {
    const preferences = await this.preferencesModel.findOne({ user: userId });

    if (!preferences) {
      throw new NotFoundException('Notification preferences not found');
    }

    return preferences;
  }

  async findOneOrNull(
    userId: string,
  ): Promise<NotificationPreferencesDocument | null> {
    return this.preferencesModel.findOne({ user: userId });
  }

  async update(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesDocument> {
    if (dto.timezone && !this.isValidTimezone(dto.timezone)) {
      throw new BadRequestException('Invalid timezone');
    }

    if (dto.timeIntervals) {
      this.validateTimeIntervals(dto.timeIntervals);
    }

    const preferences = await this.preferencesModel.findOneAndUpdate(
      { user: userId },
      dto,
      { new: true, runValidators: true },
    );

    if (!preferences) {
      throw new NotFoundException('Notification preferences not found');
    }

    await this.schedulerService.scheduleNotificationsForUser(preferences);

    return (await this.preferencesModel.findById(preferences._id))!;
  }

  async remove(userId: string): Promise<void> {
    await this.schedulerService.clearUserSchedule(userId);

    const result = await this.preferencesModel.deleteOne({ user: userId });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Notification preferences not found');
    }
  }

  async toggleActive(
    userId: string,
    isActive: boolean,
  ): Promise<NotificationPreferencesDocument> {
    const preferences = await this.preferencesModel.findOneAndUpdate(
      { user: userId },
      { isActive },
      { new: true },
    );

    if (!preferences) {
      throw new NotFoundException('Notification preferences not found');
    }

    if (isActive) {
      await this.schedulerService.scheduleNotificationsForUser(preferences);
    } else {
      await this.schedulerService.clearUserSchedule(userId);
    }

    return (await this.preferencesModel.findById(preferences._id))!;
  }

  /**
   * Get scheduled jobs info for a user
   */
  async getScheduledJobs(userId: string): Promise<{
    scheduledTimes: ScheduledTime[];
    nextNotificationAt: Date | null;
    currentNotificationIndex: number;
  } | null> {
    return this.schedulerService.getUserScheduleInfo(userId);
  }

  private isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  private validateTimeIntervals(
    intervals: { startTime: string; endTime: string }[],
  ): void {
    if (intervals.length === 0) {
      throw new BadRequestException('At least one time interval is required');
    }

    for (const interval of intervals) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(interval.startTime) || !timeRegex.test(interval.endTime)) {
        throw new BadRequestException('Invalid time format. Use HH:mm (24-hour)');
      }
    }
  }
}
