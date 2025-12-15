import datetime
from typing import Annotated
from uuid import uuid4
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from .background import ThreadManager
from .models import Journal, JournalCreate, JournalUpdate, Note, NoteCreate, NoteUpdate, User, UserCreate, UserUpdate, UserInfo, ErrorMessage, StatusUpdate
from .database import ScribeDB
from .dependencies import obtain_user
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    ThreadManager.initDefault()
    ScribeDB.setup()
    yield
    ThreadManager.shutdown()
    ScribeDB.shutdown()

app = FastAPI(title='Scribe', lifespan=lifespan)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"], allow_credentials=True)

@app.get("/")
async def home():
    return {"message": "Welcome to the CloudScribe API."}

## New User, Journal and Note endpoints
@app.post("/new/user", responses={
    409: {
        "model": ErrorMessage,
        "description": "Username already exists."
    }
})
async def create_user(info: UserCreate) -> UserInfo:
    all_users = ScribeDB.deserialized_users()
    if any(u.username == info.username for u in all_users):
        raise HTTPException(status_code=409, detail="Username already exists.")
    
    user = User(
        id=uuid4().hex,
        username=info.username,
        keyphrase=info.keyphrase,
        created=datetime.datetime.now(datetime.timezone.utc).isoformat()
    )
    
    ScribeDB.save_user(user)
    return user.desensitised()

@app.post("/new/journal", responses={
    401: {
        "model": ErrorMessage,
        "description": "Unauthorized user."
    }
})
async def create_journal(info: JournalCreate, user: obtain_user) -> Journal:
    journal = Journal(
        id=uuid4().hex,
        authorID=user.id,
        title=info.title,
        description=info.description,
        created=datetime.datetime.now(datetime.timezone.utc).isoformat()
    )
    
    ScribeDB.save_journal(journal)
    return journal

@app.post("/new/note", responses={
    404: {
        "detail": "Journal not found."
    },
    401: {
        "model": ErrorMessage,
        "description": "Unauthorized user."
    }
})
async def create_note(note: NoteCreate, user: obtain_user) -> Note:
    new_note = Note(
        id=uuid4().hex,
        title=note.title,
        content=note.content,
        created=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        tags=note.tags
    )
    status = ScribeDB.save_note(
        note=new_note,
        journal_id=note.journal_id,
        authorID=user.id
    )
    if not status:
        raise HTTPException(status_code=404, detail="Journal not found.")
    
    return new_note

## User Endpoints
@app.get("/user/{user_id}", responses={
    401: {
        "model": ErrorMessage,
        "description": "Unauthorized user."
    }
})
async def get_user(user: obtain_user) -> UserInfo:
    return user.desensitised()

@app.put("/user/{user_id}", responses={
    401: {
        "model": ErrorMessage,
        "description": "Unauthorized user."
    },
    409: {
        "model": ErrorMessage,
        "description": "Username already exists."
    }
})
async def update_user(user: obtain_user, info: UserUpdate) -> UserInfo:
    if isinstance(info.username, str) and user.username != info.username:
        all_users = ScribeDB.deserialized_users()
        if any(u.username == info.username for u in all_users):
            raise HTTPException(status_code=409, detail="Username already exists.")
    
    if user.update(info):
        ScribeDB.save_user(user)
    
    return user.desensitised()

@app.delete("/user/{user_id}", responses={
    401: {
        "model": ErrorMessage,
        "description": "Unauthorized user."
    },
    200: {
        "model": StatusUpdate,
        "description": "User deleted successfully."
    }
})
async def delete_user(user: obtain_user) -> dict:
    ScribeDB.delete_user(user.id)
    return JSONResponse(content={"status": "User deleted successfully."})

## Journal Endpoints
@app.get("/journals", responses={
    401: {
        "model": ErrorMessage,
        "description": "Unauthorized user."
    }
})
async def get_user_journals(user: obtain_user) -> list[Journal]:
    journals = ScribeDB.deserialized_journals()
    user_journals = [journal for journal in journals if journal.authorID == user.id]
    return user_journals

@app.get("/journal/{journal_id}", responses={
    404: {
        "model": ErrorMessage,
        "description": "Journal not found."
    },
    401: {
        "model": ErrorMessage,
        "description": "Unauthorized user."
    }
})
def get_journal(journal_id: str, user: obtain_user) -> Journal:
    journal = ScribeDB.retrieve_journal_with_author(journal_id, user.id)
    if journal is None:
        raise HTTPException(status_code=404, detail="Journal not found.")
    
    return journal

