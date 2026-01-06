import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationPreferencesService } from './notification-preferences.service';
import { CreateNotificationPreferencesDto } from './dto/create-notification-preferences.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@Controller('notifications/preferences')
@UseGuards(JwtAuthGuard)
export class NotificationPreferencesController {
  constructor(
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  @Post()
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateNotificationPreferencesDto,
  ) {
    return this.preferencesService.create(userId, dto);
  }

  @Get()
  findOne(@CurrentUser('sub') userId: string) {
    return this.preferencesService.findOne(userId);
  }

  @Get('jobs')
  getScheduledJobs(@CurrentUser('sub') userId: string) {
    return this.preferencesService.getScheduledJobs(userId);
  }

  @Put()
  update(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.preferencesService.update(userId, dto);
  }

  @Delete()
  remove(@CurrentUser('sub') userId: string) {
    return this.preferencesService.remove(userId);
  }

  @Patch('toggle')
  toggle(
    @CurrentUser('sub') userId: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.preferencesService.toggleActive(userId, isActive);
  }
}

