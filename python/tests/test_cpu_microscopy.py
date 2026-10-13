import numpy as np

from lisca.inference.microscopy import DIMENSIONS, embed_plane


def test_embedding_is_unit_length_and_stable():
    first = embed_plane(2, 2, [0, 10, 20, 30])
    second = embed_plane(2, 2, [0, 10, 20, 30])
    assert first.shape == (DIMENSIONS,)
    np.testing.assert_allclose(first, second)
    assert abs(float(np.linalg.norm(first)) - 1.0) < 1e-5


def test_flat_planes_keep_their_intensity():
    dark = embed_plane(2, 2, [0, 0, 0, 0])
    bright = embed_plane(2, 2, [1000, 1000, 1000, 1000])
    assert not np.allclose(dark, bright)


def test_eight_bit_promotion_matches_the_expanded_plane():
    from PIL import Image

    from lisca.inference.microscopy import CpuMicroscopyEncoder

    image = Image.new("L", (2, 2))
    image.putdata([0, 10, 20, 30])
    encoded = CpuMicroscopyEncoder("cuda").encode([image])
    expected = embed_plane(2, 2, [0, 10 * 257, 20 * 257, 30 * 257])
    np.testing.assert_allclose(encoded[0], expected)
    assert CpuMicroscopyEncoder("cuda").device == "cpu"
