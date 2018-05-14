#! /bin/env python3


# Define meta information
__version__ = "0.0.1"
__author__ = "Daniel Woschée"
__contact__ = "daniel.woschee@physik.lmu.de"


if __name__ == "__main__":
    import os
    import sys
    import tkinter as tk

    # Add directories for builtins and plugins to PYTHONPATH
    this_dir, _ = os.path.split(os.path.abspath(__file__))
    SRC_PATH = os.path.join(this_dir, "src")
    PLUGINS_PATH = os.path.join(this_dir, "plugins")

    sys.path.append(SRC_PATH)
    sys.path.append(PLUGINS_PATH)

    # Import modules at custom locations
    from src.modules import ModuleManager
    from src.workflow_tk import WorkflowGUI

    # Load modules
    modman = ModuleManager(PLUGINS_PATH)
    modman.register_builtin_data("__version__", __version__)
    modman.register_builtin_data("__name__", "PyAMA")

    # Display GUI
    gui = WorkflowGUI(modman)
    gui.mainloop()
