"""CLI: accumulate an occupancy prompt pack without retraining Smart exclude."""

from __future__ import annotations

from pathlib import Path

import typer

from lisca.app import app
from lisca.core.occupancy import (
    OCCUPANCY_MIN_EMPTY_EXAMPLES,
    OCCUPANCY_MIN_OCCUPIED_EXAMPLES,
    append_occupancy_examples,
    build_occupancy_pack,
    embed_occupancy_image,
    load_occupancy_pack,
    pack_counts,
    pack_gate_message,
    pack_is_ready,
    save_occupancy_pack,
    score_embedding_against_pack,
    should_exclude_score,
)
from lisca.core.paths import occupancy_pack_path

occupancy_app = typer.Typer(no_args_is_help=True)
app.add_typer(occupancy_app, name="occupancy")


def _echo_pack_status(
    pack: dict | None,
    *,
    min_occupied: int = OCCUPANCY_MIN_OCCUPIED_EXAMPLES,
    min_empty: int = OCCUPANCY_MIN_EMPTY_EXAMPLES,
) -> None:
    occupied, empty = pack_counts(pack or {"examples": []})
    typer.echo(f"examples: occupied={occupied} empty={empty}")
    typer.echo(pack_gate_message(pack, min_occupied=min_occupied, min_empty=min_empty))


@occupancy_app.command("pack")
def occupancy_pack_cmd(
    occupied: list[Path] = typer.Option(
        ...,
        "--occupied",
        exists=True,
        dir_okay=False,
        help="Occupied / include pattern crop images (repeatable).",
    ),
    empty: list[Path] = typer.Option(
        ...,
        "--empty",
        exists=True,
        dir_okay=False,
        help="Empty / exclude pattern crop images (repeatable).",
    ),
    workspace: Path = typer.Option(
        ...,
        exists=True,
        file_okay=False,
        help="Workspace folder. Writes align/occupancy-pack.json for this assay only.",
    ),
) -> None:
    """Replace the assay pack from example crops. Do not retrain per user."""
    pack = build_occupancy_pack(
        [embed_occupancy_image(path) for path in occupied],
        [embed_occupancy_image(path) for path in empty],
    )
    path = save_occupancy_pack(workspace, pack)
    typer.echo(f"Wrote occupancy prompt pack to {path}")
    _echo_pack_status(pack)


@occupancy_app.command("record")
def occupancy_record_cmd(
    workspace: Path = typer.Option(
        ...,
        exists=True,
        file_okay=False,
        help="Workspace folder. Appends to align/occupancy-pack.json.",
    ),
    occupied: list[Path] = typer.Option(
        [],
        "--occupied",
        exists=True,
        dir_okay=False,
        help="Occupied / include crops to append (repeatable).",
    ),
    empty: list[Path] = typer.Option(
        [],
        "--empty",
        exists=True,
        dir_okay=False,
        help="Empty / exclude crops to append (repeatable).",
    ),
) -> None:
    """Append corrections to the assay pack. Grows with each edit."""
    if not occupied and not empty:
        raise typer.BadParameter("Provide at least one --occupied or --empty crop")
    pack = append_occupancy_examples(
        workspace,
        [embed_occupancy_image(path) for path in occupied],
        [embed_occupancy_image(path) for path in empty],
    )
    typer.echo(f"Updated occupancy prompt pack at {occupancy_pack_path(workspace)}")
    _echo_pack_status(pack)


@occupancy_app.command("status")
def occupancy_status_cmd(
    workspace: Path = typer.Option(
        ...,
        exists=True,
        file_okay=False,
        help="Workspace folder for this assay only (align/occupancy-pack.json).",
    ),
    min_occupied: int = typer.Option(
        OCCUPANCY_MIN_OCCUPIED_EXAMPLES,
        "--min-occupied",
        min=1,
        help="Occupied examples required before promptable Smart exclude.",
    ),
    min_empty: int = typer.Option(
        OCCUPANCY_MIN_EMPTY_EXAMPLES,
        "--min-empty",
        min=1,
        help="Empty examples required before promptable Smart exclude.",
    ),
) -> None:
    """Show whether this assay pack has enough examples to leave ResNet."""
    pack = load_occupancy_pack(workspace)
    path = occupancy_pack_path(workspace)
    if pack is None:
        typer.echo(f"No occupancy pack at {path}")
    else:
        typer.echo(f"Occupancy pack: {path}")
        typer.echo(f"embedder={pack.get('embedder', '')}")
    _echo_pack_status(pack, min_occupied=min_occupied, min_empty=min_empty)
    raise typer.Exit(
        0
        if pack_is_ready(
            pack or {"examples": []},
            min_occupied=min_occupied,
            min_empty=min_empty,
        )
        else 2
    )


@occupancy_app.command("score")
def occupancy_score_cmd(
    crop: Path = typer.Option(..., exists=True, dir_okay=False),
    workspace: Path | None = typer.Option(None, exists=True, file_okay=False),
    pack: Path | None = typer.Option(None, exists=True, dir_okay=False),
    min_occupied: int = typer.Option(
        OCCUPANCY_MIN_OCCUPIED_EXAMPLES,
        "--min-occupied",
        min=1,
        help="Occupied examples required before scoring with the pack.",
    ),
    min_empty: int = typer.Option(
        OCCUPANCY_MIN_EMPTY_EXAMPLES,
        "--min-empty",
        min=1,
        help="Empty examples required before scoring with the pack.",
    ),
) -> None:
    """Score one crop against a saved prompt pack (empty vs occupied prototypes)."""
    import json

    pack_path = pack
    loaded: dict
    if pack_path is None:
        if workspace is None:
            raise typer.BadParameter("Provide --workspace or --pack")
        pack_path = occupancy_pack_path(workspace)
        loaded_pack = load_occupancy_pack(workspace)
        if loaded_pack is None:
            raise typer.BadParameter(
                f"No occupancy pack at {pack_path}. "
                "Bootstrap with Var exclude / manual include-exclude "
                "or `lisca occupancy pack`."
            )
        loaded = loaded_pack
    else:
        loaded = json.loads(pack_path.read_text(encoding="utf-8"))
    if not pack_is_ready(loaded, min_occupied=min_occupied, min_empty=min_empty):
        typer.echo(
            pack_gate_message(loaded, min_occupied=min_occupied, min_empty=min_empty),
            err=True,
        )
        raise typer.Exit(2)
    embedding = embed_occupancy_image(crop)
    score = score_embedding_against_pack(embedding, loaded)
    exclude = should_exclude_score(score, loaded)
    typer.echo(
        f"score={score:.6f} exclude={str(exclude).lower()} embedder=lisca-occupancy-v0"
    )
