"""Supabase Storage helpers."""
from typing import Dict, Union

from httpx import Timeout

from pathlib import Path

from supabase import Client
from supabase._sync.client import SyncClient as SupabaseSyncClient
from storage3 import SyncStorageClient
from storage3.utils import SyncClient

from src.config import settings

from supabase.lib.client_options import ClientOptions

VIDEO_BUCKET = "Mockvdo"


class _Http1StorageClient(SyncStorageClient):
    """Storage client that avoids HTTP/2 flow-control errors on Windows."""

    def _create_session(
        self,
        base_url: str,
        headers: Dict[str, str],
        timeout: Union[int, float, Timeout],
        verify: bool = True,
    ) -> SyncClient:
        return SyncClient(
            base_url=base_url,
            headers=headers,
            timeout=timeout,
            verify=bool(verify),
            follow_redirects=True,
            http2=False,
        )


class _SupabaseClient(SupabaseSyncClient):
    @staticmethod
    def _init_storage_client(
        storage_url: str,
        headers: Dict[str, str],
        storage_client_timeout: Union[int, float, Timeout] = 20,
    ) -> SyncStorageClient:
        return _Http1StorageClient(storage_url, headers, storage_client_timeout)


storage_options = ClientOptions(
    storage_client_timeout=Timeout(
        connect=30.0,
        read=600.0,
        write=600.0,
        pool=30.0,
    )
)

supabase: Client = _SupabaseClient.create(
    settings.SUPABASE_URL,
    settings.SUPABASE_KEY,
    options=storage_options,
)


def download_video(storage_path: str, local_path: Path) -> Path:
    """Download a video object from Supabase Storage to a local file."""
    if not storage_path or Path(storage_path).is_absolute():
        raise ValueError("storage_path must be a non-empty relative Storage path")

    video_bytes = supabase.storage.from_(VIDEO_BUCKET).download(storage_path)
    local_path.write_bytes(video_bytes)
    return local_path
