"""Private-tailnet inference host. Run with python -m lisca.inference.server."""

from __future__ import annotations

import argparse
import asyncio
import base64
import hmac
import os
import sqlite3
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from lisca.inference.decode import decode_image
from lisca.inference.engine import BatchEngine, BusyError, Store
from lisca.inference.models import load_assays, model_factories, tasks

MAX_BODY = 64 * 1024 * 1024


class EmbeddingRequest(BaseModel):
    images: list[str] = Field(min_length=1, max_length=32)


class BodyTooLarge(HTTPException):
    def __init__(self) -> None:
        super().__init__(413, "Upload exceeds 64 MiB")


class RequestGuard:
    def __init__(self, app: Any, token: str) -> None:
        self.app, self.token = app, token

    async def __call__(self, scope: dict, receive: Callable, send: Callable) -> None:
        if scope["type"] != "http" or scope["method"] == "OPTIONS":
            return await self.app(scope, receive, send)
        headers = dict(scope["headers"])
        expected = f"Bearer {self.token}".encode()
        if not hmac.compare_digest(headers.get(b"authorization", b""), expected):
            return await JSONResponse({"detail": "Invalid server token"}, 401)(
                scope, receive, send
            )
        size = 0

        async def bounded_receive() -> dict:
            nonlocal size
            message = await receive()
            size += len(message.get("body", b""))
            if size > MAX_BODY:
                raise BodyTooLarge()
            return message

        try:
            length = int(headers.get(b"content-length", b"0"))
            if length > MAX_BODY:
                raise BodyTooLarge()
            await self.app(scope, bounded_receive, send)
        except BodyTooLarge:
            await JSONResponse({"detail": "Upload exceeds 64 MiB"}, 413)(
                scope, receive, send
            )


def create_app(
    *,
    token: str,
    data_dir: Path,
    origins: list[str],
    encoder: Any = None,
    model: str = "embeddinggemma-2",
    batch_size: int = 8,
    wait_ms: float = 10,
    reference_dir: Path | None = None,
    device: str = "cuda",
) -> FastAPI:
    if len(token) < 24 or token.startswith("replace-"):
        raise ValueError("LISCA_INFERENCE_TOKEN must have at least 24 characters")
    load_assays()
    factories = model_factories()
    if encoder is None and model not in factories:
        known = ", ".join(sorted(factories)) or "none"
        raise ValueError(f"Unknown inference model {model!r}. Registered: {known}")
    registered = tasks()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        actual = encoder or await asyncio.to_thread(factories[model], device)
        store = Store(data_dir / "inference.sqlite3", actual.identity)
        for prepare, _mount in registered:
            prepare(store, actual, reference_dir)
        engine = BatchEngine(actual, store, batch_size=batch_size, wait_ms=wait_ms)
        app.state.engine = engine
        app.state.active = 0
        engine.start()
        try:
            yield
        finally:
            await engine.close()

    app = FastAPI(title="LiSCA inference", version="1.0", lifespan=lifespan)
    app.add_middleware(RequestGuard, token=token)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.exception_handler(BusyError)
    async def busy(_request: Request, error: BusyError) -> JSONResponse:
        return JSONResponse({"detail": str(error)}, 503, headers={"Retry-After": "2"})

    @app.exception_handler(ValueError)
    async def invalid(_request: Request, error: ValueError) -> JSONResponse:
        return JSONResponse({"detail": str(error)}, 422)

    @app.exception_handler(sqlite3.IntegrityError)
    async def conflict(
        _request: Request, _error: sqlite3.IntegrityError
    ) -> JSONResponse:
        return JSONResponse({"detail": "Reference set name already exists"}, 409)

    @asynccontextmanager
    async def admission(request: Request) -> AsyncIterator[None]:
        if request.app.state.active >= 4:
            raise BusyError("Four requests already active; retry shortly")
        request.app.state.active += 1
        try:
            yield
        finally:
            request.app.state.active -= 1

    async def embed_images(engine: BatchEngine, images: list[Any]) -> np.ndarray:
        vectors = []
        for start in range(0, len(images), 32):
            vectors.extend(
                await asyncio.gather(
                    *[engine.embed(image) for image in images[start : start + 32]]
                )
            )
        return np.stack(vectors)

    @app.get("/v1/health")
    async def health(request: Request) -> dict[str, Any]:
        engine = request.app.state.engine
        return {
            "api_version": 1,
            "model_id": engine.encoder.model_id,
            "revision": engine.encoder.revision,
            "dimensions": engine.encoder.dimensions,
            "device": engine.encoder.device,
            "batch_size": engine.batch_size,
            "queue_depth": engine.queue.qsize(),
            "stats": engine.stats,
        }

    @app.post("/v1/embeddings")
    async def embeddings(body: EmbeddingRequest, request: Request) -> dict[str, Any]:
        async with admission(request):
            images = await asyncio.to_thread(
                lambda: [
                    decode_image(base64.b64decode(item, validate=True))
                    for item in body.images
                ]
            )
            vectors = await embed_images(request.app.state.engine, images)
            current = request.app.state.engine.encoder
            return {
                "model_id": current.model_id,
                "revision": current.revision,
                "vectors": vectors.tolist(),
            }

    for _prepare, mount in registered:
        mount(
            app,
            decode_image=decode_image,
            max_body=MAX_BODY,
            admission=admission,
            embed_images=embed_images,
        )
    return app


def main() -> None:
    import uvicorn

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8910)
    parser.add_argument("--model", default="embeddinggemma-2")
    parser.add_argument(
        "--data-dir", type=Path, default=Path.home() / "data/lisca-inference"
    )
    parser.add_argument(
        "--reference-dir",
        type=Path,
        default=os.environ.get("LISCA_INFERENCE_REFERENCES"),
    )
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--batch-wait-ms", type=float, default=10)
    parser.add_argument("--device", default="cuda")
    args = parser.parse_args()
    app = create_app(
        token=os.environ.get("LISCA_INFERENCE_TOKEN", ""),
        data_dir=args.data_dir,
        reference_dir=args.reference_dir,
        origins=os.environ.get(
            "LISCA_INFERENCE_ORIGINS",
            "http://localhost:18767,http://127.0.0.1:18767,tauri://localhost,"
            "http://tauri.localhost,https://tauri.localhost",
        ).split(","),
        model=args.model,
        batch_size=args.batch_size,
        wait_ms=args.batch_wait_ms,
        device=args.device,
    )
    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        workers=1,
        limit_concurrency=16,
        timeout_keep_alive=30,
        access_log=False,
    )


if __name__ == "__main__":
    main()
