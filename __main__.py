#! /bin/env python3


# Define meta information
__version__ = "0.0.2"
__author__ = "Daniel Woschée"
__contact__ = "daniel.woschee@physik.lmu.de"
PACKAGE_NAME = "PyAMA"


if __name__ == "__main__":
    import sys
    from src import workflow_starter

    # Check for Python 3.6 (use ugly syntax for compatibility with Python 2)
    ver_major, ver_minor = sys.version_info[:2]
    if ver_major != 3 or ver_minor < 6:
        raise RuntimeError("Require at least Python 3.6, found %d.%d." % (ver_major, ver_minor))

    # Start workflow
    #workflow_starter.start_workflow(version=__version__, name=PACKAGE_NAME)
    from src.main_window import Main_Tk
    Main_Tk(name=PACKAGE_NAME, version=__version__)

