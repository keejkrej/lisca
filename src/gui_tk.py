"""
This module is intended to provide general GUI-related functions.
"""
#import workflow_tk

def get_root(w):
    """Obtain root of Tk widget."""
    root = w.winfo_toplevel()
    if root.master:
        root = root.master
    return root

