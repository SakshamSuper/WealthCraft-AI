from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.crud import crud
from app.schemas import schemas
from app.models.models import User
from app.api import deps
from agents.orchestrator import AgentOrchestrator
from typing import List, Any

router = APIRouter()

@router.get("/", response_model=List[schemas.ChatResponse])
def get_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Retrieve user chat transcripts.
    """
    return crud.get_user_chat_history(db, user_id=current_user.id)

@router.post("/", response_model=schemas.ChatResponse)
def post_chat_message(
    chat_in: schemas.ChatCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Send a message to the Agentic AI Financial Orchestrator and get structured wealth advice.
    """
    # 1. Save user query in chat log
    crud.save_chat_message(db, user_id=current_user.id, role="user", content=chat_in.content)
    
    # 2. Run Orchestrator
    orchestrator = AgentOrchestrator()
    response_text = orchestrator.process_query(chat_in.content, current_user, db)
    
    # 3. Save assistant reply
    db_reply = crud.save_chat_message(
        db, 
        user_id=current_user.id, 
        role="assistant", 
        content=response_text
    )
    
    return db_reply
