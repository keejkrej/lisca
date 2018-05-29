import math
import tkinter as tk
import tkinter.ttk as ttk

UNIT_px = 'px'
UNIT_µm = 'µm'
TYPE_RECT = 'rect'
TYPE_SQUARE = 'sqare'

PAD_COLUMN_SEP = 20
RED_FLASH_MS = 300

def new_roi_selector(sv):
    return RoiSelector(sv)

def float2str(f, var=None):
    """
    Convert float to nicely formatted string
    
    :param f: float to convert to string
    :type f: float
    :param var: (optional) tkinter.StringVar to write value to
    :type var: None or tkinter.StringVar
    :return: string with nicely formatted float, or None
    :rtype: str or None
    """
    s = "{:f}".format(f)
    idx_point = s.find(".")
    if idx_point > -1:
        s = s.rstrip("0")
        if len(s) == idx_point + 1:
            s = s[:-1]
    if not s:
        s = "0"
    if var is not None:
        var.set(s)
    return s

def str2float(s, mustPositive=True, mustNonNegative=False):
    """
    Convert string to float

    :param s: The string or tkinter StringVar to convert
    :type s: str or tkinter.StringVar
    :param mustPositive: flag if value must be larger than 0
    :type mustPositive: bool
    :param mustNonNegative: flag if value must not be smaller than 0
    :type mustNonNegative: bool
    :return: the float value or None for invalid string
    :rtype: float or None
    """
    if type(s) != str:
        s = s.get()
    s = s.replace(',', '.')
    try:
        f = float(s)
    except Exception:
        return None
    if not math.isfinite(f):
        return None
    elif mustPositive and f <= 0:
        return None
    elif mustNonNegative and f < 0:
        return None
    else:
        return f

def flash_red(widget):
    """Make widget background flash red"""
    #old_bg = widget.cget("background")
    widget.config(background="red")
    widget.after(RED_FLASH_MS, lambda:widget.config(background="white"))


