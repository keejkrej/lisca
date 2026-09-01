import typer

from transfection.core.constants import HELP

app = typer.Typer(add_completion=False, no_args_is_help=True, help=HELP)
