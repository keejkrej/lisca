from __future__ import annotations

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

    def test_install_lives_at_bundle_root(self) -> None:
        self.assertTrue((BUNDLE / "install.sh").is_file())
        self.assertTrue((BUNDLE / "install.ps1").is_file())
        self.assertFalse((SCRIPTS / "install.sh").exists())
        self.assertFalse((SCRIPTS / "install.ps1").exists())

    def test_pyproject_is_notebook_env_not_lisca_package(self) -> None:
        text = (BUNDLE / "pyproject.toml").read_text(encoding="utf-8")
        self.assertIn('name = "lisca-notebooks"', text)
        self.assertIn("pyama", text)
        self.assertIn("keejkrej/pyama-v2", text)
        self.assertIn("package = false", text)
        self.assertNotIn("apps/studio", text)
        python_pkg = (REPO / "python" / "pyproject.toml").read_text(encoding="utf-8")
        self.assertIn('name = "lisca"', python_pkg)
        self.assertNotEqual(text, python_pkg)

    def test_readme_tells_users_not_to_clone(self) -> None:
        readme = (BUNDLE / "README.md").read_text(encoding="utf-8")
        self.assertIn("notebooks-v", readme)
        self.assertIn("Do **not** clone", readme)
        self.assertIn("bash scripts/jupyter-notebook.sh", readme)
        self.assertIn("bash scripts/jupyter-hub.sh", readme)
        self.assertIn("Config", readme)

    def test_copied_notebooks_keep_config_cells(self) -> None:
        crop = (BUNDLE / "notebooks" / "crop.ipynb").read_text(encoding="utf-8")
        analyze = (BUNDLE / "notebooks" / "analyze.ipynb").read_text(encoding="utf-8")
        results = (BUNDLE / "notebooks" / "results.ipynb").read_text(encoding="utf-8")
        self.assertIn("POSITIONS", crop)
        self.assertIn("0..158", crop)
        self.assertIn("from pyama.services import crop", crop)
        self.assertIn("SIGNAL_CHANNEL = 1", analyze)
        self.assertIn("merge_analyze_assay_json", analyze)
        self.assertNotIn("SAMPLES", analyze)
        self.assertIn("SAMPLES", results)
        self.assertIn("merge_results_assay_json", results)
        self.assertNotIn("SIGNAL_CHANNEL", results)


if __name__ == "__main__":
    unittest.main()
