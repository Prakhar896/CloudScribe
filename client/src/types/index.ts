// API Types based on OpenAPI schema

export interface ErrorMessage {
    detail: string;
}

export interface ValidationError {
    loc: (string | number)[];
    msg: string;
    type: string;
}

export interface HTTPValidationError {
    detail: ValidationError[];
}

export interface Note {
    id: string;
    title: string;
    content: string;
    created: string;
    modified?: string | null;
    tags: string[];
}

export interface NoteCreate {
    journal_id: string;
    title: string;
    content: string;
    tags?: string[];
}

export interface NoteUpdate {
    title?: string | null;
    content?: string | null;
    tags?: string[] | null;
}

export interface Journal {
    id: string;
    authorID: string;
    title: string;
    description?: string | null;
    created: string;
    modified?: string | null;
    notes: Note[];
}

export interface JournalCreate {
    title: string;
    description?: string | null;
}

export interface JournalUpdate {
    title?: string | null;
    description?: string | null;
}

export interface UserCreate {
    username: string;
    keyphrase: string;
}

export interface UserInfo {
    id: string;
    username: string;
    created: string;
    modified?: string | null;
}

export interface UserUpdate {
    username?: string | null;
    keyphrase?: string | null;
}

export interface StatusUpdate {
    status: string;
}
