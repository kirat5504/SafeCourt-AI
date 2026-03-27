from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, INET
from sqlalchemy.sql import func
from ..core.database import Base
import uuid


class Session(Base):
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, nullable=False, default=func.now())
    last_active = Column(DateTime, nullable=False, default=func.now())
    challenge = Column(String(512), nullable=False)
    ip_address = Column(INET, nullable=True)
    user_agent = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="active")
    terminated_at = Column(DateTime, nullable=True)
