#! /bin/env python3


# Define meta information
__version__ = "0.1.3"
__author__ = "Daniel Woschée"
__contact__ = "daniel.woschee@physik.lmu.de"
PACKAGE_NAME = "PyAMA"


if __name__ == "__main__":
    # Check for Python 3.6 (use ugly syntax for compatibility with Python 2)
    import sys
    ver_major, ver_minor = sys.version_info[:2]
    if ver_major != 3 or ver_minor < 7:
        raise RuntimeError("At least Python 3.7 required, found %d.%d." % (ver_major, ver_minor))

    # Start workflow
    #from src import workflow_starter
    #workflow_starter.start_workflow(version=__version__, name=PACKAGE_NAME)



    #from src.main_window import Main_Tk
    #Main_Tk(name=PACKAGE_NAME, version=__version__)
    from src.session import SessionController
    SessionController(name=PACKAGE_NAME, version=__version__).start()


