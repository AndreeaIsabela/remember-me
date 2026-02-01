import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { notesApi } from '../api/notes.api';
import { useAuth } from './AuthContext';
import { Note, ServerNote } from '../types';

interface NotesContextType {
  notes: Note[];
  isLoading: boolean;
  addNote: (text: string, source?: string) => Promise<void>;
  updateNote: (id: string, text: string, source?: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  syncNotes: () => Promise<void>;
}

const NOTES_STORAGE_KEY = 'local_notes';

const NotesContext = createContext<NotesContextType | undefined>(undefined);

interface NotesProviderProps {
  children: ReactNode;
}

export function NotesProvider({ children }: NotesProviderProps) {
  const { isAuthenticated } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allNotes, setAllNotes] = useState<Note[]>([]); // Include soft-deleted

  // Load notes from local storage on mount
  useEffect(() => {
    loadLocalNotes();
  }, []);

  // Sync when user logs in
  useEffect(() => {
    if (isAuthenticated) {
      syncNotes();
    }
  }, [isAuthenticated]);

  const loadLocalNotes = async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
      if (stored) {
        const parsed: Note[] = JSON.parse(stored);
        setAllNotes(parsed);
        // Filter out soft-deleted notes for display
        setNotes(parsed.filter((n) => !n.isDeleted));
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveLocalNotes = async (notesToSave: Note[]) => {
    await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notesToSave));
    setAllNotes(notesToSave);
    setNotes(notesToSave.filter((n) => !n.isDeleted));
  };

  const generateId = async (): Promise<string> => {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    const hexArray = Array.from(randomBytes, (byte) =>
      byte.toString(16).padStart(2, '0')
    );
    return hexArray.join('');
  };

  const addNote = useCallback(
    async (text: string, source?: string) => {
      const newNote: Note = {
        id: await generateId(),
        text,
        source,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSynced: false,
      };

      const updatedNotes = [newNote, ...allNotes];
      await saveLocalNotes(updatedNotes);

      // If authenticated, sync immediately
      if (isAuthenticated) {
        try {
          const serverNote = await notesApi.create({ text, source });
          newNote.serverId = serverNote._id;
          newNote.isSynced = true;
          await saveLocalNotes(updatedNotes);
        } catch (error) {
          console.error('Failed to sync new note:', error);
          // Note remains local, will sync later
        }
      }
    },
    [allNotes, isAuthenticated]
  );

  const updateNote = useCallback(
    async (id: string, text: string, source?: string) => {
      const updatedNotes = allNotes.map((note) => {
        if (note.id === id) {
          return {
            ...note,
            text,
            source,
            updatedAt: new Date().toISOString(),
            isSynced: false,
          };
        }
        return note;
      });

      await saveLocalNotes(updatedNotes);

      const noteToUpdate = updatedNotes.find((n) => n.id === id);
      if (isAuthenticated && noteToUpdate?.serverId) {
        try {
          await notesApi.update(noteToUpdate.serverId, { text, source });
          noteToUpdate.isSynced = true;
          await saveLocalNotes(updatedNotes);
        } catch (error) {
          console.error('Failed to sync updated note:', error);
        }
      }
    },
    [allNotes, isAuthenticated]
  );

  const deleteNote = useCallback(
    async (id: string) => {
      const noteToDelete = allNotes.find((n) => n.id === id);

      if (!noteToDelete) return;

      if (noteToDelete.serverId && isAuthenticated) {
        // Has server ID and authenticated - soft delete and sync
        const updatedNotes = allNotes.map((note) => {
          if (note.id === id) {
            return { ...note, isDeleted: true };
          }
          return note;
        });
        await saveLocalNotes(updatedNotes);

        try {
          await notesApi.delete(noteToDelete.serverId);
          // Remove completely after successful server delete
          const finalNotes = allNotes.filter((n) => n.id !== id);
          await saveLocalNotes(finalNotes);
        } catch (error) {
          console.error('Failed to delete note on server:', error);
        }
      } else if (noteToDelete.serverId && !isAuthenticated) {
        // Has server ID but not authenticated - soft delete for later sync
        const updatedNotes = allNotes.map((note) => {
          if (note.id === id) {
            return { ...note, isDeleted: true };
          }
          return note;
        });
        await saveLocalNotes(updatedNotes);
      } else {
        // Local only - remove completely
        const updatedNotes = allNotes.filter((n) => n.id !== id);
        await saveLocalNotes(updatedNotes);
      }
    },
    [allNotes, isAuthenticated]
  );

  const syncNotes = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      // Get current local notes
      const storedRaw = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
      const localNotes: Note[] = storedRaw ? JSON.parse(storedRaw) : [];

      // 1. Upload unsynced local notes (not deleted, not synced)
      const unsyncedNotes = localNotes.filter(
        (n) => !n.isSynced && !n.isDeleted && !n.serverId
      );
      for (const note of unsyncedNotes) {
        try {
          const serverNote = await notesApi.create({
            text: note.text,
            source: note.source,
          });
          note.serverId = serverNote._id;
          note.isSynced = true;
        } catch (error) {
          console.error('Failed to upload note:', error);
        }
      }

      // 2. Handle deleted notes that need server deletion
      const deletedNotes = localNotes.filter(
        (n) => n.isDeleted && n.serverId
      );
      for (const note of deletedNotes) {
        try {
          await notesApi.delete(note.serverId!);
        } catch (error) {
          console.error('Failed to delete note on server:', error);
        }
      }

      // 3. Fetch server notes
      const serverNotes: ServerNote[] = await notesApi.findAll();

      // 4. Build merged notes list
      const mergedNotes: Note[] = [];
      const serverNoteIds = new Set(serverNotes.map((n) => n._id));

      // Add local notes that are synced and still exist on server
      // or are unsynced (local-only)
      for (const local of localNotes) {
        if (local.isDeleted) continue; // Skip deleted

        if (local.serverId) {
          // Check if still exists on server
          if (serverNoteIds.has(local.serverId)) {
            mergedNotes.push({ ...local, isSynced: true });
          }
          // If not on server, it was deleted elsewhere - don't add
        } else {
          // Local-only note
          mergedNotes.push(local);
        }
      }

      // Add server notes that don't exist locally
      for (const server of serverNotes) {
        const existsLocally = mergedNotes.some(
          (n) => n.serverId === server._id
        );
        if (!existsLocally) {
          mergedNotes.push({
            id: await generateId(),
            serverId: server._id,
            text: server.text,
            source: server.source,
            createdAt: server.createdAt,
            updatedAt: server.updatedAt,
            isSynced: true,
          });
        }
      }

      // Sort by creation date (newest first)
      mergedNotes.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      await saveLocalNotes(mergedNotes);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  return (
    <NotesContext.Provider
      value={{
        notes,
        isLoading,
        addNote,
        updateNote,
        deleteNote,
        syncNotes,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (context === undefined) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
}
