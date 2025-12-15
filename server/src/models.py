import datetime
from pydantic import BaseModel

class ErrorMessage(BaseModel):
    detail: str

class StatusUpdate(BaseModel):
    status: str

class User(BaseModel):
    id: str
    username: str
    keyphrase: str
    created: str
    modified: str | None = None
    
    @staticmethod
    def from_dict(data: dict) -> 'User':
        return User(
            id=data.get("id", ""),
            username=data.get("username", ""),
            keyphrase=data.get("keyphrase", ""),
            created=data.get("created", ""),
            modified=data.get("modified", "")
        )
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "username": self.username,
            "keyphrase": self.keyphrase,
            "created": self.created,
            "modified": self.modified
        }
    
    def update(self, info: 'UserUpdate') -> bool:
        changes = False
        if info.username is not None and info.username != self.username:
            self.username = info.username
            changes = True
        if info.keyphrase is not None and info.keyphrase != self.keyphrase:
            self.keyphrase = info.keyphrase
            changes = True
        if changes:
            self.modified = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        return changes
    
    def desensitised(self) -> 'UserInfo':
        return UserInfo(
            id=self.id,
            username=self.username,
            created=self.created,
            modified=self.modified
        )

class UserCreate(BaseModel):
    username: str
    keyphrase: str

class UserInfo(BaseModel):
    id: str
    username: str
    created: str
    modified: str | None = None

class UserUpdate(BaseModel):
    username: str | None = None
    keyphrase: str | None = None

class Journal(BaseModel):
    id: str
    authorID: str
    title: str
    description: str | None = None
    created: str
    modified: str | None = None
    notes: list['Note'] = []
    
    @staticmethod
    def from_dict(data: dict) -> 'Journal':
        notes = [Note.from_dict(nd) for nd in data.get("notes", []) if isinstance(nd, dict)]
        return Journal(
            id=data.get("id", ""),
            authorID=data.get("authorID", ""),
            title=data.get("title", ""),
            description=data.get("description", ""),
            created=data.get("created", ""),
            notes=notes
        )
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "authorID": self.authorID,
            "title": self.title,
            "description": self.description,
            "created": self.created,
            "notes": [note.to_dict() for note in self.notes]
        }
    
    def update(self, info: 'JournalUpdate') -> bool:
        changes = False
        if info.title is not None and info.title != self.title:
            self.title = info.title
            changes = True
        if info.description is not None and info.description != self.description:
            self.description = info.description
            changes = True
        if changes:
            self.modified = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        return changes

class JournalCreate(BaseModel):
    title: str
    description: str | None = None

class JournalUpdate(BaseModel):
    title: str | None = None
    description: str | None = None

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
    
    def update(self, info: 'NoteUpdate') -> bool:
        changes = False
        if info.title is not None and info.title != self.title:
            self.title = info.title
            changes = True
        if info.content is not None and info.content != self.content:
            self.content = info.content
            changes = True
        if info.tags is not None and info.tags != self.tags:
            self.tags = info.tags
            changes = True
        if changes:
            self.modified = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        return changes

class NoteCreate(BaseModel):
    journal_id: str
    title: str
    content: str
    tags: list[str] = []

class NoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    tags: list[str] | None = None