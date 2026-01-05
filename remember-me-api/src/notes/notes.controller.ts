import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: { userId: string },
    @Body() createNoteDto: CreateNoteDto,
  ) {
    return this.notesService.create(user.userId, createNoteDto);
  }

  @Get()
  async findAll(@CurrentUser() user: { userId: string }) {
    return this.notesService.findAll(user.userId);
  }

  @Get('random')
  async findRandom(@CurrentUser() user: { userId: string }) {
    return this.notesService.findRandom(user.userId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.notesService.findOne(user.userId, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() updateNoteDto: UpdateNoteDto,
  ) {
    return this.notesService.update(user.userId, id, updateNoteDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    await this.notesService.remove(user.userId, id);
  }
}

