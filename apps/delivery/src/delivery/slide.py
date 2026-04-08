from __future__ import annotations

import json
from pathlib import Path

import typer
from rich.console import Console
from rich.prompt import Confirm, IntPrompt, Prompt
from rich.table import Table


HELP = "Interactively create a slide.json mapping for delivery analysis."
SlideMapping = dict[int, list[int]]


def resolve_output_path(dataset_root: Path, output: Path | None) -> Path:
    if output is None:
        return (dataset_root / "slide.json").resolve()
    return output.expanduser().resolve()


def next_channel_id(mapping: SlideMapping) -> int:
    next_id = 0
    while next_id in mapping:
        next_id += 1
    return next_id


def parse_position_token(token: str) -> list[int]:
    raw = token.strip()
    if not raw:
        raise ValueError("Empty position token")

    if ":" not in raw:
        try:
            value = int(raw)
        except ValueError as exc:
            raise ValueError(f"Invalid position token: {raw!r}") from exc
        if value < 0:
            raise ValueError(f"Positions must be non-negative, got {value}")
        return [value]

    parts = [part.strip() for part in raw.split(":")]
    if len(parts) not in {2, 3}:
        raise ValueError(f"Invalid slice token: {raw!r}")
    if any(part == "" for part in parts[:2]):
        raise ValueError(f"Slices must include explicit start and stop: {raw!r}")

    try:
        start = int(parts[0])
        stop = int(parts[1])
        step = int(parts[2]) if len(parts) == 3 else 1
    except ValueError as exc:
        raise ValueError(f"Invalid slice token: {raw!r}") from exc

    if start < 0 or stop < 0:
        raise ValueError(f"Positions must be non-negative in slice {raw!r}")
    if step <= 0:
        raise ValueError(f"Slice step must be > 0 in {raw!r}")

    values = list(range(start, stop, step))
    if not values:
        raise ValueError(f"Slice produced no positions: {raw!r}")
    return values


def parse_position_spec(spec: str) -> list[int]:
    tokens = [token.strip() for token in spec.split(",")]
    if not any(tokens):
        raise ValueError("Position spec is empty")

    positions: list[int] = []
    for token in tokens:
        if not token:
            raise ValueError("Position spec contains an empty token")
        positions.extend(parse_position_token(token))

    return sorted(set(positions))


def serialize_slide_mapping(mapping: SlideMapping) -> str:
    ordered = {str(channel): mapping[channel] for channel in sorted(mapping)}
    return json.dumps(ordered, indent=2) + "\n"


def write_slide_mapping(mapping: SlideMapping, output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(serialize_slide_mapping(mapping), encoding="utf-8")
    return output_path.resolve()


def format_positions(positions: list[int]) -> str:
    return ", ".join(str(pos) for pos in positions)


def render_mapping(console: Console, mapping: SlideMapping) -> None:
    table = Table(title="Current Slide Mapping")
    table.add_column("Slide Channel", justify="right")
    table.add_column("Positions")
    table.add_column("Count", justify="right")

    for channel in sorted(mapping):
        positions = mapping[channel]
        table.add_row(str(channel), format_positions(positions), str(len(positions)))

    console.print(table)


def prompt_channel_id(console: Console, mapping: SlideMapping) -> int:
    while True:
        channel = IntPrompt.ask(
            "[bold]Slide channel ID[/bold]",
            console=console,
            default=next_channel_id(mapping),
        )
        if channel < 0:
            console.print("[red]Slide channel IDs must be non-negative.[/red]")
            continue
        if channel in mapping:
            console.print(f"[red]Slide channel {channel} already exists. Remove it first or choose another ID.[/red]")
            continue
        return channel


def prompt_positions(console: Console) -> list[int]:
    console.print(
        "Enter positions using comma-separated integers and Python-style slices, "
        "for example: [bold]0,2,6:10,12:19:2[/bold]"
    )
    while True:
        spec = Prompt.ask("[bold]Positions[/bold]", console=console)
        try:
            positions = parse_position_spec(spec)
        except ValueError as error:
            console.print(f"[red]{error}[/red]")
            continue
        console.print(f"Expanded positions ({len(positions)}): {format_positions(positions)}")
        if Confirm.ask("Add this group?", console=console, default=True):
            return positions


def prompt_remove_channel(console: Console, mapping: SlideMapping) -> None:
    while True:
        channel = IntPrompt.ask("[bold]Remove slide channel ID[/bold]", console=console)
        if channel not in mapping:
            console.print(f"[red]Slide channel {channel} does not exist.[/red]")
            continue
        del mapping[channel]
        console.print(f"Removed slide channel {channel}.")
        return


def run_slide_wizard(console: Console, dataset_root: Path, output_path: Path) -> SlideMapping | None:
    console.print("[bold]Delivery Slide Wizard[/bold]")
    console.print(f"Dataset root: {dataset_root}")
    console.print(f"Output path: {output_path}")
    console.print()

    mapping: SlideMapping = {}
    while not mapping:
        channel = prompt_channel_id(console, mapping)
        positions = prompt_positions(console)
        mapping[channel] = positions
        render_mapping(console, mapping)

    while True:
        action = Prompt.ask(
            "[bold]Next action[/bold]",
            choices=["add", "remove", "save", "cancel"],
            default="add",
            console=console,
        )
        if action == "add":
            channel = prompt_channel_id(console, mapping)
            positions = prompt_positions(console)
            mapping[channel] = positions
            render_mapping(console, mapping)
            continue
        if action == "remove":
            prompt_remove_channel(console, mapping)
            if mapping:
                render_mapping(console, mapping)
                continue
            console.print("[yellow]No groups remain. Add a new group.[/yellow]")
            channel = prompt_channel_id(console, mapping)
            positions = prompt_positions(console)
            mapping[channel] = positions
            render_mapping(console, mapping)
            continue
        if action == "cancel":
            console.print("[yellow]Aborted without writing slide.json.[/yellow]")
            return None
        return mapping


app = typer.Typer(add_completion=False, no_args_is_help=True, help=HELP)


@app.command()
def cli(
    dataset_root: Path = typer.Argument(
        ...,
        exists=True,
        file_okay=False,
        dir_okay=True,
        help="Dataset root used to choose the default output path.",
    ),
    output: Path | None = typer.Option(
        None,
        "--output",
        file_okay=True,
        dir_okay=False,
        help="Optional output path. Default: <dataset_root>/slide.json",
    ),
) -> None:
    console = Console(stderr=True)
    output_path = resolve_output_path(dataset_root.resolve(), output)
    mapping = run_slide_wizard(console, dataset_root.resolve(), output_path)
    if mapping is None:
        raise typer.Exit(code=1)

    if output_path.exists() and not Confirm.ask(
        f"[bold]{output_path}[/bold] already exists. Overwrite?",
        console=console,
        default=False,
    ):
        console.print("[yellow]Aborted without writing slide.json.[/yellow]")
        raise typer.Exit(code=1)

    written_path = write_slide_mapping(mapping, output_path)
    console.print(f"[green]Wrote slide mapping:[/green] {written_path}")
    render_mapping(console, mapping)
