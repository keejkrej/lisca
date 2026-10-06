import asyncio
import base64
import io
import time

import numpy as np
import pytest
from PIL import Image

from lisca.inference.engine import BatchEngine, BusyError, Store

TOKEN = "test-only-token-with-at-least-24-characters"
HEADERS = {"Authorization": f"Bearer {TOKEN}"}


class FakeEncoder:
    identity = "test-encoder-v1"
    device = "test"
    model_id = "test-model"
    revision = "a" * 40
    dimensions = 2

    def __init__(self):
        self.calls = []

    def encode(self, images):
        self.calls.append(len(images))
        time.sleep(0.005)
        return np.array([[np.asarray(image).mean() / 255, 1] for image in images])


def png(value):
    stream = io.BytesIO()
    Image.new("RGB", (8, 8), (value, value, value)).save(stream, format="PNG")
    return base64.b64encode(stream.getvalue()).decode()


def test_batching_dedup_cache_and_restart(tmp_path):
    async def run():
        encoder = FakeEncoder()
        path = tmp_path / "cache.db"
        engine = BatchEngine(encoder, Store(path, encoder.identity), wait_ms=20)
        engine.start()
        images = [
            Image.new("RGB", (8, 8), (value, value, value)) for value in [0, 128, 128]
        ]
        result = await asyncio.gather(*[engine.embed(image) for image in images])
        np.testing.assert_array_equal(result[1], result[2])
        assert encoder.calls == [2]
        assert engine.stats["deduplicated"] == 1
        await engine.close()
        engine = BatchEngine(encoder, Store(path, encoder.identity))
        engine.start()
        await engine.embed(images[0])
        assert encoder.calls == [2]
        await engine.close()

    asyncio.run(run())


def test_queue_backpressure_and_shutdown_resolve_waiters(tmp_path):
    async def run():
        engine = BatchEngine(
            FakeEncoder(),
            Store(tmp_path / "cache.db", "test"),
            batch_size=1,
            queue_size=1,
        )
        pending = asyncio.create_task(engine.embed(Image.new("RGB", (2, 2))))
        await asyncio.sleep(0)
        with pytest.raises(BusyError):
            await engine.embed(Image.new("RGB", (2, 2), "white"))
        await engine.close()
        with pytest.raises(BusyError):
            await pending

    asyncio.run(run())


def test_auth_cors_reference_creation_and_movie(tmp_path):
    pytest.importorskip("fastapi")
    pytest.importorskip("httpx")
    pytest.importorskip("multipart")
    pytest.importorskip("apoptosis")
    import tifffile
    from fastapi.testclient import TestClient

    from lisca.inference.server import create_app

    app = create_app(
        token=TOKEN,
        data_dir=tmp_path,
        origins=["http://localhost:18767"],
        encoder=FakeEncoder(),
    )
    with TestClient(app) as client:
        assert client.get("/v1/health").status_code == 401
        assert client.get("/v1/health", headers=HEADERS).json()["api_version"] == 1
        response = client.options(
            "/v1/health",
            headers={
                "Origin": "http://localhost:18767",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Authorization",
            },
        )
        assert (
            response.headers["access-control-allow-origin"] == "http://localhost:18767"
        )
        examples = {
            "name": "example",
            "examples": [
                {"label": "dead", "group": "ref-a", "image_base64": png(0)},
                {"label": "viable", "group": "ref-b", "image_base64": png(255)},
            ],
        }
        assert (
            client.post("/v1/references", json=examples, headers=HEADERS).status_code
            == 201
        )
        assert (
            client.post("/v1/references", json=examples, headers=HEADERS).status_code
            == 409
        )
        stream = io.BytesIO()
        tifffile.imwrite(
            stream,
            np.arange(4 * 8 * 8, dtype=np.uint16).reshape(4, 8, 8),
            metadata={"axes": "TYX"},
            photometric="minisblack",
        )
        args = {"reference_set": "example", "group": "query", "stride": "2"}
        result = client.post(
            "/v1/viability",
            data=args,
            files={"movie": ("roi.tif", stream.getvalue())},
            headers=HEADERS,
        )
        assert result.status_code == 200, result.text
        assert result.json()["frames"] == [0, 2]
        assert len(result.json()["viable_support"]) == 2
        assert result.json()["model_id"] == "test-model"
        args["group"] = "ref-a"
        assert (
            client.post(
                "/v1/viability",
                data=args,
                files={"movie": ("roi.tif", stream.getvalue())},
                headers=HEADERS,
            ).status_code
            == 422
        )
        assert (
            client.post(
                "/v1/embeddings", json={"images": ["invalid"]}, headers=HEADERS
            ).status_code
            == 422
        )
        assert (
            client.post(
                "/v1/embeddings",
                content=b"",
                headers={**HEADERS, "Content-Length": str(65 * 1024 * 1024)},
            ).status_code
            == 413
        )
