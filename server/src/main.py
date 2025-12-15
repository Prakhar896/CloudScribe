import datetime
from typing import Annotated
from uuid import uuid4
from fastapi import FastAPI, HTTPException, Header
from .background import ThreadManager
from .models import Journal, JournalInfo, JournalCreate, JournalUpdate, Note, NoteCreate, NoteUpdate
from .database import ScribeDB
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    ThreadManager.initDefault()
    ScribeDB.setup()
    yield
    ThreadManager.shutdown()
    ScribeDB.shutdown()

app = FastAPI(title='Scribe', lifespan=lifespan)

@app.get("/")
async def home():
    return {"message": "Welcome to the CloudScribe API."}

## New Journal and Note endpoints
@app.post("/new/journal", responses={
    200: {
        "status": "Journal created successfully.",
        "journal_id": "string"
    }
})
async def create_journal(info: JournalCreate):
    journal = Journal(
        id=uuid4().hex,
        title=info.title,
        description=info.description,
        author=info.author,
        keyphrase=info.keyphrase,
        created=datetime.datetime.now(datetime.timezone.utc).isoformat()
    )
    
    ScribeDB.save_journal(journal)
    return {"status": "Journal created successfully.", "journal_id": journal.id}

@app.post("/new/note", responses={
    404: {
        "detail": "Journal not found."
    },
    200: {
        "status": "Note saved successfully."
    }
})
async def create_note(note: NoteCreate, keyphrase: Annotated[str, Header()]):
    status = ScribeDB.save_note(
        note=Note(
            id=uuid4().hex,
            title=note.title,
            content=note.content,
            created=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            tags=note.tags
        ),
        journal_id=note.journal_id,
        keyphrase=keyphrase
    )
    if not status:
        raise HTTPException(status_code=404, detail="Journal not found.")
    
    return {"status": "Note saved successfully."}


## Journal Endpoints
@app.get("/journal/{journal_id}", responses={
    404: {
        "detail": "Journal not found."
    }
})
def get_journal(journal_id: str, keyphrase: Annotated[str, Header()]) -> JournalInfo:
    journal = ScribeDB.retrieve_journal_with_auth(journal_id, keyphrase)
    if journal is None:
        raise HTTPException(status_code=404, detail="Journal not found.")
    
    return journal.desensitised()

@app.put("/journal/{journal_id}", responses={
    404: {
        "detail": "Journal not found."
    }
})
async def update_journal(journal_id: str, info: JournalUpdate, keyphrase: Annotated[str, Header()]) -> JournalInfo:
    journal = ScribeDB.retrieve_journal_with_auth(journal_id, keyphrase)
    if journal is None:
        raise HTTPException(status_code=404, detail="Journal not found.")
    
    if journal.update(info):
        ScribeDB.save_journal(journal)
    
    return journal.desensitised()

@app.delete("/journal/{journal_id}", responses={
    404: {
        "detail": "Journal not found."
    },
    200: {
        "status": "Journal deleted successfully."
    }
})
async def delete_journal(journal_id: str, keyphrase: Annotated[str, Header()]) -> dict:
    status = ScribeDB.delete_journal(journal_id, keyphrase)
    if not status:
        raise HTTPException(status_code=404, detail="Journal not found.")
    
    return {"status": "Journal deleted successfully."}

@app.get("/journal/{journal_id}/notes", responses={
    404: {
        "detail": "Journal not found."
    }
})
async def get_journal_notes(journal_id: str, keyphrase: Annotated[str, Header()]) -> list[Note]:
    journal = ScribeDB.retrieve_journal_with_auth(journal_id, keyphrase)
    if journal is None:
        raise HTTPException(status_code=404, detail="Journal not found.")
    
    return journal.notes


## Note Endpoints
@app.get("/journal/{journal_id}/note/{note_id}", responses={
    404: {
        "detail": "Journal or Note not found."
    }
})
async def get_journal_note(journal_id: str, note_id: str, keyphrase: Annotated[str, Header()]) -> Note:
    journal = ScribeDB.retrieve_journal_with_auth(journal_id, keyphrase)
    if journal is None:
        raise HTTPException(status_code=404, detail="Journal or Note not found.")
    
    target_note = next((note for note in journal.notes if note.id == note_id), None)
    if target_note is None:
        raise HTTPException(status_code=404, detail="Journal or Note not found.")
    
    return target_note

@app.put("/journal/{journal_id}/note/{note_id}", responses={
    404: {
        "detail": "Journal or Note not found."
    }
})
async def update_journal_note(journal_id: str, note_id: str, info: NoteUpdate, keyphrase: Annotated[str, Header()]) -> Note:
    journal = ScribeDB.retrieve_journal_with_auth(journal_id, keyphrase)
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
        "detail": "Journal or Note not found."
    },
    200: {
        "status": "Note deleted successfully."
    }
})
async def delete_journal_note(journal_id: str, note_id: str, keyphrase: Annotated[str, Header()]) -> dict:
    journal = ScribeDB.retrieve_journal_with_auth(journal_id, keyphrase)
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
    
    return {"status": "Note deleted successfully."}