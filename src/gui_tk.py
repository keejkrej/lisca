"""
This module is intended to provide general GUI-related functions.
"""
import tkinter as tk
#import workflow_tk

root = None

def get_root(w=None):
    """Obtain root of Tk widget."""
    if w is None:
        global root
    else:
        root = w.winfo_toplevel()
        if root.master:
            root = root.master
    return root

def new_toplevel(**opt):
    """Create a new toplevel window."""
    global root
    if root is None:
        root = tk.Tk(**opt)
        return root
    else:
        return tk.Toplevel(master=root, **opt)

def mainloop():
    """Start the tkinter mainloop."""
    root.mainloop()
