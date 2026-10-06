"""Bounded batching, deduplication, and a persistent embedding cache."""

from __future__ import annotations

import asyncio
import hashlib
import json
import sqlite3
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

Pending = asyncio.Future[np.ndarray]


class BusyError(Exception):
    pass


class Store:
    def __init__(self, path: Path, namespace: str, max_cache: int = 100_000):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(path)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute(
            "CREATE TABLE IF NOT EXISTS cache "
            "(namespace TEXT, key TEXT, vector BLOB, "
            "PRIMARY KEY(namespace,key))"
        )
        self.db.execute(
            "CREATE TABLE IF NOT EXISTS collections "
            "(namespace TEXT, name TEXT, data TEXT, "
            "PRIMARY KEY(namespace,name))"
        )
        self.namespace, self.max_cache = namespace, max_cache

    def get(self, key: str) -> np.ndarray | None:
        row = self.db.execute(
            "SELECT vector FROM cache WHERE namespace=? AND key=?",
            (self.namespace, key),
        ).fetchone()
        return np.frombuffer(row[0], dtype=np.float32).copy() if row else None

    def put(self, entries: list[tuple[str, np.ndarray]]) -> None:
        with self.db:
            self.db.executemany(
                "INSERT OR REPLACE INTO cache VALUES (?,?,?)",
                [
                    (self.namespace, key, vector.astype(np.float32).tobytes())
                    for key, vector in entries
                ],
            )
            self.db.execute(
                "DELETE FROM cache WHERE rowid IN (SELECT rowid FROM "
                "cache ORDER BY rowid DESC LIMIT -1 OFFSET ?)",
                (self.max_cache,),
            )

    def collections(self) -> list[dict[str, Any]]:
        return [
            json.loads(row[0])
            for row in self.db.execute(
                "SELECT data FROM collections WHERE namespace=? ORDER BY name",
                (self.namespace,),
            )
        ]

    def collection(self, name: str) -> dict[str, Any]:
        row = self.db.execute(
            "SELECT data FROM collections WHERE namespace=? AND name=?",
            (self.namespace, name),
        ).fetchone()
        if row is None:
            raise ValueError("Reference set not found for this encoder")
        return json.loads(row[0])

    def add_collection(self, value: dict[str, Any]) -> None:
        # Immutable names prevent accidental replacement during an analysis.
        with self.db:
            self.db.execute(
                "INSERT INTO collections VALUES (?,?,?)",
                (self.namespace, value["name"], json.dumps(value)),
            )


class BatchEngine:
    def __init__(
        self,
        encoder: Any,
        store: Store,
        batch_size: int = 8,
        queue_size: int = 256,
        wait_ms: float = 10,
    ):
        if not 1 <= batch_size <= queue_size or wait_ms < 0:
            raise ValueError("Invalid batching configuration")
        self.encoder, self.store = encoder, store
        self.batch_size, self.wait_seconds = batch_size, wait_ms / 1000
        self.queue: asyncio.Queue[tuple[str, Image.Image, Pending]] = asyncio.Queue(
            queue_size
        )
        self.pending: dict[str, Pending] = {}
        self.executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="encoder")
        self.worker: asyncio.Task[None] | None = None
        self.closed = False
        self.stats = {"encoded": 0, "cache_hits": 0, "deduplicated": 0, "batches": 0}

    def start(self) -> None:
        self.worker = asyncio.create_task(self._run())

    async def close(self) -> None:
        self.closed = True
        if self.worker:
            self.worker.cancel()
            await asyncio.gather(self.worker, return_exceptions=True)
        for future in self.pending.values():
            if not future.done():
                future.set_exception(BusyError("Inference server stopped"))
        self.pending.clear()
        await asyncio.to_thread(self.executor.shutdown, wait=True)
        self.store.db.close()

    async def embed(self, image: Image.Image) -> np.ndarray:
        if self.closed:
            raise BusyError("Inference server is stopping")
        image = image.convert("RGB")
        key = hashlib.sha256(str(image.size).encode() + image.tobytes()).hexdigest()
        cached = self.store.get(key)
        if cached is not None:
            self.stats["cache_hits"] += 1
            return cached
        future = self.pending.get(key)
        if future is None:
            if self.queue.full():
                raise BusyError("Inference queue is full; retry shortly")
            future = asyncio.get_running_loop().create_future()
            # A disconnected caller must not leave an unobserved exception.
            future.add_done_callback(
                lambda done: None if done.cancelled() else done.exception()
            )
            self.pending[key] = future
            self.queue.put_nowait((key, image, future))
        else:
            self.stats["deduplicated"] += 1
        return await asyncio.shield(future)

    async def _run(self) -> None:
        while True:
            batch = [await self.queue.get()]
            deadline = asyncio.get_running_loop().time() + self.wait_seconds
            while len(batch) < self.batch_size:
                remaining = deadline - asyncio.get_running_loop().time()
                if remaining <= 0:
                    break
                try:
                    batch.append(await asyncio.wait_for(self.queue.get(), remaining))
                except TimeoutError:
                    break
            try:
                vectors = await asyncio.get_running_loop().run_in_executor(
                    self.executor, self.encoder.encode, [item[1] for item in batch]
                )
                vectors = np.asarray(vectors, dtype=np.float32)
                if vectors.ndim != 2 or len(vectors) != len(batch):
                    raise ValueError("Encoder returned invalid dimensions")
                norms = np.linalg.norm(vectors, axis=1, keepdims=True)
                if not np.isfinite(vectors).all() or (norms == 0).any():
                    raise ValueError("Encoder returned invalid vectors")
                vectors /= norms
                self.store.put(
                    [
                        (item[0], vector)
                        for item, vector in zip(batch, vectors, strict=True)
                    ]
                )
                self.stats["encoded"] += len(batch)
                self.stats["batches"] += 1
                for item, vector in zip(batch, vectors, strict=True):
                    item[2].set_result(vector)
            except asyncio.CancelledError:
                for _, _, future in batch:
                    if not future.done():
                        future.set_exception(BusyError("Inference server stopped"))
                raise
            except Exception as error:
                for _, _, future in batch:
                    if not future.done():
                        future.set_exception(error)
            finally:
                for key, _, _ in batch:
                    self.pending.pop(key, None)
                    self.queue.task_done()