@app.put("/journal/{journal_id}", responses={
    404: {
        "model": ErrorMessage,
        "description": "Journal not found."
    },
    401: {
        "model": ErrorMessage,
        "description": "Unauthorized user."
    }
})
async def update_journal(journal_id: str, info: JournalUpdate, user: obtain_user) -> Journal:
    journal = ScribeDB.retrieve_journal_with_author(journal_id, user.id)
    if journal is None:
        raise HTTPException(status_code=404, detail="Journal not found.")
    
    if journal.update(info):
        ScribeDB.save_journal(journal)
    
    return journal

@app.delete("/journal/{journal_id}", responses={
    404: {
        "model": ErrorMessage,
        "description": "Journal not found."
    },
    401: {
        "model": ErrorMessage,
        "description": "Unauthorized user."
    },
    200: {
        "model": StatusUpdate,
        "description": "Journal deleted successfully."
    }
})
async def delete_journal(journal_id: str, user: obtain_user):
    status = ScribeDB.delete_journal(journal_id, user.id)
    if not status:
        raise HTTPException(status_code=404, detail="Journal not found.")
    
    return JSONResponse(content={"status": "Journal deleted successfully."})

@app.get("/journal/{journal_id}/notes", responses={
    404: {
        "model": ErrorMessage,
        "description": "Journal not found."
    },
    401: {
        "model": ErrorMessage,
        "description": "Unauthorized user."
    }
})
async def get_journal_notes(journal_id: str, user: obtain_user) -> list[Note]:
    journal = ScribeDB.retrieve_journal_with_author(journal_id, user.id)
    if journal is None:
        raise HTTPException(status_code=404, detail="Journal not found.")
    
    return journal.notes

## Note Endpoints
@app.get("/journal/{journal_id}/note/{note_id}", responses={
    404: {
        "model": ErrorMessage,
        "description": "Journal or Note not found."
    },
    401: {
        "model": ErrorMessage,
        "description": "Unauthorized user."
    }
})
async def get_journal_note(journal_id: str, note_id: str, user: obtain_user) -> Note:
    journal = ScribeDB.retrieve_journal_with_author(journal_id, user.id)
    if journal is None:
        raise HTTPException(status_code=404, detail="Journal or Note not found.")
    
    target_note = next((note for note in journal.notes if note.id == note_id), None)
    if target_note is None:
        raise HTTPException(status_code=404, detail="Journal or Note not found.")
    
    return target_note

@app.put("/journal/{journal_id}/note/{note_id}", responses={
    404: {
        "model": ErrorMessage,
        "description": "Journal or Note not found."
    },
    401: {
        "model": ErrorMessage,
        "description": "Unauthorized user."
    }
})
async def update_journal_note(journal_id: str, note_id: str, info: NoteUpdate, user: obtain_user) -> Note:
    journal = ScribeDB.retrieve_journal_with_author(journal_id, user.id)
    if journal is None:
        raise HTTPException(status_code=404, detail="Journal or Note not found.")
    
    target_note = next((note for note in journal.notes if note.id == note_id), None)
    if target_note is None:
        raise HTTPException(status_code=404, detail="Journal or Note not found.")
    
    if target_note.update(info):
        ScribeDB.save_journal(journal)
    
    return target_note

@app.delete("/journal/{journal_id}/note/{note_id}", responses={
    404: {
        "model": ErrorMessage,
        "description": "Journal or Note not found."
    },
    401: {
        "model": ErrorMessage,
        "description": "Unauthorized user."
    },
    200: {
        "model": StatusUpdate,
        "description": "Note deleted successfully."
    }
})
async def delete_journal_note(journal_id: str, note_id: str, user: obtain_user):
    journal = ScribeDB.retrieve_journal_with_author(journal_id, user.id)
    if journal is None:
        raise HTTPException(status_code=404, detail="Journal or Note not found.")
    
    target_note = next((note for note in journal.notes if note.id == note_id), None)
    if target_note is None:
        raise HTTPException(status_code=404, detail="Journal or Note not found.")
    
    try:
        journal.notes.remove(target_note)
    except ValueError:
        raise HTTPException(status_code=404, detail="Journal or Note not found.")
    
    ScribeDB.save_journal(journal)
    
    return JSONResponse(content={"status": "Note deleted successfully."})