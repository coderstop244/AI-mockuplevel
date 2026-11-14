"""Celery worker configuration."""

from pathlib import Path
from tempfile import TemporaryDirectory

from celery import Celery

from src.config import settings
from src.db.storage import download_video
from src.pipeline.video_processor import VideoProcessor
from src.pipeline.chunker import EmbeddingChunker
from src.db.vector_store import VectorStore

celery_app = Celery("ingestion_worker", broker=settings.REDIS_URL, backend=settings.REDIS_URL)
celery_app.conf.broker_connection_retry_on_startup = True

video_proc = VideoProcessor(
    whisper_model_size="base",
    device="cuda",
    compute_type="float32",
)
chunker = EmbeddingChunker()
db_store = VectorStore()

@celery_app.task(name="process_video_ingestion", bind=True, max_retries=3)#creates queue
def process_video_ingestion(
    self,
    storage_path: str,
    source_id: str,
    user_id: str,
    tenant_id: str,
    course_id: str,
):
    try:
        with TemporaryDirectory(prefix=f"ingest_{source_id}_") as temp_dir:
            local_video_path = Path(temp_dir) / Path(storage_path).name
            download_video(storage_path, local_video_path)

            # 1. Process Video via FFmpeg & Whisper
            res = video_proc.process(str(local_video_path), temp_dir)

            # 2. Chunk & Embed Transcripts
            chunks = chunker.chunk_transcript(res["transcripts"], source_id)
            for chunk in chunks:
                chunk["user_id"] = user_id
                chunk["tenant_id"] = tenant_id
                chunk["course_id"] = course_id

            # 3. Store into PostgreSQL + pgvector
            db_store.store_chunks(chunks)

            return {
                "status": "SUCCESS",
                "source_id": source_id,
                "chunks_processed": len(chunks),
            }
    except (FileNotFoundError, ValueError):
        raise
    except Exception as exc:
        raise self.retry(exc=exc, countdown=10)