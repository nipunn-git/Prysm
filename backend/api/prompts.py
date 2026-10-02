import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/repositories/{repo_id}/versions", tags=["versions"])

def calculate_next_version(current_versions, version_bump="patch"):
    if not current_versions:
        return "v1.0"
    
    latest = current_versions[0].version  # e.g., "v1.3"
    cleaned = latest.lstrip("v")
    parts = cleaned.split(".")
    
    try:
        major = int(parts[0]) if len(parts) > 0 else 1
        minor = int(parts[1]) if len(parts) > 1 else 0
    except ValueError:
        major, minor = 1, len(current_versions)

    if version_bump == "major":
        return f"v{major + 1}.0"
    else:
        return f"v{major}.{minor + 1}"

@router.get("", response_model=list[schemas.PromptVersionResponse])
def get_repository_versions(repo_id: str, db: Session = Depends(get_db)):
    repo = db.query(models.Repository).filter(models.Repository.id == repo_id).first()
    if not repo:
        repo = db.query(models.Repository).filter(models.Repository.name == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    sorted_versions = sorted(repo.versions, key=lambda v: v.created_at, reverse=True)
    return [
        schemas.PromptVersionResponse(
            id=v.id,
            repository_id=v.repository_id,
            version=v.version,
            content=v.content,
            change_description=v.change_description,
            created_at=v.created_at
        ) for v in sorted_versions
    ]

@router.post("", response_model=schemas.PromptVersionResponse)
def create_prompt_version(
    repo_id: str,
    payload: schemas.PromptVersionCreate,
    db: Session = Depends(get_db)
):
    repo = db.query(models.Repository).filter(models.Repository.id == repo_id).first()
    if not repo:
        repo = db.query(models.Repository).filter(models.Repository.name == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    sorted_versions = sorted(repo.versions, key=lambda v: v.created_at, reverse=True)
    next_ver = calculate_next_version(sorted_versions, payload.version_bump or "patch")
    
    new_version = models.PromptVersion(
        repository_id=repo.id,
        version=next_ver,
        content=payload.content,
        change_description=payload.change_description or f"Updated prompt to {next_ver}"
    )
    repo.updated_at = datetime.datetime.utcnow()

    db.add(new_version)
    db.commit()
    db.refresh(new_version)

    return schemas.PromptVersionResponse(
        id=new_version.id,
        repository_id=new_version.repository_id,
        version=new_version.version,
        content=new_version.content,
        change_description=new_version.change_description,
        created_at=new_version.created_at
    )

@router.get("/compare", response_model=schemas.CompareResponse)
def compare_versions(
    repo_id: str,
    v_a: str,
    v_b: str,
    db: Session = Depends(get_db)
):
    repo = db.query(models.Repository).filter(models.Repository.id == repo_id).first()
    if not repo:
        repo = db.query(models.Repository).filter(models.Repository.name == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    version_a = next((v for v in repo.versions if v.version == v_a or v.id == v_a), None)
    version_b = next((v for v in repo.versions if v.version == v_b or v.id == v_b), None)

    if not version_a or not version_b:
        raise HTTPException(status_code=400, detail="One or both versions were not found")

    return schemas.CompareResponse(
        version_a=schemas.PromptVersionResponse(
            id=version_a.id,
            repository_id=version_a.repository_id,
            version=version_a.version,
            content=version_a.content,
            change_description=version_a.change_description,
            created_at=version_a.created_at
        ),
        version_b=schemas.PromptVersionResponse(
            id=version_b.id,
            repository_id=version_b.repository_id,
            version=version_b.version,
            content=version_b.content,
            change_description=version_b.change_description,
            created_at=version_b.created_at
        )
    )
