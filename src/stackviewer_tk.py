#! /usr/bin/env python3

import stack
import tkinter as tk
import tkinter.filedialog as tkfdlg
import tkinter.ttk as ttk

# Define constants
ROW_HEADER = 0
ROW_CANVAS = 1
ROW_CHANNEL_CONTROL = 2
ROW_FRAME_CONTROL = 3
COL_LABELS = 0
COL_ENTRIES = 1
COL_SIZES = 2
COL_SCALES = 3
COLSPAN_CANVAS = 4

class StackViewer:
    """Provides a GUI for displaying a stack."""

    def __init__(self, parent):
        """Initialize the GUI."""
        # Stack properties
        self.stack = None
        self.n_channels = None
        self.n_frames = None
        self.i_channel = None
        self.i_frame = None

        self.i_channel_var = tk.IntVar()
        self.i_channel_var.trace_add("write", self._i_channel_changed)
        self.i_frame_var = tk.IntVar()
        self.i_frame_var.trace_add("write", self._i_frame_changed)

        ## GUI elements:
        # Main frame
        self.mainframe = ttk.Frame(parent, relief=tk.FLAT,
            width=100, height=100)
        self.mainframe.pack(fill=tk.BOTH, expand=tk.YES)
        self.mainframe.columnconfigure(COL_SCALES, weight=1)
        self.mainframe.rowconfigure(ROW_CANVAS, weight=1)

        # (Temporal) Header with button for selecting stack
        tempframe = ttk.Frame(self.mainframe)
        tempframe.grid(row=ROW_HEADER, column=0, columnspan=COLSPAN_CANVAS)

        self.button = ttk.Button(tempframe, text="Browse...",
            command=self._open, state=tk.NORMAL)
        self.button.pack(side=tk.LEFT)
        self.label = ttk.Label(tempframe, text="")
        self.label.pack(side=tk.LEFT)

        # Canvas
        self.canvas = tk.Canvas(self.mainframe, width=100, height=100,
            background="white")
        self.canvas.grid(row=ROW_CANVAS, column=0,
            columnspan=COLSPAN_CANVAS, sticky=tk.N+tk.S)

        # Channel control elements
        self.scale_channel = tk.Scale(
                                      self.mainframe,
                                      variable=self.i_channel_var,
                                      orient=tk.HORIZONTAL,
                                      showvalue=False,
                                      from_=1,
                                      resolution=1,
                                     )
        self.lbl_channel = ttk.Label(self.mainframe, text="Channel:",
            anchor=tk.W)
        self.entry_channel = tk.Spinbox(
                                       self.mainframe,
                                       width=3,
                                       from_=0,
                                       increment=1,
                                       textvariable=self.i_channel_var,
                                       justify=tk.RIGHT
                                      )
        self.lbl_channel_size = ttk.Label(self.mainframe, anchor=tk.W)

        # Frame control elements
        self.scale_frame = tk.Scale(
                                    self.mainframe,
                                    variable=self.i_frame_var,
                                    orient=tk.HORIZONTAL,
                                    showvalue=False,
                                    from_=1,
                                    resolution=1,
                                   )
        self.lbl_frame = ttk.Label(self.mainframe, text="Frame:",
            anchor=tk.W)
        self.entry_frame = tk.Spinbox(
                                      self.mainframe,
                                      width=3,
                                      from_=0,
                                      increment=1,
                                      textvariable=self.i_frame_var,
                                      justify=tk.RIGHT
                                     )
        self.lbl_frame_size = ttk.Label(self.mainframe, anchor=tk.W)


    def _open(self):
        """Open a stack and display it."""
        self.button.configure(state=tk.DISABLED)
        fn = tkfdlg.askopenfilename(title="Choose stack file",
            filetypes=(("TIFF", ("*.tif","*.tiff")),("All files", "*.*")))
        self.label["text"] = fn
        self.button.configure(state=tk.NORMAL)

        if self.stack is not None:
            self.stack.close()
        self.stack = stack.Stack(fn)
        self.img = None
        self._update_stack_properties()
        #self._change_stack_position(i_channel=0, i_frame=0)


    def _show_img(self):
        """Update the image shown."""
        self.canvas.delete("img")
        self.img = self.stack.get_frame_tk(channel=self.i_channel,
            frame=self.i_frame)
        self.canvas.create_image((0,0), anchor=tk.NW,
            image=self.img, tags=("img",))


    def _update_stack_properties(self):
        """Read stack dimensions and adjust GUI."""
        self.canvas.config(width=self.stack.width, height=self.stack.height)

        self.n_channels = self.stack.n_channels
        self.n_frames = self.stack.n_frames
        self.i_channel = 0
        self.i_frame = 0

        self.i_channel_var.set(1)
        self.i_frame_var.set(1)

        # GUI elements corresponding to channel
        if self.n_channels == 1:
            self.scale_channel.grid_forget()
            self.lbl_channel.grid_forget()
            self.entry_channel.grid_forget()
            self.lbl_channel_size.grid_forget()
        else:
            self.scale_channel['to'] = self.n_channels
            self.scale_channel.grid(row=ROW_CHANNEL_CONTROL,
                column=COL_SCALES, sticky=tk.W+tk.E)
            self.lbl_channel.grid(row=ROW_CHANNEL_CONTROL,
                column=COL_LABELS, sticky=tk.W)
            self.lbl_channel_size['text'] = "/{:d}".format(self.n_channels)
            self.entry_channel.grid(row=ROW_CHANNEL_CONTROL,
                column=COL_ENTRIES, sticky=tk.W)
            self.lbl_channel_size.grid(row=ROW_CHANNEL_CONTROL,
                column=COL_SIZES, sticky=tk.W)

        # GUI elements corresponding to frame
        if self.n_frames == 1:
            self.scale_frame.grid_forget()
            self.lbl_frame.grid_forget()
            self.entry_frame.grid_forget()
            self.lbl_frame_size.grid_forget()
        else:
            self.scale_frame['to'] = self.n_frames
            self.scale_frame.grid(row=ROW_FRAME_CONTROL, column=COL_SCALES,
                sticky=tk.W+tk.E)
            self.lbl_frame.grid(row=ROW_FRAME_CONTROL, column=COL_LABELS,
                sticky=tk.W)
            self.lbl_frame_size['text'] = "/{:d}".format(self.n_frames)
            self.entry_frame.grid(row=ROW_FRAME_CONTROL, column=COL_ENTRIES,
                sticky=tk.W)
            self.lbl_frame_size.grid(row=ROW_FRAME_CONTROL,
                column=COL_SIZES, sticky=tk.W)


    def _change_stack_position(self, i_channel=None, i_frame=None):
        """
        Change the shown image.

        Arguments:
        ----------
        i_channel -- channel to be shown, integer in [0,n_channels)
        i_frame -- frame to be shown, integer in [0,n_frames)

        If i_channel or i_frame is None, it is not changed.
        """
        if self.stack is None:
            return
        isChanged = False
        if i_channel is not None and i_channel != self.i_channel:
            self.i_channel = i_channel
            isChanged = True
        if i_frame is not None and i_frame != self.i_frame:
            self.i_frame = i_frame
            isChanged = True

        if isChanged or self.img is None:
            self._show_img()


    def _i_channel_changed(self, *_):
        """Callback for channel variable"""
        i_channel = self.i_channel_var.get() - 1
        self._change_stack_position(i_channel=i_channel)


    def _i_frame_changed(self, *_):
        """Callback for frame variable"""
        i_frame = self.i_frame_var.get() - 1
        self._change_stack_position(i_frame=i_frame)


if __name__ == "__main__":
    root = tk.Tk()
    root.title("Test")
    StackViewer(root)
    root.mainloop()

