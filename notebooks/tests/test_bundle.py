from __future__ import annotations

import json
import unittest
from pathlib import Path

BUNDLE = Path(__file__).resolve().parents[1]
SCRIPTS = BUNDLE / "scripts"
REPO = BUNDLE.parent


def _read(name: str) -> str:
    return (SCRIPTS / name).read_text(encoding="utf-8")


class TestNotebooksBundle(unittest.TestCase):
    def test_jupyter_hub_registers_lisca_kernel_and_does_not_start_server(self) -> None:
        text = _read("jupyter-hub.sh")
        self.assertIn("python -m ipykernel install", text)
        self.assertIn("--name lisca", text)
        self.assertIn('--display-name "Lisca"', text)
        self.assertNotIn("jupyter notebook", text)
        self.assertNotIn("jupyterhub-singleuser", text)
        self.assertNotIn("jupyter lab", text)
        self.assertIn("ln -sfn", text)
        self.assertIn("already exists as a directory", text)

    def test_jupyter_hub_ps1_registers_lisca_kernel_and_does_not_start_server(self) -> None:
        text = _read("jupyter-hub.ps1")
        self.assertIn("ipykernel install", text)
        self.assertIn("--name lisca", text)
        self.assertIn('--display-name "Lisca"', text)
        self.assertNotIn("jupyter notebook", text)
        self.assertNotIn("jupyterhub-singleuser", text)
        self.assertIn("SymbolicLink", text)
        self.assertIn("already exists as a directory", text)

    def test_jupyter_notebook_starts_local_server(self) -> None:
        text = _read("jupyter-notebook.sh")
        self.assertIn("jupyter notebook", text)
        self.assertNotIn("ipykernel install", text)
        self.assertIn("UV_PYTHON_INSTALL_DIR", text)
        self.assertIn(".uv/python", text)

    def test_install_lives_at_bundle_root(self) -> None:
        self.assertTrue((BUNDLE / "install.sh").is_file())
        self.assertTrue((BUNDLE / "install.ps1").is_file())
        self.assertTrue((BUNDLE / "update.sh").is_file())
        self.assertTrue((BUNDLE / "update.ps1").is_file())
        self.assertFalse((SCRIPTS / "install.sh").exists())
        self.assertFalse((SCRIPTS / "install.ps1").exists())
        self.assertFalse((SCRIPTS / "update.sh").exists())
        self.assertFalse((SCRIPTS / "update.ps1").exists())
        install_sh = (BUNDLE / "install.sh").read_text(encoding="utf-8")
        install_ps1 = (BUNDLE / "install.ps1").read_text(encoding="utf-8")
        self.assertIn("vendored under vendor/", install_sh)
        for text in (install_sh, install_ps1):
            self.assertIn("UV_PYTHON_INSTALL_DIR", text)
            self.assertIn("UV_CACHE_DIR", text)
            self.assertIn("UV_TOOL_DIR", text)
            self.assertIn("UV_PYTHON_BIN_DIR", text)
        self.assertIn(".uv/python", install_sh)
        self.assertIn("PyPI", install_sh)
        self.assertIn("vendored under vendor/", install_ps1)
        self.assertIn("PyPI", install_ps1)

    def test_pyproject_uses_vendor_path_sources_not_git(self) -> None:
        text = (BUNDLE / "pyproject.toml").read_text(encoding="utf-8")
        self.assertIn('name = "lisca-notebooks"', text)
        self.assertIn("lisca[crop]", text)
        self.assertIn('path = "vendor/lisca"', text)
        self.assertIn('path = "vendor/transfection"', text)
        self.assertIn("transfection", text)
        self.assertIn("package = false", text)
        self.assertIn('version = "0.1.2"', text)
        self.assertNotIn("apps/studio", text)
        self.assertNotIn("git =", text)
        self.assertNotIn("git+", text)
        self.assertNotIn("github.com/keejkrej", text)
        self.assertNotIn("subdirectory", text)
        python_pkg = (REPO / "python" / "pyproject.toml").read_text(encoding="utf-8")
        self.assertIn('name = "lisca"', python_pkg)
        self.assertNotEqual(text, python_pkg)

    def test_lockfile_has_no_git_sources(self) -> None:
        lock = (BUNDLE / "uv.lock").read_text(encoding="utf-8")
        self.assertNotIn("git+", lock)
        self.assertNotIn("github.com/keejkrej", lock)
        self.assertIn("vendor/lisca", lock)
        self.assertIn("vendor/transfection", lock)
        self.assertIn('name = "lisca-notebooks"', lock)
        self.assertIn('version = "0.1.2"', lock)

    def test_bundle_has_no_pyama_dependency(self) -> None:
        forbidden = ("pyama", "PYAMA", "Pyama")
        scanned = [
            BUNDLE / "pyproject.toml",
            BUNDLE / "uv.lock",
            BUNDLE / "README.md",
            BUNDLE / "notebooks" / "crop.ipynb",
            BUNDLE / "notebooks" / "analyze.ipynb",
            BUNDLE / "notebooks" / "results.ipynb",
        ]
        for path in scanned:
            text = path.read_text(encoding="utf-8")
            for token in forbidden:
                if token == "pyama" and path.name == "README.md":
                    self.assertIn("Do not use a deprecated `pyama*` package", text)
                    self.assertEqual(text.lower().count("pyama"), 1)
                    continue
                self.assertNotIn(token, text, f"{token} in {path}")
        for path in (REPO / "python" / "src").rglob("*.py"):
            text = path.read_text(encoding="utf-8")
            for token in forbidden:
                self.assertNotIn(token, text, f"{token} in {path}")

    def test_readme_tells_users_not_to_clone_and_vendors_packages(self) -> None:
        readme = (BUNDLE / "README.md").read_text(encoding="utf-8")
        self.assertIn("notebooks-v", readme)
        self.assertIn("get-notebooks.sh", readme)
        self.assertIn("./lisca-notebooks", readme)
        self.assertIn("PWD only", readme)
        self.assertIn("git clone --branch notebooks", readme)
        self.assertIn("Do **not** clone `main`", readme)
        self.assertIn("bash update.sh", readme)
        self.assertIn("git pull --ff-only", (BUNDLE / "update.sh").read_text(encoding="utf-8"))
        self.assertIn("bash scripts/jupyter-notebook.sh", readme)
        self.assertIn("bash scripts/jupyter-hub.sh", readme)
        self.assertIn("Config", readme)
        self.assertIn("lisca[crop]", readme)
        self.assertIn("transfection", readme)
        self.assertIn("vendor/lisca", readme)
        self.assertIn("vendor/transfection", readme)
        self.assertIn("PyPI", readme)
        self.assertIn("export artifact", readme)
        self.assertIn("Nobody hand-edits", readme)
        self.assertIn("does not pull `main`", readme)
        self.assertNotIn("Airgapped", readme)

    def test_update_pulls_notebooks_branch_not_release_zip(self) -> None:
        sh = (BUNDLE / "update.sh").read_text(encoding="utf-8")
        ps1 = (BUNDLE / "update.ps1").read_text(encoding="utf-8")
        pack = (REPO / "scripts" / "pack-notebooks.sh").read_text(encoding="utf-8")
        for text in (sh, ps1):
            self.assertIn("git pull --ff-only", text)
            self.assertIn("branch notebooks", text)
            self.assertIn("sync --python 3.12 --extra notebook", text)
            self.assertIn("checkout -f -B notebooks origin/notebooks", text)
            self.assertIn(".venv/", text)
            self.assertIn(".uv/", text)
            self.assertIn(".tools/", text)
            self.assertIn("UV_PYTHON_INSTALL_DIR", text)
            self.assertNotIn("api.github.com/repos/keejkrej/lisca/releases", text)
            self.assertNotIn("mktemp", text)
            self.assertNotIn("GetTempPath", text)
        self.assertIn(".tools/git", sh)
        self.assertIn("baulk/git-minimal", sh)
        self.assertIn("MinGit-2.55.0.5-64-bit.zip", ps1)
        self.assertIn("command -v git", sh)
        self.assertIn(".tools/", pack)
        publish = (REPO / "scripts" / "publish-notebooks-branch.sh").read_text(
            encoding="utf-8"
        )
        self.assertIn("HEAD:refs/heads/notebooks", publish)
        self.assertIn("--dry-run", publish)
        self.assertIn(".tools/", publish)
        release = (REPO / ".github" / "workflows" / "notebooks-release.yml").read_text(
            encoding="utf-8"
        )
        self.assertIn("workflow_dispatch", release)
        self.assertIn("publish-notebooks-branch.sh --tag", release)
        self.assertIn("ref: main", release)
        self.assertIn("tag_name: notebooks-v", release)

    def test_get_notebooks_always_clones_with_system_or_portable_git(self) -> None:
        sh = (REPO / "scripts" / "get-notebooks.sh").read_text(encoding="utf-8")
        ps1 = (REPO / "scripts" / "get-notebooks.ps1").read_text(encoding="utf-8")
        for text in (sh, ps1):
            self.assertIn("clone --branch notebooks --single-branch --depth 1", text)
            self.assertIn(".tools/git", text)
            self.assertIn("keejkrej/lisca/main/scripts/get-notebooks", text)
            self.assertNotIn("api.github.com/repos/keejkrej/lisca/releases", text)
            self.assertNotIn("Airgapped", text)
        self.assertIn("command -v git", sh)
        self.assertIn("baulk/git-minimal", sh)
        self.assertIn("MinGit-2.55.0.5-64-bit.zip", ps1)
        self.assertIn("Get-Command git", ps1)
        self.assertIn('$PWD/', sh)
        self.assertIn("lisca-notebooks", sh)
        self.assertIn(".portable-git", sh)
        self.assertIn(".portable-git", ps1)
        self.assertNotIn("LISCA_NOTEBOOKS_DIR", sh)
        self.assertNotIn("LISCA_NOTEBOOKS_DIR", ps1)
        self.assertNotIn(".local/share", sh)
        self.assertNotIn("Library/Application Support", sh)
        self.assertNotIn("mktemp", sh)
        self.assertNotIn("GetTempPath", ps1)

    def test_vendor_readme_explains_sync_not_commit(self) -> None:
        readme = (BUNDLE / "vendor" / "README.md").read_text(encoding="utf-8")
        self.assertIn("sync-notebooks-vendor.sh", readme)
        self.assertIn("Do not commit", readme)
        self.assertIn("PyPI", readme)

    def test_vendor_sync_rewrites_transfection_lisca_git_to_path(self) -> None:
        text = (REPO / "scripts" / "sync-notebooks-vendor.sh").read_text(encoding="utf-8")
        self.assertIn('lisca = { path = "../lisca" }', text)
        self.assertIn("strips any git/GitHub lisca source", text)

    def test_copied_notebooks_keep_config_cells(self) -> None:
        crop = (BUNDLE / "notebooks" / "crop.ipynb").read_text(encoding="utf-8")
        analyze = (BUNDLE / "notebooks" / "analyze.ipynb").read_text(encoding="utf-8")
        results = (BUNDLE / "notebooks" / "results.ipynb").read_text(encoding="utf-8")
        self.assertIn("POSITIONS", crop)
        self.assertIn("0..158", crop)
        self.assertIn("from lisca.services import crop", crop)
        self.assertIn("SIGNAL_CHANNEL = 1", analyze)
        self.assertIn("from transfection.services import auc, fit, timeseries", analyze)
        self.assertNotIn("SAMPLES", analyze)
        self.assertIn("SAMPLES", results)
        self.assertIn("plot_auc", results)
        self.assertIn("plot_fit", results)
        self.assertIn("plot_timeseries", results)
        self.assertIn("from transfection.services import", results)
        self.assertNotIn("SIGNAL_CHANNEL", results)
        self.assertIn("publish_sample_traces_xlsx", results)
        self.assertIn("publish_sample_tables_xlsx", results)
        self.assertIn("without re-running Tables", results)
        nb = json.loads(results)
        code_cells = [
            "".join(cell.get("source", []))
            for cell in nb["cells"]
            if cell.get("cell_type") == "code"
        ]
        self.assertEqual(len(code_cells), 3)
        config, tables, plots = code_cells
        self.assertIn("WORKSPACE", config)
        self.assertIn("INTERVAL_MINUTES", config)
        self.assertIn("SAMPLES", config)
        self.assertIn('payload["samples"]', config)
        self.assertNotIn('payload["interval"]', config)
        self.assertNotIn("maxOnsetMinutes", config)
        self.assertNotIn("analysis.channels", config)
        self.assertNotIn("xlsx", config.lower())
        self.assertIn("publish_sample_traces_xlsx", tables)
        self.assertIn("publish_sample_tables_xlsx", tables)
        self.assertIn('"auc"', tables)
        self.assertIn('"fit"', tables)
        self.assertNotIn(".png", tables)
        self.assertNotIn("plot_timeseries", tables)
        self.assertIn("plot_timeseries", plots)
        self.assertIn("plot_auc", plots)
        self.assertIn("plot_fit", plots)
        self.assertNotIn("xlsx", plots.lower())
        self.assertNotIn("publish_sample", plots)


if __name__ == "__main__":
    unittest.main()
