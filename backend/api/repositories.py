from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from typing import List, Optional
from database import get_db
import models
import schemas

from services.ai_service import generate_prompt_and_repo_metadata

DEFAULT_USER_ID = "usr_nipun_01"

router = APIRouter(prefix="/api/repositories", tags=["repositories"])

@router.post("/ai-generate", response_model=schemas.RepositoryResponse)
def ai_generate_repository(
    payload: schemas.AICreateRepoRequest,
    db: Session = Depends(get_db)
):
    user_id = payload.user_id or DEFAULT_USER_ID
    
    # 1. Synthesize prompt & metadata via AI service
    ai_meta = generate_prompt_and_repo_metadata(payload.query, payload.action_type or "custom")
    
    base_name = ai_meta["repo_name"]
    final_name = base_name
    count = 1
    while db.query(models.Repository).filter(
        models.Repository.owner_id == user_id, 
        models.Repository.name == final_name
    ).first():
        final_name = f"{base_name}-{count}"
        count += 1
        
    # 2. Create new repository (default Private)
    visibility = payload.visibility or "Private"
    new_repo = models.Repository(
        owner_id=user_id,
        name=final_name,
        description=ai_meta["description"],
        category=ai_meta["category"],
        visibility=visibility
    )
    db.add(new_repo)
    db.commit()
    db.refresh(new_repo)

    # 3. Create v1.0 initial prompt version
    first_version = models.PromptVersion(
        repository_id=new_repo.id,
        version="v1.0",
        content=ai_meta["prompt_content"],
        change_description=f"Initial prompt synthesized by PromptHub AI ({payload.action_type or 'draft'})"
    )
    db.add(first_version)
    db.commit()
    db.refresh(new_repo)

    owner = db.query(models.User).filter(models.User.id == user_id).first()

    return schemas.RepositoryResponse(
        id=new_repo.id,
        owner_id=new_repo.owner_id,
        owner_username=owner.username if owner else "user",
        owner_name=owner.name if owner else "Nipun",
        owner_avatar=owner.avatar if owner else None,
        name=new_repo.name,
        description=new_repo.description or "",
        category=new_repo.category,
        visibility=new_repo.visibility,
        created_at=new_repo.created_at,
        updated_at=new_repo.updated_at,
        versions_count=1,
        latest_version="v1.0",
        latest_prompt=ai_meta["prompt_content"]
    )


@router.get("", response_model=List[schemas.RepositoryResponse])
def list_user_repositories(
    user_id: Optional[str] = DEFAULT_USER_ID,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Repository)
    if user_id:
        user_query = query.filter(models.Repository.owner_id == user_id)
        if user_query.count() > 0:
            query = user_query
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                models.Repository.name.ilike(search_pattern),
                models.Repository.description.ilike(search_pattern),
                models.Repository.category.ilike(search_pattern)
            )
        )
    repos = query.order_by(desc(models.Repository.updated_at)).all()
    
    res = []
    for r in repos:
        latest = r.versions[0] if r.versions else None
        res.append(schemas.RepositoryResponse(
            id=r.id,
            owner_id=r.owner_id,
            owner_username=r.owner.username if r.owner else "user",
            owner_name=r.owner.name if r.owner else "Nipun",
            owner_avatar=r.owner.avatar if r.owner else None,
            name=r.name,
            description=r.description or "",
            category=r.category,
            visibility=r.visibility,
            created_at=r.created_at,
            updated_at=r.updated_at,
            versions_count=len(r.versions),
            latest_version=latest.version if latest else "v1.0",
            latest_prompt=latest.content if latest else ""
        ))
    return res

@router.get("/explore", response_model=List[schemas.RepositoryResponse])
def explore_public_repositories(
    category: Optional[str] = None,
    search: Optional[str] = None,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Repository).filter(models.Repository.visibility == "Public")
    if user_id:
        query = query.filter(models.Repository.owner_id != user_id)
    if category and category.lower() != "all":
        query = query.filter(models.Repository.category == category)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                models.Repository.name.ilike(search_pattern),
                models.Repository.description.ilike(search_pattern),
                models.Repository.category.ilike(search_pattern)
            )
        )
    repos = query.order_by(desc(models.Repository.updated_at)).all()
    
    res = []
    for r in repos:
        latest = r.versions[0] if r.versions else None
        res.append(schemas.RepositoryResponse(
            id=r.id,
            owner_id=r.owner_id,
            owner_username=r.owner.username if r.owner else "user",
            owner_name=r.owner.name if r.owner else "Developer",
            owner_avatar=r.owner.avatar if r.owner else None,
            name=r.name,
            description=r.description or "",
            category=r.category,
            visibility=r.visibility,
            created_at=r.created_at,
            updated_at=r.updated_at,
            versions_count=len(r.versions),
            latest_version=latest.version if latest else "v1.0",
            latest_prompt=latest.content if latest else ""
        ))
    return res

