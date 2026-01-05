import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Note, NoteDocument } from './schemas/note.schema';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  constructor(
    @InjectModel(Note.name) private noteModel: Model<NoteDocument>,
  ) {}

  async create(userId: string, createNoteDto: CreateNoteDto): Promise<NoteDocument> {
    const note = new this.noteModel({
      ...createNoteDto,
      owner: userId,
    });
    return note.save();
  }

  async findAll(userId: string): Promise<NoteDocument[]> {
    return this.noteModel
      .find({ owner: userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findRandom(userId: string): Promise<NoteDocument | null> {
    const notes = await this.noteModel.aggregate([
      { $match: { owner: userId } },
      { $sample: { size: 1 } },
    ]);

    if (notes.length === 0) {
      return null;
    }

    return this.noteModel.hydrate(notes[0]);
  }

  async findOne(userId: string, noteId: string): Promise<NoteDocument> {
    const note = await this.noteModel.findOne({
      _id: noteId,
      owner: userId,
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    return note;
  }

  async update(
    userId: string,
    noteId: string,
    updateNoteDto: UpdateNoteDto,
  ): Promise<NoteDocument> {
    const note = await this.noteModel.findOneAndUpdate(
      { _id: noteId, owner: userId },
      updateNoteDto,
      { new: true, runValidators: true },
    );

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    return note;
  }

  async remove(userId: string, noteId: string): Promise<void> {
    const result = await this.noteModel.deleteOne({
      _id: noteId,
      owner: userId,
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Note not found');
    }
  }
}

