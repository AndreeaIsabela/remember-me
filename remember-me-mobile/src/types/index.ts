export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Note {
  id: string;
  serverId?: string;
  text: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
  isSynced: boolean;
  isDeleted?: boolean;
}

export interface ServerNote {
  _id: string;
  text: string;
  source?: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteDto {
  text: string;
  source?: string;
}
