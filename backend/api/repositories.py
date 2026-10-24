from fastapi import APIRouter, Depends, HTTPException, Query, Header
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
        
    owner = db.query(models.User).filter(models.User.id == user_id).first()
    owner_username = owner.username if owner else ""

    # 2. Create new repository (default Private)
    visibility = payload.visibility or "Private"
    if final_name.lower() == owner_username.lower():
        visibility = "Private"

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


from api.auth import resolve_user_id_from_token

def build_repo_response(r: models.Repository, db: Session, current_user_id: Optional[str] = None) -> schemas.RepositoryResponse:
    latest = r.versions[0] if r.versions else None
    stars_count = db.query(models.RepositoryStar).filter(models.RepositoryStar.repository_id == r.id).count()
    is_starred = False
    if current_user_id and isinstance(current_user_id, str):
        is_starred = bool(db.query(models.RepositoryStar).filter(
            models.RepositoryStar.user_id == current_user_id,
            models.RepositoryStar.repository_id == r.id
        ).first())
    return schemas.RepositoryResponse(
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
        latest_prompt=latest.content if latest else "",
        stars_count=stars_count,
        forks_count=0,
        is_starred=is_starred
    )


@router.get("", response_model=List[schemas.RepositoryResponse])
def list_user_repositories(
    user_id: Optional[str] = Query(None),
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    current_user_id = resolve_user_id_from_token(token or authorization, db) or x_user_id
    target_user_id = user_id or current_user_id
    
    query = db.query(models.Repository)
    if target_user_id:
        # Check by id or username
        matched_user = db.query(models.User).filter(
            or_(models.User.id == target_user_id, models.User.username.ilike(target_user_id))
        ).first()
        target_uid = matched_user.id if matched_user else target_user_id
        query = query.filter(models.Repository.owner_id == target_uid)
        
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
    return [build_repo_response(r, db, current_user_id) for r in repos]

@router.get("/explore", response_model=List[schemas.RepositoryResponse])
def explore_public_repositories(
    category: Optional[str] = None,
    search: Optional[str] = None,
    user_id: Optional[str] = None,
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    current_user_id = resolve_user_id_from_token(token or authorization, db) or user_id or x_user_id
    query = db.query(models.Repository).join(models.User, models.Repository.owner_id == models.User.id).filter(
        models.Repository.visibility.ilike("Public")
    )
    if category and category.lower() != "all":
        query = query.filter(models.Repository.category.ilike(category))
    if search:
        clean_s = search.strip().lstrip('@').strip()
        search_pattern = f"%{clean_s}%"
        query = query.filter(
            or_(
                models.Repository.name.ilike(search_pattern),
                models.Repository.description.ilike(search_pattern),
                models.Repository.category.ilike(search_pattern),
                models.User.username.ilike(search_pattern),
                models.User.name.ilike(search_pattern)
            )
        )
    repos = query.order_by(desc(models.Repository.updated_at)).all()
    return [build_repo_response(r, db, current_user_id) for r in repos]

@router.get("/user/{username}", response_model=List[schemas.RepositoryResponse])
def list_public_repositories_for_user(
    username: str,
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    clean_uname = username.lstrip('@').strip()
    user = db.query(models.User).filter(
        or_(
            models.User.username.ilike(clean_uname),
            models.User.id == clean_uname,
            models.User.id == username
        )
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    current_user_id = resolve_user_id_from_token(token or authorization, db) or x_user_id
    is_owner = bool(current_user_id and current_user_id == user.id)
    
    if is_owner:
        repos = db.query(models.Repository).filter(
            models.Repository.owner_id == user.id
        ).order_by(desc(models.Repository.updated_at)).all()
    else:
        repos = db.query(models.Repository).filter(
            models.Repository.owner_id == user.id,
            or_(
                models.Repository.visibility.ilike("Public"),
                models.Repository.name.ilike(user.username)  # Special profile repo
            )
        ).order_by(desc(models.Repository.updated_at)).all()
    
    return [build_repo_response(r, db, current_user_id) for r in repos]

@router.get("/activity")
def get_recent_activity(db: Session = Depends(get_db)):
    # Recent prompt version creations/updates across repos
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
            "owner_name": repo.owner.name if repo.owner else "Creator",
            "owner_username": repo.owner.username if repo.owner else "user",
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
    user_id: Optional[str] = Query(None),
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    actual_user_id = user_id or x_user_id
    if not actual_user_id:
        actual_user_id = resolve_user_id_from_token(token or authorization, db)
    
    # Resolve the owner object
    owner = None
    if actual_user_id:
        owner = db.query(models.User).filter(
            or_(models.User.id == actual_user_id, models.User.username.ilike(actual_user_id))
        ).first()
    
    if not owner and (token or authorization):
        res_id = resolve_user_id_from_token(token or authorization, db)
        if res_id:
            owner = db.query(models.User).filter(models.User.id == res_id).first()

    if not owner:
        # Fallback to demo user only if completely anonymous development mode
        owner = db.query(models.User).filter(models.User.id == DEFAULT_USER_ID).first()
    if not owner:
        owner = db.query(models.User).first()
        
    if not owner:
        raise HTTPException(status_code=401, detail="Authentication required to create repository")

    actual_user_id = owner.id
    owner_username = owner.username

    # Clean the requested repo name
    clean_name = repo_in.name.strip().lower().replace(" ", "-")
    
    # Detect special repo: if the requested name matches ANY user's username,
    # force it to be the OWNER's username. This prevents User B from accidentally
    # creating a repo named after User A's username.
    is_special_repo = clean_name == owner_username.lower()
    if not is_special_repo:
        # Also check if the name matches another user's username
        # If so, it's NOT a special repo for this user — just a regular repo name
        # But if the name matches THIS user's username exactly, it IS a special repo
        pass
    
    if is_special_repo:
        # Special repo: always use the owner's exact current username as the name
        clean_name = owner_username.lower()

    # Check if repo with same name exists for THIS user (case-insensitive)
    existing = (
        db.query(models.Repository)
        .filter(
            models.Repository.owner_id == actual_user_id,
            models.Repository.name.ilike(clean_name)
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail=f"Repository '{repo_in.name}' already exists.")

    visibility = repo_in.visibility or "Public"

    new_repo = models.Repository(
        owner_id=actual_user_id,
        name=clean_name,
        description=repo_in.description,
        category=repo_in.category or "Coding",
        visibility=visibility
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

    return build_repo_response(new_repo, db, actual_user_id)

@router.post("/{repo_id}/star")
def toggle_star_repository(
    repo_id: str,
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    user_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    current_user_id = resolve_user_id_from_token(token or authorization, db) or user_id or x_user_id
    if not current_user_id:
        raise HTTPException(status_code=401, detail="Authentication required to star prompts")
        
    matched_user = db.query(models.User).filter(
        or_(models.User.id == current_user_id, models.User.username.ilike(current_user_id))
    ).first()
    if matched_user:
        current_user_id = matched_user.id
        
    repo = db.query(models.Repository).filter(
        or_(models.Repository.id == repo_id, models.Repository.name == repo_id)
    ).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    star = db.query(models.RepositoryStar).filter(
        models.RepositoryStar.user_id == current_user_id,
        models.RepositoryStar.repository_id == repo.id
    ).first()
    
    if star:
        db.delete(star)
        db.commit()
        starred = False
    else:
        new_star = models.RepositoryStar(
            user_id=current_user_id,
            repository_id=repo.id
        )
        db.add(new_star)

        # Notify repo owner if starred by someone else
        if repo.owner_id and repo.owner_id != current_user_id:
            sender = db.query(models.User).filter(models.User.id == current_user_id).first()
            sender_name = sender.name if sender else "Someone"
            sender_uname = sender.username if sender else "user"
            notif = models.Notification(
                recipient_id=repo.owner_id,
                sender_id=current_user_id,
                type="star",
                title="Repository Starred",
                message=f"{sender_name} (@{sender_uname}) starred your repository '{repo.name}'",
                link=f"/repo/{repo.id}",
                is_read=0
            )
            db.add(notif)

        db.commit()
        starred = True
        
    stars_count = db.query(models.RepositoryStar).filter(models.RepositoryStar.repository_id == repo.id).count()
    return {
        "starred": starred,
        "stars_count": stars_count,
        "repo_id": repo.id
    }



@router.get("/{repo_id}", response_model=schemas.RepositoryDetailResponse)
def get_repository_by_id(
    repo_id: str, 
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    user_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    repo = db.query(models.Repository).filter(models.Repository.id == repo_id).first()
    if not repo:
        # Try finding by name if not UUID
        repo = db.query(models.Repository).filter(models.Repository.name == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    current_user_id = resolve_user_id_from_token(token or authorization, db) or user_id or x_user_id
    if current_user_id:
        matched_user = db.query(models.User).filter(
            or_(models.User.id == current_user_id, models.User.username.ilike(current_user_id))
        ).first()
        if matched_user:
            current_user_id = matched_user.id

    stars_count = db.query(models.RepositoryStar).filter(models.RepositoryStar.repository_id == repo.id).count()
    is_starred = False
    if current_user_id:
        is_starred = bool(db.query(models.RepositoryStar).filter(
            models.RepositoryStar.user_id == current_user_id,
            models.RepositoryStar.repository_id == repo.id
        ).first())

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
        stars_count=stars_count,
        forks_count=0,
        is_starred=is_starred,
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

