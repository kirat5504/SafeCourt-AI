from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from ..core.database import Base
import uuid


class SanitizedOutput(Base):
    __tablename__ = "sanitized_outputs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), nullable=False)
    processing_id = Column(UUID(as_uuid=True), nullable=False)
    input_type = Column(String(10), nullable=False)
    tokenized_content = Column(Text, nullable=False)
    engine = Column(String(50), nullable=False, default="gemini")
    created_at = Column(DateTime, nullable=False, default=func.now())
