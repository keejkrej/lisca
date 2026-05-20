# Python package

Editable install from the repo root:

```bash
cd python
uv sync
```

Build a wheel:

```bash
cd python
python -m build
```

Shared dev dependency versions live in `pyproject.toml` (`[dependency-groups]` and `[tool.uv] constraint-dependencies`). Bump versions there only.
