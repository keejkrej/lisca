#! /usr/bin/env python3
import tkinter as tk
import tkinter.ttk as ttk

PAD_X = 10
PAD_Y = 10

class WorkflowGUI:
    def __init__(self, module_manager=None):
        """Set up the workflow GUI."""
        self.modman = module_manager
        self.root = tk.Tk()
        self.root.minsize(width=300, height=700)

        self.mainframe = ttk.Frame(self.root)
        self.mainframe.pack(fill=tk.BOTH, expand=True)

        self.add_button = ttk.Button(self.mainframe, text="New", command=self.new_module)
        self.add_button.pack(side=tk.TOP, fill=tk.X, padx=PAD_X, pady=PAD_Y)


    def new_module(self):
        self.add_button.pack_forget()
        m = ModuleFrame(self.mainframe)
        self.add_button.pack(fill=tk.X, padx=PAD_X, pady=PAD_Y)
        


    def mainloop(self):
        """Start the root mainloop."""
        self.root.mainloop()


class ModuleFrame:
    def __init__(self, parent):
        self.parent = parent

        self.frame = ttk.Frame(self.parent, relief=tk.RAISED,
            borderwidth=2, width=250, height=150)
        ttk.Label(self.frame, text="FRAME!").pack()
        self.frame.pack(fill=tk.X, padx=PAD_X, pady=PAD_Y)
