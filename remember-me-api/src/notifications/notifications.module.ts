import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import {
  NotificationPreferences,
  NotificationPreferencesSchema,
} from './schemas/notification-preferences.schema';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotesModule } from '../notes/notes.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: NotificationPreferences.name, schema: NotificationPreferencesSchema },
    ]),
    NotesModule,
  ],
  controllers: [NotificationPreferencesController],
  providers: [NotificationPreferencesService, NotificationSchedulerService],
  exports: [NotificationPreferencesService],
})
export class NotificationsModule {}

