from __future__ import annotations

import matplotlib as mpl
from lisca.core import workspace as _lisca_workspace

HELP = (
    "Transfection analysis stages for LiSCA workspaces (assay.json + roi/). "
    "Python CLI and Rust crate live in this repo; Studio wire id is transfection."
)
PROG_NAME = "transfection"
# Canonical schema is lisca (`docs/analysis/schema.md`). Import folder names
# when lisca exports them; otherwise keep local strings that match lisca's tree.
ANALYSIS_DIRNAME = getattr(_lisca_workspace, "ANALYSIS_DIRNAME", "analysis")
TIMESERIES_DIRNAME = ANALYSIS_DIRNAME
RESULTS_DIRNAME = getattr(_lisca_workspace, "RESULTS_DIRNAME", "results")
DEFAULT_QUARTILES = "0.10,0.25,0.50,0.75,0.90"
FIGURE_DPI = 100
# Single-panel figures (traces, summary, area, scatter, boxplots).
FIGURE_SIZE_SINGLE_IN = (6.5, 4.5)
# Back-compat alias used by one-off plot scripts.
FIGURE_SIZE_IN = FIGURE_SIZE_SINGLE_IN

_DEFAULT_RCPARAMS: dict[str, float] = {
    "font.size": 18.0,
    "axes.titlesize": 18.0,
    "axes.labelsize": 18.0,
    "xtick.labelsize": 17.0,
    "ytick.labelsize": 17.0,
    "legend.fontsize": 17.0,
}

mpl.rcParams.update(_DEFAULT_RCPARAMS)
