import apiClient from './client';
import { ServerNote, CreateNoteDto } from '../types';

export const notesApi = {
  async findAll(): Promise<ServerNote[]> {
    const response = await apiClient.get('/notes');
    return response.data;
  },

  async findOne(id: string): Promise<ServerNote> {
    const response = await apiClient.get(`/notes/${id}`);
    return response.data;
  },

  async create(data: CreateNoteDto): Promise<ServerNote> {
    const response = await apiClient.post('/notes', data);
    return response.data;
  },

  async update(id: string, data: Partial<CreateNoteDto>): Promise<ServerNote> {
    const response = await apiClient.patch(`/notes/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/notes/${id}`);
  },
};
