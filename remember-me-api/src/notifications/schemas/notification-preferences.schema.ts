import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationPreferencesDocument = HydratedDocument<NotificationPreferences>;

@Schema({ _id: false })
export class TimeInterval {
  @Prop({ required: true })
  startTime: string; 

  @Prop({ required: true })
  endTime: string; 
}

export const TimeIntervalSchema = SchemaFactory.createForClass(TimeInterval);

@Schema({ _id: false })
export class ScheduledTime {
  @Prop({ required: true })
  hour: number;

  @Prop({ required: true })
  minute: number;
}

export const ScheduledTimeSchema = SchemaFactory.createForClass(ScheduledTime);

@Schema({ timestamps: true })
export class NotificationPreferences {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  user: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 24 })
  notificationsPerDay: number;

  @Prop({ required: true })
  timezone: string; 
  @Prop({ type: [TimeIntervalSchema], required: true })
  timeIntervals: TimeInterval[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [ScheduledTimeSchema], default: [] })
  scheduledTimes: ScheduledTime[];

  @Prop({ default: 0 })
  currentNotificationIndex: number;

  @Prop({ type: Date, index: true })
  nextNotificationAt: Date | null;
}

export const NotificationPreferencesSchema = SchemaFactory.createForClass(NotificationPreferences);

NotificationPreferencesSchema.index(
  { isActive: 1, nextNotificationAt: 1 },
  { sparse: true }
);

