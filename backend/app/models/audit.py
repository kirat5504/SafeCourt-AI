from sqlalchemy import Column, String, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.sql import func
from ..core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(UUID(as_uuid=True), nullable=True)
    timestamp = Column(DateTime, nullable=False, default=func.now())
    event_type = Column(String(50), nullable=False)
    metadata_json = Column(JSONB, nullable=True, name="metadata")
    ip_address = Column(INET, nullable=True)
