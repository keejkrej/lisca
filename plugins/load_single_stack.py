"""
This plug-in displays a file selection dialog and opens the
stack from the file.
"""
import gui_tk
from stack import Stack
from stackviewer_tk import StackViewer

my_id = "simple_stack_reader"
__version__ = "0.1"

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

    s = Stack(path)
    sv = StackViewer()
    sv.set_stack(s)

    return {"stack": s,
            "StackViewer": sv}

