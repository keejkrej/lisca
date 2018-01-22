#! /usr/bin/env python3

import re

import numpy as np
import PIL.Image as pilimg
import PIL.ImageTk as piltk
import tkinter as tk
import tkinter.ttk as ttk
import tkinter.filedialog as tkfdlg

TIFF_TAG_DESCRIPTION = 270


class StackViewer():
    """Views a stack"""

    def __init__(self, filename=None):
        self.root = tk.Tk()
        self.root.title("Image")

        if filename is None:
            self.prompt_filename()
        else:
            self.filename = filename

        if self.filename is None:
            raise ValueError("No image file given.")

        self.open_stack()
        self.i_image = 0
        self.build_gui()
        self.init_gui()


    def prompt_filename(self):
        """Prompts the user for a TIFF file and saves it as a attribute."""
        self.filename = tkfdlg.askopenfilename(title="Select a TIFF file")

    def open_stack(self):
        """Opens a stack"""
        self.stackfile = pilimg.open(self.filename)
        print(self.stackfile.mode)
        if self.stackfile.format != "TIFF":
            raise ValueError("Bad image format: {}. Expected TIFF.".format(
                self.stackfile.format))

        self.parse_tiff_tags()

        self.stack = np.asarray(self.stackfile)
        
    def parse_tiff_tags(self):
        desc = self.stackfile.tag[TIFF_TAG_DESCRIPTION][0]
        
        # Get total number of images in stack
        m = re.search(r"images=(\d+)", desc)
        if m:
            self.n_images = m.group(1)
        else:
            self.n_images = 1

        # Get number of frames in stack
        m = re.search(r"frames=(\d+)", desc)
        if m:
            self.n_frames = m.group(1)
        else:
            self.n_frames = 1

        # Get number of slices in stack
        m = re.search(r"slices=(\d+)", desc)
        if m:
            self.n_slices = m.group(1)
        else:
            self.n_slices = 1

        # Get number of channels in stack
        m = re.search(r"channels=(\d+)", desc)
        if m:
            self.n_channels = m.group(1)
        else:
            self.n_channels = 1

        print(self.n_images)
        print(self.n_frames)
        print(self.n_slices)
        print(self.n_channels)

    def build_gui(self):
        self.mainframe = ttk.Frame(self.root)
        self.mainframe.pack()

        self.canvas = tk.Canvas(self.mainframe, background="white")
        self.canvas.grid(column=0, row=0)
        self.show_image()

    def show_image(self):
        self.stackfile.seek(self.i_image)
        self.current_img = piltk.PhotoImage(self.stackfile)
        self.pi = self.canvas.create_image(0, 0, image=self.current_img, tags="img", anchor=tk.NW)
        #self.canvas.create_rectangle(20, 20, 30, 30, outline="red")


    def init_gui(self):
        self.root.mainloop()

    def display_image(self):
        pass
        

if __name__ == "__main__":
    StackViewer()#"res/Beispielstack.tif")
