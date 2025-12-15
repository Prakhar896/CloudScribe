from pydantic import BaseModel

class Journal(BaseModel):
    id: str
    title: str
    description: str
    author: str
    keyphrase: str
    created: str
    notes: list['Note'] = []
    
    @staticmethod
    def from_dict(data: dict) -> 'Journal':
        notes = [Note.from_dict(nd) for nd in data.get("notes", []) if isinstance(nd, dict)]
        return Journal(
            id=data.get("id", ""),
            title=data.get("title", ""),
            description=data.get("description", ""),
            author=data.get("author", ""),
            keyphrase=data.get("keyphrase", ""),
            created=data.get("created", ""),
            notes=notes
        )
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "author": self.author,
            "keyphrase": self.keyphrase,
            "created": self.created,
            "notes": [note.to_dict() for note in self.notes]
        }

class Note(BaseModel):
    id: str
    title: str
    content: str
    created: str
    modified: str | None = None
    tags: list[str] = []
    
    @classmethod
    def from_dict(cls, data: dict) -> 'Note':
        return cls(
            id=data.get("id", ""),
            title=data.get("title", ""),
            content=data.get("content", ""),
            created=data.get("created", ""),
            modified=data.get("modified", ""),
            tags=data.get("tags", [])
        )
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "created": self.created,
            "modified": self.modified,
            "tags": self.tags
        }

class NoteCreate(BaseModel):
    title: str
    content: str
    tags: list[str] = []

class NoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    tags: list[str] | None = None