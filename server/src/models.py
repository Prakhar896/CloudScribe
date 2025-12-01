from pydantic import BaseModel

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