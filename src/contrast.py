from gui_tk import get_root
import numpy as np
import tkinter as tk

class ContrastAdjuster:
    def __init__(self, sv):
        """Constructor of ContrastAdjuster frame.

        :param sv: StackViewer to which the ContrastAdjuster belongs
        :type sv: :py:class:`StackViewer`
        """
        # Initialize attributes
        self.img = None
        self.histogram = None
        self.i_frame = None
        self.i_channel = None
        self.img_min = None
        self.img_max = None

        self.pmin = None
        self.pmax = None

        self.mouse_state = None
        self.mouse_moved = False
        self.former_mouse_x = None

        # Build GUI
        root = get_root(sv.mainframe)

        self.stackviewer = sv
        self.trace_frame = sv.i_frame_var.trace_add("write",
            self._update_scaling)
        self.trace_channel = sv.i_channel_var.trace_add("write",
            self._update_scaling)

        self.mainframe = tk.Toplevel(root)
        self.mainframe.title("Adjust contrast")
        self.mainframe.bind("<Destroy>", self._close)

        self.histcan = tk.Canvas(self.mainframe, width=256, height=100,
            background="white", highlightthickness=0)
        self.histcan.pack()

        self.scale_var = tk.StringVar(root)
        b = tk.Radiobutton(self.mainframe, text="No scaling",
            variable=self.scale_var, value="NONE")
        b.pack(anchor=tk.W)
        b = tk.Radiobutton(self.mainframe, text="Auto scaling",
            variable=self.scale_var, value="AUTO")
        b.pack(anchor=tk.W)
        b = tk.Radiobutton(self.mainframe, text="Manual scaling",
            variable=self.scale_var, value="MANUAL")
        b.pack(anchor=tk.W)
        self.scale_var.set("NONE")

        self.trace_scale = self.scale_var.trace_add("write",
            self._update_scaling)

        # Setup
        self._update_scaling()

        self.histcan.bind("<Button-1>", self._limit_selection_action)
        self.histcan.bind("<B1-Motion>", self._limit_selection_action)
        self.histcan.bind("<ButtonRelease-1>", self._limit_selection_finished)
        self.histcan.bind("<Motion>", self._draw_handle)
        self.histcan.bind("<Leave>", lambda _: self.histcan.delete("c"))


    def _close(self, *_, isDisplayUpdate=True):
        """Close the ContrastAdjuster frame.

        After closing, the contrast settings will be discarded.
        """
        self.stackviewer.contrast_adjuster = None

        if self.trace_scale is not None:
            self.scale_var.trace_remove("write", self.trace_scale)
            self.trace_scale = None
        if self.trace_frame is not None:
            self.stackviewer.i_frame_var.trace_remove("write",
                self.trace_frame)
            self.trace_frame = None
        if self.trace_channel is not None:
            self.stackviewer.i_channel_var.trace_remove("write",
                self.trace_channel)
            self.trace_channel = None

        # Inhibit multiple calls to this callback
        self.mainframe.unbind("<Destroy>")

        if isDisplayUpdate:
            self._update_display()


    def _update_scaling(self, *_):
        """Update information of the image (like color extrema)"""
        i_frame = self.stackviewer.i_frame_var.get() - 1
        i_channel = self.stackviewer.i_channel_var.get() - 1
        isUpdateDisplay = False

        if self.img is None or i_frame != self.i_frame or i_channel != self.i_channel:
            self.i_frame = i_frame
            self.i_channel = i_channel

            self.img = self.stackviewer.stack.get_image_copy(
                self.i_channel, self.i_frame)
            self.img_min = self.img.min()
            self.img_max = self.img.max()

            self.draw_hist()
        else:
            isUpdateDisplay = True

        self._set_limits()

        if isUpdateDisplay:
            self._update_display()


    def _get_movement_action(self, y):
        """
        Assess which limit movement action to perform

        The movement action is determined by the y-position of the
        mouse pointer on the canvas.
        The following positions are possible:

        * If the mouse is in the upper quarter of the canvas, move the maximum (returns ``MAX``).
        * If the mouse is in the middle two quarters of the canvas, move both minimum and maximum (returns ``BOTH``).
        * If the mouse is in the lower quarter of the canvas, move the minimum (returns ``MIN``).

        :param y: Mouse position on canvas
        :type y: scalar numerical
        :return: The determined movement action
        :rtype: str
        """
        # Get histogram height
        self.histcan.update_idletasks()
        height = self.histcan.winfo_height()

        # Decide which action to perform
        if y < .25 * height:
            action = "MAX"
        elif y <= .75 * height:
            action = "BOTH"
        else:
            action = "MIN"
        return action


    def _limit_selection_action(self, evt):
        if self.mouse_state is None:
            action = self._get_movement_action(evt.y)
            self.mouse_state = action
        else:
            action = self.mouse_state

        self.histcan.update_idletasks()
        height = self.histcan.winfo_height()
        width = self.histcan.winfo_width()

        if action == "MAX":
            new_max = evt.x
            new_min = None
        elif action == "MIN":
            new_max = None
            new_min = evt.x
        elif action == "BOTH":
            a = (self.pmax - self.pmin) * width / height / self.hist_max
            new_y = height - evt.y
            new_min = -a * new_y + evt.x
            new_max = a * (height - new_y) + evt.x

        if new_min is not None:
            new_min *= self.hist_max / width
        if new_max is not None:
            new_max *= self.hist_max / width

        if action == "BOTH":
            if new_min < 0:
                diff = new_min
            elif new_max > self.hist_max:
                diff = new_max - self.hist_max
            else:
                diff = 0
            new_min -= diff
            new_max -= diff

        elif new_min is not None:
            if new_min < 0:
                new_min = 0
            elif new_min >= self.hist_max:
                new_min = self.hist_max - 1
                new_max = self.hist_max
            elif new_min >= self.pmax:
                new_max = new_min + 1

        elif new_max is not None:
            if new_max < 1:
                new_max = 1
                new_min = 0
            elif new_max > self.hist_max:
                new_max = self.hist_max
            elif new_max <= self.pmin:
                new_min = new_max - 1

        self.scale_var.set("MANUAL")
        self._set_limits(new_min, new_max)
        self._draw_handle(evt)


    def _limit_selection_finished(self, evt):
        # Reset limit movement control variables
        self.mouse_state = None


    def _set_limits(self, new_min=None, new_max=None):
        """Set limits of the colormap"""
        if new_min is not None or new_max is not None:
            if new_min is not None:
                self.pmin = new_min
            if new_max is not None:
                self.pmax = new_max
        elif self.scale_var.get() == "AUTO":
            self.pmax = self.img_max
            self.pmin = self.img_min
        elif self.scale_var.get() == "NONE":
            iinfo = np.iinfo(self.img.flat[0])
            self.pmax = iinfo.max
            self.pmin = iinfo.min

        print("pmin={:2f}, pmax={:2f}".format(self.pmin, self.pmax))
        self.draw_limit_line()


    def convert(self, img):
        """Convert an image to uint8

        The image is scaled depending on the settings of control variables
        of this ContrastAdjuster instance.
        
        :param img: The image to be scaled
        :type img: 2-dim numpy array
        
        :return: The converted image
        :rtype: 2-dim numpy array with dtype uint8
        """
        #print("min: {}, max: {}".format(self.pmin, self.pmax))
        mask_min = img <= self.pmin
        mask_max = img >= self.pmax
        mask_between = ~(mask_min | mask_max)

        img8 = np.empty_like(img, dtype=np.uint8)
        img8[mask_min] = 0
        img8[mask_max] = 255
        img8[mask_between] = np.round((img[mask_between] - self.pmin) / (self.pmax / 255))
        
        return img8

    def draw_hist(self):
        """Calculate the image histogram."""
        # Get the maximum of the histogram
        if self.img_max <= 0xff:
            self.hist_max = 0xff        # 8-bit
        elif self.img_max <= 0x0fff:
            self.hist_max = 0x0fff      # 12-bit
        elif self.img_max <= 0x3fff:
            self.hist_max = 0x3fff      # 14-bit
        else:
            self.hist_max = 0xffff      # 16-bit

        # Calculate histogram
        self.histcan.update_idletasks()
        n_bins = self.histcan.winfo_width()
        hist_height = self.histcan.winfo_height()

        self.histogram = np.histogram(self.img, bins=n_bins,
            range=(0, self.hist_max))[0]
        self.histogram = np.ceil(self.histogram / (self.img.size / hist_height))

        # Draw histogram
        self.histcan.delete("h")
        for i, x in enumerate(self.histogram):
            self.histcan.create_line(i, hist_height, i, hist_height - x, tags="h")
        self.histcan.tag_lower("h")


    def draw_limit_line(self):
        self.histcan.update_idletasks()
        width = self.histcan.winfo_width()
        height = self.histcan.winfo_height()

        x_min = width * self.pmin / self.hist_max
        x_max = width * self.pmax / self.hist_max

        self.histcan.delete("l")
        self.histcan.create_line(x_min, height, x_max, 0,
            fill="red", tags="l")


    def _draw_handle(self, evt):
        # Get canvas properties
        self.histcan.update_idletasks()
        width = self.histcan.winfo_width()
        height = self.histcan.winfo_height()

        # Get action
        if self.mouse_state is None:
            action = self._get_movement_action(evt.y)
        else:
            action = self.mouse_state

        # Get handle position
        if action == "MIN":
            x_handle = width * self.pmin / self.hist_max
            y_handle = height
        elif action == "MAX":
            x_handle = width * self.pmax / self.hist_max
            y_handle = 0
        else:
            y_handle = evt.y
            x_handle = ( (self.pmax - self.pmin) / height * (height - y_handle) + self.pmin ) * width / self.hist_max

        # Draw new handle
        r = 4
        self.histcan.delete("c")
        self.histcan.create_oval(x_handle-r, y_handle-r, x_handle+r, y_handle+r, fill="red", outline="", tags="c")


    def get_focus(self):
        """Give focus to this ContrastAdjuster frame"""
        self.mainframe.focus_set()

    def _update_display(self):
        """Cause the StackViewer to update the displayed image"""
        self.stackviewer._show_img()
