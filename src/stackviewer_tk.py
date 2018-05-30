#! /usr/bin/env python3

from contrast import ContrastAdjuster
from gui_tk import new_toplevel
import os
import queue
import roi_selection as roi_sel
import roi_selector
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

class StackViewer:
    """
    Provides a GUI for displaying a TIFF stack.

    :param root: The frame in which to create the :py:class:`StackViewer`.
    :type root: None or :py:class:`tkinter.Toplevel`
    :param image_file: Path of a TIFF file to open
    :type image_file: None or str

    The :py:class:`StackViewer` is the TIFF stack display tool in PyAMA.

    It provides a :py:class:`ContrastAdjuster`, an utility for adjusting
    the displayed color map.
    Changing the displayed color map only affects display, not the
    color values in the underlying :py:class:`Stack`.

    It is thread-safe and can display concurrent changes of the stack
    or of the ROIs via listeners.

    Moreover, the :py:class:`StackViewer` implements an set of function
    for interacting with a ROI selector:

    * :py:meth:`StackViewer.start_roi_selection` creates, if necessary,
      a new ROI selector instance and invokes the ``start_selection``
      method of the ROI selector to start the ROI selection process.

      The ROI selector should now start ROI selection.

    * :py:meth:`StackViewer.stop_roi_selection` aborts the ROI selection process by calling the ``stop_selection`` method of the ROI selector.

      The ROI selector should now abort ROI selection and call
      :py:meth:`StackViewer.notify_roi_selection_finished`.

      The ROI selector should leave the Stack, the StackViewer and the
      canvas in a clean state.

    * :py:meth:`StackViewer.notify_roi_selection_finished` notifies the
      :py:class:`StackViewer` that ROI selection has finished.

      The ROI selector should call this method when ROI selection is
      finished.

    * :py:meth:`StackViewer.forget_roi_selector` aborts ROI selection
      by calling :py:meth:`StackViewer.stop_roi_selection` if the selection
      is not finished yet.

      Then it calls the ``close`` method of the ROI selector, if present,
      which might cause the ROI selector to close its window.

      Finally, the internal reference of the :py:class:`StackViewer`
      to the ROI selector is cleared.

    For optimal compliance with these functions, a ROI selector should
    implement the following methods, which, however, are optional:

    * ``start_selection``
    * ``stop_selection``
    * ``close``

    """

    def __init__(self, root=None, image_file=None):
        """Initialize the GUI."""
        # Initialize GUI components
        if root is None:
            self.root = new_toplevel()
        else:
            self.root = root
        self.root.title("StackViewer")
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

        # (Temporal) Header with button for selecting stack
        tempframe = ttk.Frame(self.mainframe)
        tempframe.grid(row=ROW_HEADER, column=0, columnspan=COLSPAN_CANVAS)

        self.contrast_button = ttk.Button(tempframe, text="Contrast",
            command=self.open_contrast_adjuster)
        self.contrast_button.pack(side=tk.LEFT)
        self.select_button = ttk.Button(tempframe, text="Select",
            command=self.toggle_selection, state=tk.NORMAL)
        self.select_button.pack(side=tk.LEFT)
        self.selector_button = ttk.Button(tempframe, text="Select2",
            command=lambda:roi_selector.new_roi_selector(self), state=tk.NORMAL)
        self.selector_button.pack(side=tk.LEFT)
        self.open_button = ttk.Button(tempframe, text="Browse...",
            command=self.open_stack, state=tk.NORMAL)
        self.open_button.pack(side=tk.LEFT)
        self.label = ttk.Label(tempframe, text="")
        self.label.pack(side=tk.LEFT)

        # Canvas
        self.frame_canvas = ttk.Frame(self.mainframe)
        self.frame_canvas.grid(row=ROW_CANVAS, column=0, columnspan=COLSPAN_CANVAS)
        self.frame_canvas.columnconfigure(0, weight=1)
        self.frame_canvas.rowconfigure(0, weight=1)

        self.canvas = tk.Canvas(self.frame_canvas, width=100, height=100,
            borderwidth=0,
            highlightthickness=0, background="white")
        self.canvas.grid(row=0, column=0, sticky="NESW")

        self.scroll_canvas_horiz = ttk.Scrollbar(self.frame_canvas,
            orient=tk.HORIZONTAL, command=self.canvas.xview)
        self.scroll_canvas_vert = ttk.Scrollbar(self.frame_canvas,
            orient=tk.VERTICAL, command=self.canvas.yview)

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

        # Start listening to external events
        self.root.after(40, self._update)

        # Register ROI selection
        self.roi_selector = None
        self.roi_selection_state = False

        if image_file is not None:
            self.open_stack(image_file)


    def _update(self):
        """
        Execute jobs in queue.
        
        Call this method only from whithin the Tkinter main thread.
        """
        while True:
            try:
                func, args, kwargs = self._update_queue.get(block=False)
            except queue.Empty:
                break
            self.root.after_idle(func, *args, **kwargs)
        self.root.after(40, self._update)

    def schedule(self, func, *args, **kwargs):
        """
        Feed new job into queue.
        
        Use this function to change the GUI from another thread.
        """
        self._update_queue.put((func, args, kwargs))

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
            warnings.warn("Cannot open stack: not found: {}".format(fn))
            return

        #self.label["text"] = fn
        self._set_stack(stack.Stack(fn))

    def set_stack(self, s):
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
        self.image_listener_id = self.stack.add_listener(lambda: self.schedule(self._update_stack_properties), "image")
        self.roi_listener_id = self.stack.add_listener(lambda: self.schedule(self.draw_rois), "roi")


    def _show_img(self):
        """Update the image shown."""
        convert_fcn = None
        if self.contrast_adjuster is not None:
            convert_fcn = self.contrast_adjuster.convert

        self.img = self.stack.get_frame_tk(channel=self.i_channel,
            frame=self.i_frame, convert_fcn=convert_fcn)

        self.canvas.delete("img")
        self.canvas.create_image(0, 0, anchor=tk.NW,
            image=self.img, tags=("img",))
        self.canvas.tag_lower("img")
        self.draw_rois()


    def _update_stack_properties(self):
        """Read stack dimensions and adjust GUI."""
        self.canvas.config(width=self.stack.width, height=self.stack.height)

        self.n_channels = self.stack.n_channels
        self.n_frames = self.stack.n_frames
        self.i_channel = 0
        self.i_frame = 0

        self.i_channel_var.set(1)
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
        """Callback of selection button."""
        if self.roi_selection_state:
            self.stop_roi_selection()
        else:
            self.start_roi_selection()


    def start_roi_selection(self, *_):
        """Start ROI selection"""
        if self.roi_selector is None:
            self.roi_selector = roi_sel.RoiReader(self)

        if hasattr(self.roi_selector, 'start_selection'):
            self.roi_selector.start_selection()

        self.roi_selection_state = True


    def stop_roi_selection(self, *_):
        """Finish or abort ROI selection"""
        if hasattr(self.roi_selector, 'stop_selection'):
            self.roi_selector.stop_selection()
        self.notify_roi_selection_finished()


    def notify_roi_selection_finished(self, *_):
        """Notify :py:class:`StackViewer` that ROI selection has finished"""
        self.roi_selection_state = False


    def forget_roi_selector(self, *_):
        """Close roi selector."""
        if self.roi_selection_state:
            self.stop_roi_selection()

        if hasattr(self.roi_selector, 'close'):
            self.roi_selector.close()

        self.roi_selector = None


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
        if not self.show_rois_var.get() or self.stack.rois is None:
            return

        if self.i_frame in self.stack.rois:
            roi_key = self.i_frame
        elif Ellipsis in self.stack.rois:
            roi_key = Ellipsis
        else:
            return

        rois = self.stack.get_rois(frame=roi_key)
        for roi in rois:
            self.canvas.create_polygon(*roi.corners[:,::-1].flat, fill="", outline="yellow", tags="roi")


    def _close(self, *_):
        if self.contrast_adjuster is not None:
            self.contrast_adjuster.close()
            self.contrast_adjuster = None



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

