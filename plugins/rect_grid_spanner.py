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
    with adj.close_condition:
        adj.close_condition.wait()

