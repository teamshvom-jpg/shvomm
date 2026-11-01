import json
import os
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/questions", tags=["questions"])

QUESTIONS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config", "questions.json")


@router.get("")
def get_questions_schema():
    """Serves the dynamic question schema for the Gift Designer flow."""
    try:
        with open(QUESTIONS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load questions schema: {str(e)}")
