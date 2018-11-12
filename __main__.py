#! /bin/env python3


# Define meta information
__version__ = "0.0.2"
__author__ = "Daniel Woschée"
__contact__ = "daniel.woschee@physik.lmu.de"


if __name__ == "__main__":
    import os
    import sys
    import tkinter as tk

    # Check for Python 3.6 (use ugly syntax for compatibility with Python 2)
    ver_major, ver_minor = sys.version_info[:2]
    if ver_major != 3 or ver_minor < 6:
        raise RuntimeError("Require at least Python 3.6, found %d.%d." % (ver_major, ver_minor))

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
    modman.register_builtin_data("root_tk", gui.root_tk)
    gui.mainloop()