class RoiSelector:
    def __init__(self, sv):
        # Get StackViewer-related content
        self.sv = sv
        self.canvas = sv.canvas

        # Define control/logic variables
        # Length unit is pixels, with 1px = `self.unit_conv_fac` µm
        # Angle unit is degree
        self.unit_conv_fac = .6
        self.offset_x = 5
        self.offset_y = 0
        self.width = 50
        self.height = 50
        self.pad_x = 20
        self.pad_y = 20
        self.angle = 0

        # Set up window
        self.root = tk.Toplevel(sv.root)
        self.root.title("PyAMA ROI-Selector")
        self.root.event_add("<<Submit>>", "<Return>", "<KP_Enter>")

        # Define variables
        self.var_unit = tk.StringVar(self.root, value=UNIT_px)
        self.var_unit_px = tk.StringVar(self.root, value=1)
        self.var_unit_µm = tk.StringVar(self.root, value=1)
        self.var_type_roi = tk.StringVar(self.root, value=TYPE_SQUARE)
        self.var_offset_x = tk.StringVar(self.root, value=self.offset_x)
        self.var_offset_y = tk.StringVar(self.root, value=self.offset_y)
        self.var_width = tk.StringVar(self.root, value=self.width)
        self.var_height = tk.StringVar(self.root, value=self.height)
        self.var_pad_x = tk.StringVar(self.root, value=self.pad_x)
        self.var_pad_y = tk.StringVar(self.root, value=self.pad_y)
        self.var_angle = tk.StringVar(self.root, value=self.angle)

        # Build GUI

        ## Radio buttons
        self._new_label("Units:", 0, 0)
        tk.Radiobutton(self.root, text=UNIT_px, value=UNIT_px,
            variable=self.var_unit, anchor=tk.W).grid(row=0, column=1,
            columnspan=2, sticky=tk.W)
        tk.Radiobutton(self.root, text=UNIT_µm, value=UNIT_µm,
            variable=self.var_unit, anchor=tk.W).grid(row=0, column=4,
            columnspan=2, sticky=tk.W)

        self.entry_unit_px = tk.Entry(self.root, width=5,
            textvariable=self.var_unit_px, background="white")
        self.entry_unit_px.grid(row=1, column=1, sticky="WE")
        self.entry_unit_px.bind("<<Submit>>", self.update_unit_conversion)
        self._new_label(UNIT_px, 1, 2)
        self._new_label("=", 1, 3, pad=5)
        self.entry_unit_µm = tk.Entry(self.root, width=5,
            textvariable=self.var_unit_µm, background="white")
        self.entry_unit_µm.grid(row=1, column=4, sticky="WE")
        self.entry_unit_µm.bind("<<Submit>>", self.update_unit_conversion)
        self._new_label(UNIT_µm, 1, 5)

        self._new_label("Type:", 2, 0)
        tk.Radiobutton(self.root, text="Square", value=TYPE_SQUARE,
            variable=self.var_type_roi, anchor=tk.W).grid(row=2, column=1,
            columnspan=2, sticky=tk.W)
        tk.Radiobutton(self.root, text="Rectangle", value=TYPE_RECT,
            variable=self.var_type_roi, anchor=tk.W).grid(row=2, column=4,
            columnspan=2, sticky=tk.W)

        ## Build spinboxes
        self._new_label("x-Offset:", 3, 0)
        self.sp_offset_x = self._new_spinbox(self.var_offset_x, 3, 1)
        self._new_label(self.var_unit, 3, 2)
        self._new_label("y-Offset:", 3, 4)
        self.sp_offset_y = self._new_spinbox(self.var_offset_y, 3, 5)
        self._new_label(self.var_unit, 3, 6)

        self._new_label("Width:", 4, 0)
        self.sp_width = self._new_spinbox(self.var_width, 4, 1)
        self._new_label(self.var_unit, 4, 2)
        self._new_label("Height:", 4, 4)
        self.sp_height = self._new_spinbox(self.var_height, 4, 5)
        self._new_label(self.var_unit, 4, 6)

        self._new_label("x-Padding:", 5, 0)
        self.sp_pad_x = self._new_spinbox(self.var_pad_x, 5, 1)
        self._new_label(self.var_unit, 5, 2)
        self._new_label("y-Padding:", 5, 4)
        self.sp_pad_y = self._new_spinbox(self.var_pad_y, 5, 5)
        self._new_label(self.var_unit, 5, 6)

        self._new_label("Angle:", 6, 0)
        self.sp_angle = self._new_spinbox(self.var_angle, 6, 1)
        self._new_label("°", 6, 2)

        # Callbacks
        self.sp_offset_x.bind("<<Submit>>", self.submit_spinner)
        self.sp_offset_x.config(command=lambda: self.spinner_input(self.sp_offset_x))

        self.sp_offset_y.bind("<<Submit>>", self.submit_spinner)
        self.sp_offset_y.config(command=lambda: self.spinner_input(self.sp_offset_y))

        self.sp_width.bind("<<Submit>>", self.submit_spinner)
        self.sp_width.config(command=lambda: self.spinner_input(self.sp_width))

        self.sp_height.bind("<<Submit>>", self.submit_spinner)
        self.sp_height.config(command=lambda: self.spinner_input(self.sp_height))

        self.sp_pad_x.bind("<<Submit>>", self.submit_spinner)
        self.sp_pad_x.config(command=lambda: self.spinner_input(self.sp_pad_x))

        self.sp_pad_y.bind("<<Submit>>", self.submit_spinner)
        self.sp_pad_y.config(command=lambda: self.spinner_input(self.sp_pad_y))

        self.sp_angle.bind("<<Submit>>", self.submit_spinner)
        self.sp_angle.config(command=lambda: self.spinner_input(self.sp_angle))

        self.var_unit.trace_add("write", lambda *_:self.update_units())
        self.var_type_roi.trace_add("write", self.update_roi_type)

        # Initialize state
        self.update_units()
        self.update_roi_type()


    def _new_label(self, text, row, column, parent=None, pad=0):
        """Label factory method"""
        if parent is None:
            parent = self.root

        content = {}
        if type(text) == str:
            content["text"] = text
        else:
            content["textvariable"] = text

        label = tk.Label(parent, **content, anchor=tk.W)
        label.grid(row=row, column=column, sticky="WE", padx=pad)
        return label


    def _new_spinbox(self, var, row, column, parent=None):
        """Spinbox factory method"""
        if parent is None:
            parent = self.root

        sb = tk.Spinbox(parent, from_=-math.inf, to=math.inf, width=5,
            textvariable=var, background="white")
        sb.grid(row=row, column=column, sticky="WE")
        return sb


    def update_units(self):
        """Callback for switching between px and µm"""
        if self.unit == UNIT_µm:
            float2str(1/self.unit_conv_fac, self.var_unit_px)
            self.var_unit_µm.set("1")
            self.entry_unit_px.config(state=tk.NORMAL)
            self.entry_unit_µm.config(state=tk.DISABLED)
        else:
            self.var_unit_px.set("1")
            float2str(self.unit_conv_fac, self.var_unit_µm)
            self.entry_unit_px.config(state=tk.DISABLED)
            self.entry_unit_µm.config(state=tk.NORMAL)

        self.update_values()


    def update_values(self):
        """Callback for converting values between px and µm"""
        if self.unit == UNIT_µm:
            float2str(self.offset_x * self.unit_conv_fac, self.var_offset_x)
            float2str(self.width * self.unit_conv_fac, self.var_width)
            float2str(self.pad_x * self.unit_conv_fac, self.var_pad_x)

            float2str(self.offset_y * self.unit_conv_fac, self.var_offset_y)
            float2str(self.height * self.unit_conv_fac, self.var_height)
            float2str(self.pad_y * self.unit_conv_fac, self.var_pad_y)
        else:
            float2str(self.offset_x, self.var_offset_x)
            float2str(self.width, self.var_width)
            float2str(self.pad_x, self.var_pad_x)

            float2str(self.offset_y, self.var_offset_y)
            float2str(self.height, self.var_height)
            float2str(self.pad_y, self.var_pad_y)
        

    def update_unit_conversion(self, evt=None):
        """Callback for updating px/µm convertion factor"""
        if hasattr(evt, "widget") and evt.widget == self.entry_unit_µm:
            new_µm = str2float(self.var_unit_µm, True)
            if new_µm is None:
                float2str(self.unit_conv_fac, self.var_unit_µm)
                flash_red(self.entry_unit_µm)
                return

            self.unit_conv_fac = new_µm
            self.root.focus_set()

        else:
            new_px = str2float(self.var_unit_px, True)
            if new_px is None:
                float2str(1/self.unit_conv_fac, self.var_unit_px)
                flash_red(self.entry_unit_px)
                return

            self.unit_conv_fac = 1 / new_px
            self.root.focus_set()


    def update_roi_type(self, *_):
        """Callback for switching between squared and rectangular ROIs"""
        if self.roi_type == TYPE_SQUARE:
            self.sp_height.config(state=tk.DISABLED)
            self.sp_pad_y.config(state=tk.DISABLED)

            self.height = self.width
            self.pad_y = self.pad_x

            self.var_height.set(self.var_width.get())
            self.var_pad_y.set(self.var_pad_x.get())

        else:
            self.sp_height.config(state=tk.NORMAL)
            self.sp_pad_y.config(state=tk.NORMAL)


    def submit_spinner(self, evt):
        """Callback for pressing enter on spinner"""
        self.spinner_input(evt.widget)


    def spinner_input(self, widget):
        """Callback for processing changes of spinner value"""
        if widget == self.sp_offset_x:
            off_x = str2float(self.var_offset_x, False)
            if off_x is None:
                off_x = self.offset_x
                if self.unit == UNIT_µm:
                    off_x *= self.unit_conv_fac
                float2str(off_x, self.var_offset_x)
                flash_red(self.sp_offset_x)
            else:
                if self.unit == UNIT_µm:
                    self.offset_x = off_x / self.unit_conv_fac
                else:
                    self.offset_x = off_x

        elif widget == self.sp_offset_y:
            off_y = str2float(self.var_offset_y, False)
            if off_y is None:
                off_y = self.offset_y
                if self.unit == UNIT_µm:
                    off_y *= self.unit_conv_fac
                float2str(off_y, self.var_offset_y)
                flash_red(self.sp_offset_y)
            else:
                if self.unit == UNIT_µm:
                    self.offset_y = off_y / self.unit_conv_fac
                else:
                    self.offset_y = off_y

        elif widget == self.sp_width:
            width = str2float(self.var_width, True)
            if width is None:
                width = self.width
                if self.unit == UNIT_µm:
                    self.width *= self.unit_conv_fac
                float2str(width, self.var_width)
                flash_red(self.sp_width)
            else:
                if self.unit == UNIT_µm:
                    self.width = width / self.unit_conv_fac
                else:
                    self.width = width
                if self.var_type_roi.get() == TYPE_SQUARE:
                    self.height = self.width
                    self.var_height.set(self.var_width.get())

        elif widget == self.sp_height:
            height = str2float(self.var_height, True)
            if height is None:
                height = self.height
                if self.unit == UNIT_µm:
                    height *= self.unit_conv_fac
                float2str(height, self.var_height)
                flash_red(self.sp_height)
            else:
                if self.unit == UNIT_µm:
                    self.height = height / self.unit_conv_fac
                else:
                    self.height = height

        elif widget == self.sp_pad_x:
            pad_x = str2float(self.var_pad_x, True)
            if pad_x is None:
                pad_x = self.pad_x
                if self.unit == UNIT_µm:
                    pad_x *= self.unit_conv_fac
                float2str(pad_x, self.var_pad_x)
                flash_red(self.sp_pad_x)
            else:
                if self.unit == UNIT_µm:
                    self.pad_x = pad_x / self.unit_conv_fac
                else:
                    self.pad_x = pad_x
                if self.roi_type == TYPE_SQUARE:
                    self.pad_y = self.pad_x
                    self.var_pad_y.set(self.var_pad_x.get())

        elif widget == self.sp_pad_y:
            pad_y = str2float(self.var_pad_y, True)
            if pad_y is None:
                pad_y = self.pad_y
                if self.unit == UNIT_µm:
                    pad_y *= self.unit_conv_fac
                float2str(pad_y, self.var_pad_y)
                flash_red(self.sp_pad_y)
            else:
                if self.unit == UNIT_µm:
                    self.pad_y = pad_y / self.unit_conv_fac
                else:
                    self.pad_y = pad_y

        elif widget == self.sp_angle:
            angle = str2float(self.var_angle, False)
            if angle is None:
                float2str(self.angle, self.var_angle)
                flash_red(self.sp_angle)
            else:
                # Confine angle to interval [-180°, 180°]
                if angle >= 360:
                    angle -= (angle // 360) * 360
                if angle > 180:
                    angle -= 360
                if angle <= 360:
                    angle += (abs(angle) // 360) * 360
                if angle < -180:
                    angle += 360
                float2str(angle, self.var_angle)
                self.angle = angle

        self.root.focus_set()


    @property
    def unit(self):
        return self.var_unit.get()

    @property
    def roi_type(self):
        return self.var_type_roi.get()
