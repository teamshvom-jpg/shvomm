import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

STATIC_DIR = "/tmp/static" if os.environ.get("VERCEL") else os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
UPLOAD_DIR = os.path.join(STATIC_DIR, "uploads")
try:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
except OSError:
    pass

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".svg", ".webp", ".pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("")
async def upload_asset(file: UploadFile = File(...)):
    """
    Handles upload of client logos and reference aesthetic images with validation.
    """
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File extension '{ext}' is not permitted. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds the 10MB limit."
        )

    unique_filename = f"{uuid.uuid4().hex[:12]}_{file.filename.replace(' ', '_')}"
    filepath = os.path.join(UPLOAD_DIR, unique_filename)

    with open(filepath, "wb") as f:
        f.write(content)

    return {
        "filename": unique_filename,
        "url": f"/static/uploads/{unique_filename}",
        "size": len(content)
    }