@router.get("/activity")
def get_recent_activity(db: Session = Depends(get_db)):
    # Recent prompt version creations/updates across user's repos
    versions = (
        db.query(models.PromptVersion)
        .join(models.Repository)
        .order_by(desc(models.PromptVersion.created_at))
        .limit(10)
        .all()
    )
    activities = []
    for v in versions:
        repo = v.repository
        activities.append({
            "id": v.id,
            "repo_id": repo.id,
            "repo_name": repo.name,
            "owner_name": repo.owner.name if repo.owner else "Nipun",
            "owner_username": repo.owner.username if repo.owner else "nipundhiman",
            "owner_avatar": repo.owner.avatar if repo.owner else None,
            "version": v.version,
            "category": repo.category,
            "change_description": v.change_description or f"Updated {repo.name}",
            "created_at": v.created_at.isoformat()
        })
    return activities

@router.post("", response_model=schemas.RepositoryResponse)
def create_repository(
    repo_in: schemas.RepositoryCreate,
    user_id: str = DEFAULT_USER_ID,
    db: Session = Depends(get_db)
):
    # Check if repo with same name exists for this user
    existing = (
        db.query(models.Repository)
        .filter(models.Repository.owner_id == user_id, models.Repository.name == repo_in.name)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail=f"Repository '{repo_in.name}' already exists.")

    new_repo = models.Repository(
        owner_id=user_id,
        name=repo_in.name.strip().lower().replace(" ", "-"),
        description=repo_in.description,
        category=repo_in.category,
        visibility=repo_in.visibility
    )
    db.add(new_repo)
    db.commit()
    db.refresh(new_repo)

    # Initial prompt version
    initial_content = repo_in.initial_prompt.strip() if repo_in.initial_prompt else f"You are a helpful AI assistant specialized in {repo_in.category}.\n\nProvide structured, clear, and accurate responses."
    
    first_version = models.PromptVersion(
        repository_id=new_repo.id,
        version="v1.0",
        content=initial_content,
        change_description="Initial prompt commit"
    )
    db.add(first_version)
    db.commit()
    db.refresh(new_repo)

    owner = db.query(models.User).filter(models.User.id == user_id).first()

    return schemas.RepositoryResponse(
        id=new_repo.id,
        owner_id=new_repo.owner_id,
        owner_username=owner.username if owner else "user",
        owner_name=owner.name if owner else "Nipun",
        owner_avatar=owner.avatar if owner else None,
        name=new_repo.name,
        description=new_repo.description or "",
        category=new_repo.category,
        visibility=new_repo.visibility,
        created_at=new_repo.created_at,
        updated_at=new_repo.updated_at,
        versions_count=1,
        latest_version="v1.0",
        latest_prompt=initial_content
    )

@router.get("/{repo_id}", response_model=schemas.RepositoryDetailResponse)
def get_repository_by_id(repo_id: str, db: Session = Depends(get_db)):
    repo = db.query(models.Repository).filter(models.Repository.id == repo_id).first()
    if not repo:
        # Try finding by name if not UUID
        repo = db.query(models.Repository).filter(models.Repository.name == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    sorted_versions = sorted(repo.versions, key=lambda v: v.created_at, reverse=True)
    latest = sorted_versions[0] if sorted_versions else None

    return schemas.RepositoryDetailResponse(
        id=repo.id,
        owner_id=repo.owner_id,
        owner_username=repo.owner.username if repo.owner else "user",
        owner_name=repo.owner.name if repo.owner else "Nipun",
        owner_avatar=repo.owner.avatar if repo.owner else None,
        name=repo.name,
        description=repo.description or "",
        category=repo.category,
        visibility=repo.visibility,
        created_at=repo.created_at,
        updated_at=repo.updated_at,
        versions_count=len(repo.versions),
        latest_version=latest.version if latest else "v1.0",
        latest_prompt=latest.content if latest else "",
        versions=[
            schemas.PromptVersionResponse(
                id=v.id,
                repository_id=v.repository_id,
                version=v.version,
                content=v.content,
                change_description=v.change_description,
                created_at=v.created_at
            ) for v in sorted_versions
        ]
    )

@router.patch("/{repo_id}", response_model=schemas.RepositoryResponse)
def update_repository(
    repo_id: str,
    repo_update: schemas.RepositoryUpdate,
    db: Session = Depends(get_db)
):
    repo = db.query(models.Repository).filter(models.Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    if repo_update.description is not None:
        repo.description = repo_update.description
    if repo_update.category is not None:
        repo.category = repo_update.category
    if repo_update.visibility is not None:
        repo.visibility = repo_update.visibility

    db.commit()
    db.refresh(repo)

    latest = repo.versions[0] if repo.versions else None

    return schemas.RepositoryResponse(
        id=repo.id,
        owner_id=repo.owner_id,
        owner_username=repo.owner.username if repo.owner else "user",
        owner_name=repo.owner.name if repo.owner else "Nipun",
        owner_avatar=repo.owner.avatar if repo.owner else None,
        name=repo.name,
        description=repo.description or "",
        category=repo.category,
        visibility=repo.visibility,
        created_at=repo.created_at,
        updated_at=repo.updated_at,
        versions_count=len(repo.versions),
        latest_version=latest.version if latest else "v1.0",
        latest_prompt=latest.content if latest else ""
    )

@router.delete("/{repo_id}")
def delete_repository(
    repo_id: str,
    user_id: str = Query(...),
    db: Session = Depends(get_db)
):
    repo = db.query(models.Repository).filter(models.Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    if repo.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this repository")
        
    db.delete(repo)
    db.commit()
    return {"detail": "Repository deleted successfully"}

