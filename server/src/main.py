import datetime
from uuid import uuid4
from fastapi import FastAPI, HTTPException
from .background import ThreadManager
from .models import Note, NoteCreate, NoteUpdate
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
    return {"message": "Hello, World!"}

@app.get("/notes")
async def get_notes() -> list[Note]:
    return ScribeDB.load_entries()

@app.post("/notes/new")
async def create_note(note: NoteCreate) -> dict:
    ScribeDB.save_entry(Note(
        id=uuid4().hex,
        title=note.title,
        content=note.content,
        created=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        tags=note.tags
    ))
    return {"status": "Note saved successfully."}

@app.delete("/notes/{note_id}")
async def delete_note(note_id: str) -> dict:
    ScribeDB.delete_entry(note_id)
    return {"status": "Note deleted successfully."}

@app.put("/notes/{note_id}")
async def update_note(note_id: str, note: NoteUpdate) -> dict:
    existing_notes = ScribeDB.load_entries()
    if note_id not in [n.id for n in existing_notes]:
        raise HTTPException(status_code=404, detail="Note not found.")
    
    target_note = next(n for n in existing_notes if n.id == note_id)
    
    changes = False
    if note.title is not None:
        target_note.title = note.title
        changes = True
    if note.content is not None:
        target_note.content = note.content
        changes = True
    if note.tags is not None:
        target_note.tags = note.tags
        changes = True
    
    if changes:
        target_note.modified = datetime.datetime.now(datetime.timezone.utc).isoformat()
        ScribeDB.save_entry(target_note)
    
    return {"status": "Note updated successfully."}