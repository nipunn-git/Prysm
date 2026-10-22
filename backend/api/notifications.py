from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List
from database import get_db
import models
import schemas
from api.auth import resolve_user_id_from_token

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

def get_current_user_id(
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    user_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
) -> str:
    resolved = resolve_user_id_from_token(token or authorization, db)
    if not resolved:
        fallback = user_id or x_user_id
        if fallback and isinstance(fallback, str) and fallback.strip():
            candidate = db.query(models.User).filter(
                (models.User.id == fallback.strip()) | (models.User.username.ilike(fallback.strip()))
            ).first()
            if candidate:
                resolved = candidate.id
    if not resolved:
        raise HTTPException(status_code=401, detail="Authentication required")
    return resolved

@router.get("", response_model=schemas.NotificationListResponse)
def list_notifications(
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    user_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    try:
        current_uid = get_current_user_id(token, authorization, x_user_id, user_id, db)
    except HTTPException:
        return schemas.NotificationListResponse(notifications=[], unread_count=0)

    notifs = db.query(models.Notification).filter(
        models.Notification.recipient_id == current_uid
    ).order_by(desc(models.Notification.created_at)).limit(50).all()

    unread_count = db.query(models.Notification).filter(
        models.Notification.recipient_id == current_uid,
        models.Notification.is_read == 0
    ).count()

    result = []
    for n in notifs:
        sender_username = n.sender.username if n.sender else None
        sender_name = n.sender.name if n.sender else None
        sender_avatar = n.sender.avatar if n.sender else None

        result.append(schemas.NotificationResponse(
            id=n.id,
            recipient_id=n.recipient_id,
            sender_id=n.sender_id,
            sender_username=sender_username,
            sender_name=sender_name,
            sender_avatar=sender_avatar,
            type=n.type or "follow",
            title=n.title,
            message=n.message,
            link=n.link,
            is_read=bool(n.is_read),
            created_at=n.created_at
        ))

    return schemas.NotificationListResponse(notifications=result, unread_count=unread_count)

@router.post("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: str,
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    user_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    current_uid = get_current_user_id(token, authorization, x_user_id, user_id, db)
    notif = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.recipient_id == current_uid
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = 1
    db.commit()
    return {"status": "success", "id": notification_id, "is_read": True}

@router.post("/read-all")
def mark_all_as_read(
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    user_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    current_uid = get_current_user_id(token, authorization, x_user_id, user_id, db)
    db.query(models.Notification).filter(
        models.Notification.recipient_id == current_uid,
        models.Notification.is_read == 0
    ).update({"is_read": 1}, synchronize_session=False)
    db.commit()
    return {"status": "success", "message": "All notifications marked as read"}

@router.delete("/{notification_id}")
def delete_notification(
    notification_id: str,
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    user_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    current_uid = get_current_user_id(token, authorization, x_user_id, user_id, db)
    notif = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.recipient_id == current_uid
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notif)
    db.commit()
    return {"status": "success", "id": notification_id}

@router.delete("")
def clear_all_notifications(
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    user_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    current_uid = get_current_user_id(token, authorization, x_user_id, user_id, db)
    db.query(models.Notification).filter(
        models.Notification.recipient_id == current_uid
    ).delete(synchronize_session=False)
    db.commit()
    return {"status": "success", "message": "Notifications cleared"}
