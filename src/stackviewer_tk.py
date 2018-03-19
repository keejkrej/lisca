#! /usr/bin/env python3

import os
import stack
import sys
import tkinter as tk
import tkinter.filedialog as tkfdlg
import tkinter.ttk as ttk
import warnings

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

SELECTION_OFF = 0
SELECTION_ANCHOR = 1
SELECTION_TILT = 2
SELECTION_RECT = 3
SELECTION_SPACE = 4

class StackViewer:
    """Provides a GUI for displaying a stack."""

    def __init__(self, parent, image_file=None):
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

        # Configure selection
        self.SELECTION_STATE = 0
        self.sel_coords = {}

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

        self.select_button = ttk.Button(tempframe, text="Select",
            command=self.toggle_selection, state=tk.NORMAL)
        self.select_button.pack(side=tk.LEFT)
        self.open_button = ttk.Button(tempframe, text="Browse...",
            command=self.open_stack, state=tk.NORMAL)
        self.open_button.pack(side=tk.LEFT)
        self.label = ttk.Label(tempframe, text="")
        self.label.pack(side=tk.LEFT)

        # Canvas
        self.canvas = tk.Canvas(self.mainframe, width=100, height=100,
            background="white")
        self.canvas.grid(row=ROW_CANVAS, column=0,
            columnspan=COLSPAN_CANVAS)#, sticky=tk.N+tk.S)

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

        if image_file is not None:
            self.open_stack(image_file)


    def open_stack(self, fn=None):
        """
        Open a stack and display it.

        :param fn: The path to the stack to be opened.

            If ``None``, show a file selection dialog.
        """
        if fn is None:
            self.open_button.configure(state=tk.DISABLED)
            fn = tkfdlg.askopenfilename(title="Choose stack file",
                filetypes=(("TIFF", ("*.tif","*.tiff")),("All files", "*.*")))
            self.open_button.configure(state=tk.NORMAL)

        if not os.path.isfile(fn):
            warnings.warn("Cannot open stack: not found: {}".format(fn))
            return

        self.label["text"] = fn
        self.set_stack(stack.Stack(fn))


    def set_stack(self, s):
        """Set the stack that is displayed."""
        if self.stack is not None:
            self.stack.close()
        self.stack = s
        self.img = None
        self._update_stack_properties()
        #self._change_stack_position(i_channel=0, i_frame=0)


    def _show_img(self):
        """Update the image shown."""
        self.canvas.delete("img")
        self.img = self.stack.get_frame_tk(channel=self.i_channel,
            frame=self.i_frame)
        self.canvas.create_image(1, 1, anchor=tk.NW,
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

        :param i_channel: channel to be shown, integer in [0,n_channels)
        :param i_frame: frame to be shown, integer in [0,n_frames)

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


    def toggle_selection(self, *_):
        # Get current selection mode
        if self.SELECTION_STATE:
            self.control_selection(target=SELECTION_OFF)
        else:
            self.control_selection(target=SELECTION_ANCHOR)

    def update_selection_button(self):
        if self.SELECTION_STATE:
            self.select_button.config(text="Leave selection mode")
        else:
            self.select_button.config(text="Select")


    def control_selection(self, target):
        # By default, toggle selection mode
        #target = SELECTION_OFF if self.SELECTION_STATE else SELECTION_ANCHOR
        self.SELECTION_STATE = target
        self.update_selection_button()

        if self.SELECTION_STATE == SELECTION_ANCHOR:
            self.canvas.bind("<Button-1>", self.canvas_clicked)
        elif self.SELECTION_STATE == SELECTION_TILT:
            self.canvas.bind("<Motion>", self.canvas_moved)
        else:
            self.canvas.unbind("<Button-1>")
            self.canvas.unbind("<Motion>")

    def canvas_clicked(self, evt):
        if self.SELECTION_STATE == SELECTION_ANCHOR:
            self.sel_coords['x0'] = evt.x
            self.sel_coords['y0'] = evt.y
            self.control_selection(SELECTION_TILT)
  
    def canvas_moved(self, evt):
        if self.SELECTION_STATE == SELECTION_TILT: 
            # Clear rules
            self.canvas.delete("rule")

            # Get coordinates
            height = self.canvas.winfo_height()
            width = self.canvas.winfo_width()
            x0 = self.sel_coords['x0']
            y0 = self.sel_coords['y0']
            x1 = evt.x
            y1 = evt.y

            # Calculate new rules
            dx = x1 - x0
            dy = y1 - y0

            # Naming: [se][12][xy]
            # start point (s) or end point (e) of rule
            # first rule (1) or second rule (2)
            # x-coordinate (x) or y-coordinate (y)
            if dx == 0:
                # First rule
                s1x = x1
                e1x = x1
                s1y = 0
                e1y = height - 1

                # Second rule
                s2y = y1
                e2y = y1
                s2x = 0
                e2x = width - 1

                # Third rule
                s3y = y0
                e3y = y0
                s3x = 0
                e3x = width - 1

            else:
                # First rule
                s1x = 0
                e1x = width - 1
                s1y = dy / dx * (s1x - x1) + y1
                e1y = dy / dx * (e1x - x1) + y1

                # Second rule
                s2y = 0
                e2y = height - 1
                s2x = - dy / dx * (s2y - y1) + x1
                e2x = - dy / dx * (e2y - y1) + x1

                # Third rule
                s3y = 0
                e3y = height - 1
                s3x = - dy / dx * (s3y - y0) + x0
                e3x = - dy / dx * (e3y - y0) + x0

            # Draw new rules
            #self.canvas.create_line(x0, y0, x1, y1,
            #    fill="yellow", tags="rule")
            self.canvas.create_line(s1x, s1y, e1x, e1y,
                fill="red", tags="rule")
            self.canvas.create_line(s2x, s2y, e2x, e2y,
                fill="blue", tags="rule")
            self.canvas.create_line(s3x, s3y, e3x, e3y,
                fill="green", tags="rule")

            


if __name__ == "__main__":

    # Check if an image file was given
    if len(sys.argv) > 1:
        fn = sys.argv[1]
    else:
        fn = None

    # Set up GUI
    root = tk.Tk()
    root.title("Test")
    StackViewer(root, fn)
    root.mainloop()

