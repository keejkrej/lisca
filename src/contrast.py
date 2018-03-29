from gui_tk import get_root
import numpy as np
import tkinter as tk

class ContrastAdjuster:
    def __init__(self, sv):
        """Constructor of ContrastAdjuster frame.

        :param sv: StackViewer to which the ContrastAdjuster belongs
        :type sv: :py:class:`StackViewer`
        """
        root = get_root(sv.mainframe)

        self.stackviewer = sv
        self.trace_frame = sv.i_frame_var.trace_add("write",
            self._update_image)
        self.trace_channel = sv.i_channel_var.trace_add("write",
            self._update_image)

        self.mainframe = tk.Toplevel(root)
        self.mainframe.title("Adjust contrast")
        self.mainframe.bind("<Destroy>", self._close)

        self.scale_var = tk.BooleanVar(root)
        self.scale_check = tk.Checkbutton(self.mainframe, text="Autoscale",
            variable=self.scale_var)
        self.scale_check.pack()
        self.trace_scale = self.scale_var.trace_add("write",
            self._update_image)

        self.img = None
        self.i_frame = None
        self.i_channel = None
        self.img_min = None
        self.img_max = None

        self.pmin = None
        self.pmax = None

        self._update_image()


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


    def _update_image(self, *_):
        """Update information of the image (like color extrema)"""
        i_frame = self.stackviewer.i_frame_var.get() - 1
        i_channel = self.stackviewer.i_channel_var.get() - 1
        isUpdateDisplay = False

        if i_frame != self.i_frame or i_channel != self.i_channel:
            self.i_frame = i_frame
            self.i_channel = i_channel

            self.img = self.stackviewer.stack.get_image_copy(
                self.i_channel, self.i_frame)
            self.img_min = self.img.min()
            self.img_max = self.img.max()
        else:
            isUpdateDisplay = True

        self._set_limits()

        if isUpdateDisplay:
            self._update_display()


    def _set_limits(self):
        """Set limits of the colormap"""
        if self.scale_var.get():
            self.pmax = self.img_max
            self.pmin = self.img_min
        else:
            iinfo = np.iinfo(self.img.flat[0])
            self.pmax = iinfo.max
            self.pmin = iinfo.min


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
        img8 = np.empty_like(img, dtype=np.uint8)
        img8[:] = (img - self.pmin) / ((self.pmax - self.pmin) / 255)
        
        return img8


    def get_focus(self):
        """Give focus to this ContrastAdjuster frame"""
        self.mainframe.focus_set()

    def _update_display(self):
        """Cause the StackViewer to update the displayed image"""
        self.stackviewer._show_img()
