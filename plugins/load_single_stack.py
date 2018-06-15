"""
This plug-in displays a file selection dialog and opens the
stack from the file.
"""
import gui_tk
from stack import Stack
from stackviewer_tk import StackViewer
from threading import Condition
import tkinter as tk

my_id = "simple_stack_reader"
__version__ = "0.1.1"

def register(meta):
    meta.name = "Read stack"
    meta.id = my_id
    meta.conf_ret = "path"
    meta.run_dep = (my_id, "path")
    meta.run_ret = ("stack", "StackViewer")


def conf(d, *_, **__):
    print("Configuring 'load_single_stack'.")
    f = gui_tk.askopenfilename(parent=gui_tk.root)
    print(f)
    return {"path": f}


def run(d, *_, **__):
    print("Running 'load_single_stack'.")
    path = d[my_id]['path']

    # Load and show stack
    s = Stack(path)
    sv = StackViewer()
    sv.set_stack(s)

    # Wait until user has selected ROIs
    cv = Condition()
    with cv:
        sv.schedule(_confirmation_dialog, sv.root, cv)
        cv.wait()

    return {"stack": s,
            "StackViewer": sv}


def _confirmation_dialog(root, cv):
    """Block until user confirmation.

    A confirmation dialog is displayed with a message requesting to
    select ROIs and to click OK.
    When the user clicks OK, the listeners to the condition ``cv`` are
    notified, and this function returns.

    :param root: The Tk root above which the dialog is to be displayed
    :param cv: The ``threading.Condition`` whose listeners are notified
    """
    title = "PyAMA stack reader"
    message = "Please select ROIs for fluorescence readout\nand then click OK."

    # Set up dialog window
    dlg = tk.Toplevel(root)
    dlg.title(title)

    # Define window destroy function
    bind_id = None
    def close_fcn(*_):
        dlg.unbind("<Destroy>", bind_id)
        with cv:
            cv.notify()
    bind_id = dlg.bind("<Destroy>", close_fcn)

    # Set up message label
    lbl = tk.Label(dlg, text=message, justify=tk.LEFT)
    lbl.pack(side=tk.TOP, fill=tk.Y, padx=10, pady=10)

    # Set up OK button
    btn = tk.Button(dlg, text="OK", command=dlg.destroy)
    btn.pack(side=tk.TOP, fill=tk.Y, padx=30, pady=10, ipadx=30)

