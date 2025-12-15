from typing import Annotated
from fastapi import Header, HTTPException, Depends
from .models import User
from .database import ScribeDB

async def authorised_user(username: Annotated[str, Header()], keyphrase: Annotated[str, Header()]) -> User:
    user = ScribeDB.retrieve_user_by_username(username)
    
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized user.")
    
    if user.keyphrase != keyphrase:
        raise HTTPException(status_code=401, detail="Unauthorized user.")
    
    return user

obtain_user = Annotated[User, Depends(authorised_user)]