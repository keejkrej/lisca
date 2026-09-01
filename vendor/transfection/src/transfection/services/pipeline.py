"""Full transfection stage order driven by assay.json."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from transfection.core import (
    load_assay_for_workspace,
    require_interval_minutes,
    require_named_samples,
)
from transfection.core.constants import ANALYSIS_DIRNAME, RESULTS_DIRNAME
from transfection.core.sample_pack import publish_sample_tables_xlsx, publish_sample_traces_xlsx
from transfection.services import auc, fit, plot_auc, plot_fit, plot_timeseries, segment, timeseries


@dataclass(frozen=True)
class PipelineResult:
    workspace: Path
    interval_minutes: float
    max_onset_minutes: float
    skip_segment: bool
    analysis_dir: Path
    results_dir: Path


def run_pipeline(
    *,
    workspace: Path,
    assay: Path | None = None,
    force: bool = False,
    variation_radius: int = 2,
    gaussian_sigma: float = 1.0,
) -> PipelineResult:
    workspace = workspace.resolve()
    config = load_assay_for_workspace(workspace, assay)
    interval = require_interval_minutes(config)
    max_onset = config.max_onset_minutes
    skip_segment = config.skip_segment

    if not skip_segment:
        segment.run_segment(
            workspace=workspace,
            mapping=config.mapping or None,
            variation_radius=variation_radius,
            gaussian_sigma=gaussian_sigma,
            force=force,
        )
    timeseries.run_timeseries(
        workspace=workspace,
        mapping=config.mapping or None,
        skip_segment=skip_segment,
    )
    auc.run_auc(workspace=workspace, interval=interval)
    fit.run_fit(
        workspace=workspace,
        interval=interval,
        max_onset_minutes=max_onset,
    )
    mapping = require_named_samples(config)
    publish_sample_traces_xlsx(workspace, mapping)
    plot_timeseries.run_plot_timeseries(
        metrics_dir=workspace,
        interval=interval,
    )
    publish_sample_tables_xlsx(workspace, mapping, "auc")
    plot_auc.run_plot_auc(auc_csv=workspace)
    publish_sample_tables_xlsx(workspace, mapping, "fit")
    plot_fit.run_plot_fit(workspace, output=None, interval=interval, columns=None)
    return PipelineResult(
        workspace=workspace,
        interval_minutes=interval,
        max_onset_minutes=max_onset,
        skip_segment=skip_segment,
        analysis_dir=workspace / ANALYSIS_DIRNAME,
        results_dir=workspace / RESULTS_DIRNAME,
    )


def format_pipeline_done(result: PipelineResult) -> str:
    return (
        f"pipeline done workspace={result.workspace} "
        f"interval={result.interval_minutes} max_onset_minutes={result.max_onset_minutes} "
        f"skip_segment={result.skip_segment}\n"
        f"  analysis: {result.analysis_dir}/\n"
        f"  results: {result.results_dir}/<sample>/"
    )
