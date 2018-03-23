from gui_tk import get_root
import tkinter as tk

class ContrastAdjuster:
    def __init__(self, sv):
        root = get_root(sv.mainframe)

        self.stackviewer = sv
        self.stack = sv.stack

        self.mainframe = tk.Toplevel(root)
        self.mainframe.title("Adjust contrast")
        self.mainframe.bind("<Destroy>", self._close)

    def _close(self, *_):
        self.stackviewer.contrast_adjuster = None
        self.mainframe.destroy()



