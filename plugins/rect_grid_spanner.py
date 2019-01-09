#import gui_tk
from roi import RectRoi
from threading import Condition
import tkinter as tk

my_id = "rect_grid_spanner"
__version__ = "0.1"

PARAMS_ID = "_parameters"


def register(meta):
    meta.name = "Span rectangular grid"
    meta.id = my_id

    meta.set_dep("conf", (my_id, PARAMS_ID))
    meta.set_dep("run", (#(my_id, PARAMS_ID),
                         ("simple_stack_reader", "_StackViewer"),
                         ))

    return {PARAMS_ID: None}


def conf(d, *_, **__):
    return {PARAMS_ID: None}


def run(d, *_, **__):
    #params = d[my_id][PARAMS_ID]
    params = None
    sv = d["simple_stack_reader"]["_StackViewer"]
    adj = RectRoi.Adjuster(sv, props=params)

    # Wait until user has selected ROIs
    cv = Condition()
    with cv:
        sv.schedule(_confirmation_dialog, sv.root, cv)
        cv.wait()


def _confirmation_dialog(root, cv):
    """Block until user confirmation.

    A confirmation dialog is displayed with a message requesting to
    select ROIs and to click OK.
    When the user clicks OK, the listeners to the condition ``cv`` are
    notified, and this function returns.

    :param root: The Tk root above which the dialog is to be displayed
    :param cv: The ``threading.Condition`` whose listeners are notified
    """
    title = "PyAMA ROI grid"
    message = "Please select ROIs for fluorescence readout\nand then click OK."

    # Set up dialog window
    dlg = tk.Toplevel(root)
    dlg.title(title)

    # Define window destroy function
    bind_id = None

    def close_fcn(*_):
        dlg.unbind("<Destroy>", bind_id)
        nonlocal cv
        with cv:
            cv.notify_all()
    bind_id = dlg.bind("<Destroy>", close_fcn)

    # Set up message label
    lbl = tk.Label(dlg, text=message, justify=tk.LEFT)
    lbl.pack(side=tk.TOP, fill=tk.Y, padx=10, pady=10)

    # Set up OK button
    btn = tk.Button(dlg, text="OK", command=dlg.destroy)
    btn.pack(side=tk.TOP, fill=tk.Y, padx=30, pady=10, ipadx=30)
