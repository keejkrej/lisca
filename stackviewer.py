#! /usr/bin/env python3

import stack
import tkinter as tk
import tkinter.filedialog as tkfdlg
import tkinter.ttk as ttk


class StackViewer:

    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Test")

        self.mainframe = ttk.Frame(self.root, relief=tk.RAISED, width=1000, height=1000)
        self.mainframe.pack()


        tempframe = ttk.Frame(self.mainframe)
        tempframe.pack(side=tk.TOP, fill=tk.BOTH)

        self.button = ttk.Button(tempframe, text="Browse...", command=self._open, state=tk.NORMAL)
        self.button.pack(side=tk.LEFT)
        self.label = ttk.Label(tempframe, text="")
        self.label.pack(side=tk.LEFT)

        self.canvas = tk.Canvas(self.mainframe, width=1000, height=1000,
            background="white")
        self.canvas.pack(side=tk.TOP)

    def _open(self):
        self.button.configure(state=tk.DISABLED)
        fn = tkfdlg.askopenfilename(title="Choose stack file",
            filetypes=(("TIFF", ("*.tif","*.tiff")),("All files", "*.*")))
        self.label["text"] = fn
        self.button.configure(state=tk.NORMAL)

        self.stack = stack.Stack(fn)
        self._show_img()

    def _show_img(self):
        self.canvas.delete("img")
        self.img = self.stack.get_frame_tk()
        self.canvas.config(width=self.stack.width, height=self.stack.height)
        self.canvas.create_image((0,0), anchor=tk.NW, image=self.img, tags=("img",))
        
    def mainloop(self):
        self.root.mainloop()


if __name__ == "__main__":
    StackViewer().mainloop()

