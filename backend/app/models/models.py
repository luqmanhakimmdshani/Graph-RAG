import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = uuid_pk()
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False, default="reviewer")
    sso_subject_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = uuid_pk()
    file_name: Mapped[str] = mapped_column(String, nullable=False)
    storage_path: Mapped[str] = mapped_column(String, nullable=False)
    document_type: Mapped[str] = mapped_column(String, nullable=False, default="air_waybill")
    status: Mapped[str] = mapped_column(String, nullable=False, default="uploaded")
    uploaded_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    uploaded_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    extraction_runs: Mapped[list["ExtractionRun"]] = relationship(back_populates="document")
    chunks: Mapped[list["DocumentChunk"]] = relationship(back_populates="document")


class ExtractionRun(Base):
    __tablename__ = "extraction_runs"

    id: Mapped[uuid.UUID] = uuid_pk()
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("documents.id"))
    approach: Mapped[str] = mapped_column(String, nullable=False)  # ocr | llm | hybrid
    model_name: Mapped[str] = mapped_column(String, nullable=False)
    prompt_version: Mapped[str] = mapped_column(String, nullable=False, default="v1")
    processing_time_ms: Mapped[int] = mapped_column(nullable=True)
    token_usage: Mapped[int] = mapped_column(nullable=True)
    cost_usd: Mapped[float] = mapped_column(Numeric(10, 6), nullable=True)
    run_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    document: Mapped["Document"] = relationship(back_populates="extraction_runs")
    fields: Mapped[list["ExtractedField"]] = relationship(back_populates="extraction_run")
    metric: Mapped["Metric"] = relationship(back_populates="extraction_run", uselist=False)


class ExtractedField(Base):
    __tablename__ = "extracted_fields"

    id: Mapped[uuid.UUID] = uuid_pk()
    extraction_run_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("extraction_runs.id"))
    field_name: Mapped[str] = mapped_column(String, nullable=False)
    field_value: Mapped[str] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Numeric(5, 4), nullable=True)

    extraction_run: Mapped["ExtractionRun"] = relationship(back_populates="fields")
    corrections: Mapped[list["FieldCorrection"]] = relationship(back_populates="field")


class FieldCorrection(Base):
    __tablename__ = "field_corrections"

    id: Mapped[uuid.UUID] = uuid_pk()
    field_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("extracted_fields.id"))
    corrected_value: Mapped[str] = mapped_column(Text, nullable=False)
    corrected_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    corrected_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    field: Mapped["ExtractedField"] = relationship(back_populates="corrections")


class Metric(Base):
    __tablename__ = "metrics"

    id: Mapped[uuid.UUID] = uuid_pk()
    extraction_run_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("extraction_runs.id"), unique=True)
    precision: Mapped[float] = mapped_column(Numeric(5, 4), nullable=True)
    recall: Mapped[float] = mapped_column(Numeric(5, 4), nullable=True)
    f1_score: Mapped[float] = mapped_column(Numeric(5, 4), nullable=True)

    extraction_run: Mapped["ExtractionRun"] = relationship(back_populates="metric")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id: Mapped[uuid.UUID] = uuid_pk()
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("documents.id"))
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    chunk_index: Mapped[int] = mapped_column(nullable=False)
    vector_id: Mapped[str] = mapped_column(String, nullable=False)

    document: Mapped["Document"] = relationship(back_populates="chunks")


class RagQuery(Base):
    __tablename__ = "rag_queries"

    id: Mapped[uuid.UUID] = uuid_pk()
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("documents.id"))
    asked_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[uuid.UUID] = uuid_pk()
    actor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String, nullable=False)
    entity_type: Mapped[str] = mapped_column(String, nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
