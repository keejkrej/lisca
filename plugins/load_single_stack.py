"""
This plug-in displays a file selection dialog and opens the
stack from the file.
"""
from stack import Stack
from stackviewer_tk import StackViewer

my_id = "simple_stack_reader"

def register(meta):
    meta.name = "Read stack"
    meta.id = my_id
    meta.conf_ret = "path"
    meta.run_dep = ((my_id, "", "path"), ('', '', 'workflow_gui_tk'))
    meta.conf_dep = ("", "", "workflow_gui_tk")


def configure(**d):
    print("Configuring 'load_single_stack'.")
    gui_tk = d['']['workflow_gui_tk']
    f = gui_tk.askopenfilename(parent=gui_tk.root)
    print(f)
    return {"path": f}
    
    
def run(**d):
    print("Running 'load_single_stack'.")
    gui_tk = d['']['workflow_gui_tk']
    path = d[my_id]['path']

    s = Stack(path)
    tl_win = gui_tk.new_toplevel()
    sv = StackViewer(tl_win)
    sv.set_stack(s)

