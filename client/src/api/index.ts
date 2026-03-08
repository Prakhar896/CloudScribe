import type {
  Journal,
  JournalCreate,
  JournalUpdate,
  Note,
  NoteCreate,
  NoteUpdate,
  UserCreate,
  UserInfo,
  UserUpdate,
  StatusUpdate
} from '../types';
import { createApiClient, createApiClientWithCreds } from './client';

export const UserAPI = {
  getUser: async (username: string, keyphrase: string): Promise<UserInfo> => {
    const api = createApiClientWithCreds(username, keyphrase);
    const response = await api.get<UserInfo>('/user');
    return response.data;
  },
  createUser: async (userCreate: UserCreate): Promise<UserInfo> => {
    const api = await createApiClient();
    const response = await api.post<UserInfo>('/new/user', userCreate);
    return response.data;
  },
  updateUser: async (userUpdate: UserUpdate): Promise<UserInfo> => {
    const api = await createApiClient();
    const response = await api.put<UserInfo>('/user', userUpdate);
    return response.data;
  },
  deleteUser: async (): Promise<StatusUpdate> => {
    const api = await createApiClient();
    const response = await api.delete<StatusUpdate>('/user');
    return response.data;
  }
};

export const JournalAPI = {
  getJournals: async (): Promise<Journal[]> => {
    const api = await createApiClient();
    const response = await api.get<Journal[]>('/journals');
    return response.data;
  },
  getJournal: async (journalId: string): Promise<Journal> => {
    const api = await createApiClient();
    const response = await api.get<Journal>(`/journal/${journalId}`);
    return response.data;
  },
  createJournal: async (journalCreate: JournalCreate): Promise<Journal> => {
    const api = await createApiClient();
    const response = await api.post<Journal>('/new/journal', journalCreate);
    return response.data;
  },
  updateJournal: async (journalId: string, journalUpdate: JournalUpdate): Promise<Journal> => {
    const api = await createApiClient();
    const response = await api.put<Journal>(`/journal/${journalId}`, journalUpdate);
    return response.data;
  },
  deleteJournal: async (journalId: string): Promise<StatusUpdate> => {
    const api = await createApiClient();
    const response = await api.delete<StatusUpdate>(`/journal/${journalId}`);
    return response.data;
  }
};

export const NoteAPI = {
  getNotes: async (journalId: string): Promise<Note[]> => {
    const api = await createApiClient();
    const response = await api.get<Note[]>(`/journal/${journalId}/notes`);
    return response.data;
  },
  getNote: async (journalId: string, noteId: string): Promise<Note> => {
    const api = await createApiClient();
    const response = await api.get<Note>(`/journal/${journalId}/note/${noteId}`);
    return response.data;
  },
  createNote: async (noteCreate: NoteCreate): Promise<Note> => {
    const api = await createApiClient();
    const response = await api.post<Note>('/new/note', noteCreate);
    return response.data;
  },
  updateNote: async (journalId: string, noteId: string, noteUpdate: NoteUpdate): Promise<Note> => {
    const api = await createApiClient();
    const response = await api.put<Note>(`/journal/${journalId}/note/${noteId}`, noteUpdate);
    return response.data;
  },
  deleteNote: async (journalId: string, noteId: string): Promise<StatusUpdate> => {
    const api = await createApiClient();
    const response = await api.delete<StatusUpdate>(`/journal/${journalId}/note/${noteId}`);
    return response.data;
  }
};
