#! /usr/bin/env python3

import os
import queue
import sys
from threading import Condition
import tkinter as tk
import tkinter.filedialog as tkfdlg
import tkinter.ttk as ttk
import warnings
from .contrast import ContrastAdjuster
from .gui_tk import new_toplevel
from .roi import RectRoi
from .stack import Stack

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
    """
    Provides a GUI for displaying a TIFF stack.

    :param root: The frame in which to create the :py:class:`StackViewer`.
    :type root: None or :py:class:`tkinter.Toplevel`
    :param image_file: Path of a TIFF file to open
    :type image_file: None or str

    The :py:class:`StackViewer` is the TIFF stack display tool in PyAMA.

    It provides a :py:class:`ContrastAdjuster`, a utility for adjusting
    the displayed color map.
    Changing the displayed color map only affects display, not the
    color values in the underlying :py:class:`Stack`.

    The :py:class:`StackViewer` is thread-safe and can display concurrent
    changes of the stack or of the ROIs via listeners.

    Moreover, the :py:class:`StackViewer` implements a set of functions
    for interacting with a ROI adjuster:

    * :py:meth:`StackViewer.start_roi_adjustment` creates, if necessary,
      a new ROI adjuster instance and invokes the ``start_adjustment``
      method of the ROI adjuster to start the ROI adjustment process.

      The ROI adjuster should now start ROI adjustment.

    * :py:meth:`StackViewer.stop_roi_adjustment` aborts the ROI adjustment
      process by calling the ``stop_adjustment`` method of the ROI adjuster.

      The ROI adjuster should now abort ROI adjustment and call
      :py:meth:`StackViewer.notify_roi_adjustment_finished`.

      The ROI adjuster should leave the Stack, the StackViewer and the
      canvas in a clean state.

    * :py:meth:`StackViewer.notify_roi_adjustment_finished` notifies the
      :py:class:`StackViewer` that ROI adjustment has finished.

      The ROI adjuster should call this method when ROI adjustment is
      finished.

    * :py:meth:`StackViewer.forget_roi_adjuster` aborts ROI adjustment
      by calling :py:meth:`StackViewer.stop_roi_adjustment` if the
      adjustment is not finished yet.

      Then it calls the ``close`` method of the ROI adjuster, if present,
      which preferably causes the ROI adjuster to close its window.

      Finally, the internal reference of the :py:class:`StackViewer`
      to the ROI adjuster is cleared.

    For optimal compliance with these functions, a ROI adjuster should
    implement the following methods, which, however, are optional:

    * ``start_adjustment``
    * ``stop_adjustment``
    * ``close``
    """

    def __init__(self, parent=None, image_file=None, root=None, show_buttons=True):
        """Initialize the GUI."""
        # Initialize GUI components
        if parent is None:
            self.root = new_toplevel(root)
            self.root.title("StackViewer")
        else:
            self.root = parent

        self.closing_state = False
        self.root.bind("<Destroy>", self._close)

        self.contrast_adjuster = None
        self.image_listener_id = None
        self.roi_listener_id = None
        self._update_queue = queue.Queue()

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

        self.show_rois_var = tk.BooleanVar()
        self.show_rois_var.set(True)
        self.show_rois_var.trace_add("write", self.draw_rois)

        ## GUI elements:
        # Main frame
        self.mainframe = ttk.Frame(self.root, relief=tk.FLAT,
                                   width=100, height=100)
        self.mainframe.pack(fill=tk.BOTH, expand=tk.YES)
        self.mainframe.columnconfigure(COL_SCALES, weight=1)
        self.mainframe.rowconfigure(ROW_CANVAS, weight=1)

        # (Temporal) Header with button for adjusting stack
        tempframe = ttk.Frame(self.mainframe)
        tempframe.grid(row=ROW_HEADER, column=0, columnspan=COLSPAN_CANVAS)

        self.contrast_button = ttk.Button(tempframe, text="Contrast",
                                          command=self.open_contrast_adjuster)

        if show_buttons:
            self.contrast_button.pack(side=tk.LEFT)
        self.adjustment_button = ttk.Button(tempframe, text="Adjust ROIs",
                                            command=self.toggle_roi_adjustment,
                                            state=tk.NORMAL)
        if show_buttons:
            self.adjustment_button.pack(side=tk.LEFT)

        self.open_button = ttk.Button(tempframe, text="Browse...",
                                      command=self.open_stack, state=tk.NORMAL)
        if show_buttons:
            self.open_button.pack(side=tk.LEFT)

        self.label = ttk.Label(tempframe, text="")

        if show_buttons:
            self.label.pack(side=tk.LEFT)

        # Canvas
        self.frame_canvas = ttk.Frame(self.mainframe)
        self.frame_canvas.grid(row=ROW_CANVAS, column=0,
                               columnspan=COLSPAN_CANVAS)
        self.frame_canvas.columnconfigure(0, weight=1)
        self.frame_canvas.rowconfigure(0, weight=1)

        self.canvas = tk.Canvas(self.frame_canvas,
                                width=100, height=100,
                                borderwidth=0, highlightthickness=0,
                                background=None)
        self.canvas.grid(row=0, column=0, sticky="NESW")

        self.scroll_canvas_horiz = ttk.Scrollbar(self.frame_canvas,
                                                 orient=tk.HORIZONTAL,
                                                 command=self.canvas.xview)
        self.scroll_canvas_vert = ttk.Scrollbar(self.frame_canvas,
                                                orient=tk.VERTICAL,
                                                command=self.canvas.yview)

        self.canvas.config(scrollregion=self.canvas.bbox(tk.ALL),
                           xscrollcommand=self.scroll_canvas_horiz.set,
                           yscrollcommand=self.scroll_canvas_vert.set)
        self.canvas.bind("<Configure>", self.update_scrollbars)

        # Channel control elements
        self.scale_channel = tk.Scale(
                                      self.mainframe,
                                      variable=self.i_channel_var,
                                      orient=tk.HORIZONTAL,
                                      showvalue=False,
                                      from_=1,
                                      resolution=1,
                                     )
        self.lbl_channel = ttk.Label(self.mainframe,
                                     text="Channel:",
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

        # Start listening to external events
        self.root.after(40, self._update)

        # Register ROI adjuster
        self.roi_adjustment_state = False
        self.roi_adjuster = None

        if image_file is not None:
            self.open_stack(image_file)

        # Ensure drawing
        #self.root.update_idletasks()

    def _update(self):
        """
        Execute jobs in queue.

        Call this method only from whithin the Tkinter main thread.
        """
        while True:
            try:
                func, args, kwargs, cv = self._update_queue.get(block=False)
            except queue.Empty:
                break

            if cv is not None:
                def sfunc(*args, **kwargs):
                    nonlocal func, cv
                    func(*args, **kwargs)
                    with cv:
                        cv.notify_all()
            else:
                sfunc = func

            self.root.after_idle(sfunc, *args, **kwargs)
        self.root.after(40, self._update)


    def schedule(self, func, *args, **kwargs):
        """
        Feed new job into queue.

        This function can be used to change the GUI from another thread.
        See also :py:meth:`schedule_and_wait`.
        """
        self._update_queue.put((func, args, kwargs, None))


    def schedule_and_wait(self, func, *args, **kwargs):
        """
        Feed new job into queue and wait until it is finished.

        This function can be used to change the GUI from another thread.
        See also :py:meth:`schedule`.
        """
        cv = Condition()
        with cv:
            self._update_queue.put((func, args, kwargs, cv))
            cv.wait()


    def open_stack(self, fn=None):
        """
        Open a :py:class:`Stack` and display it.

        :param fn: The path to the stack to be opened.
        :type fn: str or None.

            If ``None``, show a file selection dialog.
        """
        if fn is None:
            self.open_button.configure(state=tk.DISABLED)
            fn = tkfdlg.askopenfilename(title="Choose stack file",
                filetypes=(("TIFF", ("*.tif","*.tiff")),("All files", "*.*")))
            self.open_button.configure(state=tk.NORMAL)

        if not os.path.isfile(fn):
            raise FileNotFoundError("Cannot open stack: not found: {}".format(fn))

        #self.label["text"] = fn
        self._set_stack(Stack(fn))

    def set_stack(self, s, wait=True):
        if wait:
            self.schedule_and_wait(self._set_stack, s)
        else:
            self.schedule(self._set_stack, s)

    def _set_stack(self, s):
        """Set the stack that is displayed."""
        if self.stack is not None:
            self.stack.delete_listener(self.image_listener_id)
            self.image_listener_id = None
            self.stack.delete_listener(self.roi_listener_id)
            self.roi_listener_id = None
            self.stack.close()
        self.stack = s
        self.img = None
        self._update_stack_properties()
        self.image_listener_id = self.stack.add_listener(
                lambda: self.schedule(self._update_stack_properties), "image")
        self.roi_listener_id = self.stack.add_listener(
                lambda: self.schedule(self.draw_rois), "roi")


    def _show_img(self):
        """Update the image shown."""
        if self.contrast_adjuster is None:
            convert_fcn = None
        else:
            convert_fcn = self.contrast_adjuster.convert

        self.img = self.stack.get_frame_tk(channel=self.i_channel,
                                           frame=self.i_frame,
                                           convert_fcn=convert_fcn)
        self.canvas.delete("img")
        self.canvas.create_image(0, 0, anchor=tk.NW,
                                 image=self.img, tags=("img",))
        self.canvas.tag_lower("img")
        self.draw_rois()


    def _update_stack_properties(self):
        """Read stack dimensions and adjust GUI."""
        self.canvas.config(width=self.stack.width, height=self.stack.height)

        self.n_channels = self.stack.n_channels
        if self.i_channel is None or self.i_channel >= self.n_channels:
            #self.i_channel = 0
            self.i_channel_var.set(1)

        self.n_frames = self.stack.n_frames
        if self.i_frame is None or self.i_frame >= self.n_frames:
            #self.i_frame = 0
            self.i_frame_var.set(1)

        self.label.config(text=self.stack.path)
        self.update_scrollbars()

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

        # Update stack
        self._change_stack_position(force=True)


    def _change_stack_position(self, i_channel=None, i_frame=None, force=False):
        """
        Change the shown image.

        :param i_channel: channel to be shown, integer in [0,n_channels)
        :param i_frame: frame to be shown, integer in [0,n_frames)
        :param force: if `True`, redraw image even without change

        If i_channel or i_frame is None, it is not changed.
        """
        if self.stack is None:
            return
        if force:
            isChanged = True
        else:
            isChanged = False
            if i_channel is not None and i_channel != self.i_channel:
                self.i_channel = i_channel
                isChanged = True
            if i_frame is not None and i_frame != self.i_frame:
                self.i_frame = i_frame
                isChanged = True
        if self.i_frame is None or self.i_channel is None:
            return
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

    def toggle_roi_adjustment(self, *_):
        """Callback of ROI adjustment button."""
        if self.roi_adjustment_state:
            self.stop_roi_adjustment()
        else:
            self.start_roi_adjustment()

    def start_roi_adjustment(self, *_):
        """Start ROI adjustment"""
        if self.roi_adjuster is None:
            self.roi_adjuster = RectRoi.Adjuster(self)
        if hasattr(self.roi_adjuster, 'start_adjustment'):
            self.roi_adjuster.start_adjustment()
        self.roi_adjustment_state = True

    def stop_roi_adjustment(self, *_):
        """Finish or abort ROI adjustment"""
        if hasattr(self.roi_adjuster, 'stop_adjustment'):
            self.roi_adjuster.stop_adjustment()
        self.roi_adjustment_state = False
        self.forget_roi_adjuster()

    def notify_roi_adjustment_finished(self, *_):
        """Notify :py:class:`StackViewer` that ROI adjustment is finished"""
        self.roi_adjustment_state = False
        self.forget_roi_adjuster()

    def forget_roi_adjuster(self, *_):
        """Close roi adjuster."""
        if self.roi_adjustment_state:
            self.stop_roi_adjustment()
        if self.roi_adjuster is not None:
            if hasattr(self.roi_adjuster, 'close'):
                self.roi_adjuster.close()
            self.roi_adjuster = None

    def update_scrollbars(self, *_):
        """Update the settings of the scrollbars around the canvas"""
        # Get size of canvas frame (maximum displayable area)
        self.root.update_idletasks()
        view_width = self.canvas.winfo_width()
        view_height = self.canvas.winfo_height()

        # Get bounding box of canvas content
        cbb = self.canvas.bbox("img")
        if cbb is None:
            canvas_width = 0
            canvas_height = 0
        else:
            canvas_width = cbb[2] - cbb[0]
            canvas_height = cbb[3] - cbb[1]

        # Set canvas scroll viewport
        self.canvas.config(scrollregion=cbb)

        # Configure scrollbar appearances
        if canvas_width > view_width:
            self.scroll_canvas_horiz.grid(row=1, column=0, sticky="WE")
        else:
            self.scroll_canvas_horiz.grid_forget()
        if canvas_height > view_height:
            self.scroll_canvas_vert.grid(row=0, column=1, sticky="NS")
        else:
            self.scroll_canvas_vert.grid_forget()

    def canvas_bbox(self):
        """
        Get bounding box size of image in canvas.

        :return: Canvas height and canvas width, in pixels
        :rtype: tuple ``(width, height)``"""
        cbb = self.canvas.bbox("img")
        if cbb is None:
            return 0, 0
        canvas_width = cbb[2] - cbb[0]
        canvas_height = cbb[3] - cbb[1]
        return canvas_width, canvas_height

    def open_contrast_adjuster(self, *_):
        """Callback for opening a :py:class:`ContrastAdjuster` frame."""
        if self.contrast_adjuster is None:
            self.contrast_adjuster = ContrastAdjuster(self)
        else:
            self.contrast_adjuster.get_focus()

    def draw_rois(self, *_):
        """Draw the ROIs in the current frame."""
        # Clear old ROIs
        self.canvas.delete("roi")

        # If there are no ROIs to draw, we’re done here
        roi_collections = self.stack.rois
        if not self.show_rois_var.get() or not roi_collections:
            return

        for roi_col in roi_collections.values():
            rois = None
            try:
                rois = roi_col[self.i_frame]
            except KeyError:
                rois = None
            if rois is None:
                try:
                    rois = roi_col[Ellipsis]
                except KeyError:
                    rois = None
            if rois is None:
                continue

            color = roi_col.color
            if color is None:
                color = "yellow"

            for roi in rois:
                self.canvas.create_polygon(*roi.corners[:, ::-1].flat,
                                           fill="", outline=color, tags="roi")

    def _close(self, *_):
        if self.closing_state:
            return
        self.closing_state = True

        if self.contrast_adjuster is not None:
            self.contrast_adjuster.close()
            self.contrast_adjuster = None
        self.forget_roi_adjuster()


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
