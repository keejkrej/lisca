import matplotlib as mpl
mpl.rcParams['pdf.fonttype'] = 42 # Edit plots with Illustrator
from matplotlib.figure import Figure
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from matplotlib.backend_bases import MouseButton
from matplotlib.ticker import StrMethodFormatter
import numpy as np
import os
import pandas as pd
import time
import tkinter as tk
import tkinter.ttk as ttk
import tkinter.filedialog as tkfd
import tkinter.simpledialog as tksd
from .roi import ContourRoi
from .stackviewer_tk import StackViewer
from .stack import Stack
from .stack import metastack as ms
from .tracking import Tracker

# Display properties
PLOT_COLOR = 'k'
PLOT_COLOR_HIGHLIGHT = '#ff0000'
PLOT_ALPHA = .3
PLOT_ALPHA_HIGHLIGHT = 1
PLOT_WIDTH = 1.5
PLOT_WIDTH_HIGHLIGHT = 2

ROI_COLOR_SELECTED = '#00aa00'
ROI_COLOR_DESELECTED = '#0088ff'
ROI_COLOR_UNTRACKABLE = '#cc00cc'
ROI_COLOR_HIGHLIGHT = '#ff0000'
ROI_WIDTH = 1
ROI_WIDTH_HIGHLIGHT = 3

KEYS_NEXT_CELL = {'Down', 'KP_Down'}
KEYS_PREV_CELL = {'Up', 'KP_Up'}
KEYS_HIGHLIGHT_CELL = {'Return', 'KP_Enter'}
KEYS_SHOW_CONTOURS = {'Insert', 'KP_Insert'}
KEYS_CHANNEL = {f'{prefix}{sym}' for prefix in ('', 'KP_') for sym in range(1, 10)}
KEYS_NEXT_FRAME = {'Right', 'KP_Right'}
KEYS_PREV_FRAME = {'Left', 'KP_Left'}

FRAME_SCROLL_RATE_MAX = 8

# tkinter event state constants for key presses
# see: https://web.archive.org/web/20181009085916/http://infohost.nmt.edu/tcc/help/pubs/tkinter/web/event-handlers.html
EVENT_STATE_SHIFT = 1
EVENT_STATE_CTRL = 4

MODE_SELECTION = 'selection'
MODE_HIGHLIGHT = 'highlight'

TYPE_AREA = 'Area'

DESELECTED_DARKEN_FACTOR = .3

MICROSCOPE_RESOLUTION = {
        # Resolutions are given in µm/px
        # See: https://collab.lmu.de/x/9QGFAw
        "Nikon (4x)":           1.61,
        "Nikon (10x PhC)":       .649,
        "Nikon (20x)":           .327,
        "Nikon TIRF (4x)":      1.621,
        "Nikon TIRF (10x PhC)":  .658,
        "Nikon TIRF (20x)":      .333,
        "Nikon TIRF (60x)":      .108,
        "Zeiss (10x PhC)":       .647,
        "Zeiss (20x)":           .312,
        "Zeiss (40x)":           .207,
        "UNikon (4x)":          1.618,
        "UNikon (10x PhC)":      .655,
        "UNikon (10x)":          .650,
        "UNikon (20x)":          .331,
        "UNikon (40x)":          .163,
        "UNikon (60x)":          .108,
        "UNikon (100x)":         .065,
        "Cell culture (5x)":     .81,
        "Cell culture (10x PhC)":.42,
        "Cell culture (20x)":    .21,
    }
MICROSCOPE_RES_UNSPECIFIED = "Unspecified (use [px])"
MICROSCOPE_RES_CUSTOM = "Custom"
MICROSCOPE_RES_UNSPECIFIED_IDX = 1
MICROSCOPE_RES_CUSTOM_IDX = 2

class Main_Tk:
    """Display the main window

    The following structured fields are present:

    self.channel_selection
        list of dict
        The list items correspond the the channels of
        `self.display_stack` with the same index. The dict
        holds information of the selection widgets:
        'type'      str of the channel type; one of:
                    `ms.TYPE_PHASECONTRAST`, `ms.TYPE_FLUORESCENCE`
                    and `ms.TYPE_SEGMENTATION`
        'val'       boolean; indicates whether this channel is
                    currently displayed (True) or not (False).
        'button'    tk.Button instance for displaying the channel

    self.channel_order
        list of int
        The list values are indices to `self.channel_selection`.
        The order of the values is the order in which to display
        the channel selection buttons.

    self.traces
        dict of dict
        The keys of the outer dict are the trace names (as str),
        each trace corresponding to one tracked cell.
        The inner dict holds information of the trace:
        'roi'       list with frame index as index and corresponding
                    ROI name as value. The ContourRoi instance can
                    be retrieved from `self.rois` using the frame
                    index and the ROI name.
        'select'    boolean; if True, cell trace is read and displayed.
        'highlight' boolean; if True, cell/trace is highlighted in
                    stackviewer and in plot. Only meaningful if
                    the 'select' option is True.
        'val'       dict of values read for the cell. The dict keys are
                    the name of the quantity, the dict values are the
                    corresponding values of the quantity. For most quantities
                    (currently for all), the values are 1-dim numpy arrays
                    with each element being to the value in the
                    corresponding frame. Cell size is automatically present
                    with the key 'Area'. Integrated fluorescence intensities
                    are read for each fluorescence channel.
        'plot'      dict of plot objects (e.g. Line2D instance). The dict keys
                    are the plotted quantities (as in 'val'), the values
                    are the plot objects. Useful for plot manipulations
                    like highlighting traces.

    self.trace_info
        dict of dict
        Holds information about the present data.
        The keys of the outer dict are names of the quantities
        ('Area' predefined), the inner dict contains:
        'label'     (optional) str with additional information
                    about the trace, e.g. 'Fluorescence 1'
        'channel'   int, index of the corresponding channel
                    in `self.stack`. May be None.
        'unit'      str, unit of the quantity. Used for proper
                    axes labels in the plot, in later versions
                    possibly also for unit conversions.
                    Default: 'a.u.'
        'factor'    float, factor to multiply values to yield 'unit'. Default: None
        'type'      str, one of `TYPE_AREA` and `ms.TYPE_FLUORESCENCE`.
                    Indicates the type of quantity of the trace.
        'order'     int, indicates in which order to display the plots.
        'button'    tk.Button, the button instance for contoling 'plot'
        'var'       tk.BooleanVar associated with 'button'
        'plot'      boolean, indicates whether to plot the quantity or not.
        'quantity'  str, name of the value used in plot for y-label
        The outer dict should only be changed using the methods
        `self.add_trace_info` or `self.clear_trace_info`.

    self.rois
        list of dict
        The list indices are the frame indices of the stack,
        the dict keys are the labels (as in the labeled image)
        of the ROIs in the frame (saved as string) and the
        dict values are the corresponding ContourRoi instances.
    """

    def __init__(self, *, name=None, version=None):
        # Initialize Window
        self.root = tk.Tk()

        if name is not None:
            title = name
        else:
            title = "Main Window"
        if version is not None:
            title = " ".join((title, version))
        self.root.title(title)

        self.root.geometry('1300x600')
        self.root.grid_rowconfigure(0, weight=1)
        self.root.grid_columnconfigure(0, weight=1)

        # Initialize variables
        self.var_statusmsg = tk.StringVar(value="Initializing")
        self.stack = None
        self.display_stack = None
        self.channel_selection = {}
        self.channel_order = []
        self.frames_per_hour = 6
        self.frame_indicators = []
        self.track = True
        self.traces = None
        self.trace_info = None
        self.rois = None
        self.fig = None
        self.fig_widget = None
        self.save_dir = None
        self.last_frame_scroll = time.monotonic()

        self.var_show_frame_indicator = tk.BooleanVar(value=True)
        self.var_show_frame_indicator.trace_add('write', self._update_frame_indicator)
        self.var_mode = tk.StringVar(value=MODE_HIGHLIGHT)
        self.var_darken_deselected = tk.BooleanVar(value=True)
        self.var_darken_deselected.trace_add('write', lambda *_: self.display_stack._listeners.notify('image'))
        self.var_show_roi_contours = tk.BooleanVar(value=True)
        self.var_show_roi_contours.trace_add('write', self._update_show_roi_contours)
        self.var_show_roi_names = tk.BooleanVar(value=True)
        self.var_show_roi_names.trace_add('write', self._update_show_roi_names)
        self.var_show_untrackable = tk.BooleanVar(value=False)
        self.var_show_untrackable.trace_add('write', self._update_show_untrackable)
        self.var_microscope_res = tk.StringVar(value=MICROSCOPE_RES_UNSPECIFIED)
        self.var_microscope_res.trace_add('write', self._change_microscope_resolution)

        self._init_trace_info()

        # Build menu
        menubar = tk.Menu(self.root)
        self.root.config(menu=menubar)

        filemenu = tk.Menu(menubar)
        menubar.add_cascade(label="File", menu=filemenu)
        filemenu.add_command(label="Open stack…", command=self.open_stack)
        filemenu.add_command(label="Save", command=self.save)
        filemenu.add_command(label="Set output directory…", command=self._get_savedir)
        filemenu.add_command(label="Quit", command=self.root.quit)

        modemenu = tk.Menu(menubar)
        menubar.add_cascade(label="Mode", menu=modemenu)
        modemenu.add_radiobutton(label="Highlight", value=MODE_HIGHLIGHT, variable=self.var_mode)
        modemenu.add_radiobutton(label="Selection", value=MODE_SELECTION, variable=self.var_mode)

        settmenu = tk.Menu(menubar)
        menubar.add_cascade(label="Settings", menu=settmenu)
        settmenu.add_checkbutton(label="Display frame indicator", variable=self.var_show_frame_indicator)
        settmenu.add_checkbutton(label="Display cell contours", variable=self.var_show_roi_contours)
        settmenu.add_checkbutton(label="Display cell labels", variable=self.var_show_roi_names)
        settmenu.add_checkbutton(label="Display untracked cells", variable=self.var_show_untrackable)
        settmenu.add_checkbutton(label="Darken deselected cells", variable=self.var_darken_deselected)

        self.micresmenu = tk.Menu(settmenu)
        settmenu.add_cascade(label="Microscope resolution", menu=self.micresmenu)
        for mic_opt in MICROSCOPE_RESOLUTION.keys():
            self.micresmenu.add_radiobutton(label=mic_opt, value=mic_opt, variable=self.var_microscope_res)
        MICROSCOPE_RESOLUTION[MICROSCOPE_RES_UNSPECIFIED] = None
        MICROSCOPE_RESOLUTION[MICROSCOPE_RES_CUSTOM] = None
        self.micresmenu.insert(MICROSCOPE_RES_UNSPECIFIED_IDX,
                          'radiobutton',
                          label=MICROSCOPE_RES_UNSPECIFIED,
                          value=MICROSCOPE_RES_UNSPECIFIED,
                          variable=self.var_microscope_res,
                         )
        self.micresmenu.insert(MICROSCOPE_RES_CUSTOM_IDX,
                          'radiobutton',
                          label=MICROSCOPE_RES_CUSTOM,
                          value=MICROSCOPE_RES_CUSTOM,
                          variable=self.var_microscope_res,
                         )

        helpmenu = tk.Menu(menubar)
        menubar.add_cascade(label="Help", menu=helpmenu)
        helpmenu.add_command(label="Breakpoint", command=self._breakpoint)


        # Window structure
        self.paned = tk.PanedWindow(self.root, orient=tk.HORIZONTAL, sashwidth=2, sashrelief=tk.RAISED)
        self.paned.grid(row=0, column=0, sticky='NESW')

        ## Channels frame
        self.chanframe = tk.Frame(self.paned)
        self.paned.add(self.chanframe, sticky='NESW', width=150)
        self.chanframe.grid_columnconfigure(0, weight=1)

        self.open_btn = tk.Button(self.chanframe, text="Open stack...", command=self.open_stack)
        self.open_btn.grid(row=0, column=0, sticky='NEW', padx=10, pady=5)
        self.chansellbl = tk.Label(self.chanframe, text="Display channels", anchor=tk.W, state=tk.DISABLED)
        self.chansellbl.grid(row=1, column=0, sticky='NESW', padx=10, pady=(20, 5))
        self.chanselframe = tk.Frame(self.chanframe)
        self.chanselframe.grid(row=2, column=0, sticky='ESW')
        self.plotsellbl = tk.Label(self.chanframe, text="Plot traces", anchor=tk.W, state=tk.DISABLED)
        self.plotsellbl.grid(row=3, column=0, sticky='ESW', padx=10, pady=(20, 5))
        self.plotselframe = tk.Frame(self.chanframe)
        self.plotselframe.grid(row=4, column=0, sticky='ESW')

        ## Stack frame
        self.stackframe = tk.Frame(self.paned)
        self.paned.add(self.stackframe, sticky='NESW', width=650)
        self.stackframe.bind('<Configure>', self._stacksize_changed)
        self.stackviewer = StackViewer(parent=self.stackframe, root=self.root, show_buttons=False)
        self.stackviewer.register_roi_click(self._roi_clicked)

        ## Figure frame
        self.figframe = tk.Frame(self.paned)
        self.paned.add(self.figframe, sticky='NESW', width=500)
        self.create_figure()

        ## Statusbar
        self.statusbar = tk.Frame(self.root, padx=2, pady=2, bd=1, relief=tk.SUNKEN)
        self.statusbar.grid(row=1, column=0, sticky='NESW')
        tk.Label(self.statusbar, anchor=tk.W, textvariable=self.var_statusmsg).pack(side=tk.LEFT, anchor=tk.W)

        # Set global key bindings for display and cell selection
        # Some key symbols for the keypad (KP_*) may not be available in all systems.
        bindings = ((KEYS_NEXT_CELL | KEYS_PREV_CELL | KEYS_HIGHLIGHT_CELL, self._key_highlight_cell),
                    (KEYS_SHOW_CONTOURS, lambda _:
                        self.var_show_roi_contours.set(not self.var_show_roi_contours.get())),
                    (KEYS_NEXT_FRAME | KEYS_PREV_FRAME, self._key_scroll_frames),
                    (KEYS_CHANNEL, self._key_change_channel),
                   )
        for keysyms, callback in bindings:
            for keysym in keysyms:
                try:
                    self.root.bind_all(f'<{keysym}>', callback)
                except Exception:
                    print(f"Failed to register keysym '<{keysym}>'")

        # Run mainloop
        self.root.mainloop()


    def _breakpoint(self):
        """Enter a breakpoint for DEBUGging"""
        breakpoint()

    def _get_savedir(self):
        """Ask user for output directory"""
        options = {'mustexist': False,
                   'parent': self.root,
                   'title': "Choose output directory",
                  }
        if self.save_dir:
            options['initialdir'] = self.save_dir
        new_savedir = tkfd.askdirectory(**options)
        if new_savedir:
            if not os.path.exists(new_savedir):
                os.makedirs(new_savedir)
            elif not os.path.isdir(new_savedir):
                #TODO: show GUI dialog
                raise NotADirectoryError("Not a directory: '{}'".format(new_savedir))
            self.save_dir = new_savedir
        if not os.path.isdir(self.save_dir):
            raise NotADirectoryError("Not a directory: '{}'".format(self.save_dir))

    def status(self, msg=''):
        self.var_statusmsg.set(msg)
        self.root.update()
    
    def status_progress(msg=None, current=None, total=None):
        if msg is None:
            self.status()
            return
        elif current is None and total is None:
            status = msg
        elif current is None:
            status = f"{msg} {total}"
        elif total is None:
            status = f"{msg} {current}"
        else:
            status = f"{msg} {current}/{total}"
        self.status(status)
            
    def create_figure(self):
        """Show an empty figure"""
        self.fig = Figure()
        mpl_canvas = FigureCanvasTkAgg(self.fig, master=self.figframe)
        mpl_canvas.draw()
        self.fig_widget = mpl_canvas.get_tk_widget()
        self.fig_widget.pack(fill=tk.BOTH, expand=True)

    def _init_trace_info(self):
        self.trace_info = {TYPE_AREA: dict(label=None,
                                           channel=None,
                                           unit="px²",
                                           factor=None,
                                           type=TYPE_AREA,
                                           order=0,
                                           button=None,
                                           var=None,
                                           plot=True,
                                           quantity="Cell area",
                                          )}

    def clear_trace_info(self):
        for k in tuple(self.trace_info.keys()):
            if k != TYPE_AREA:
                del self.trace_info[k]

    def add_trace_info(self, name, label=None, channel=None, unit="a.u.",
            factor=None, type_=None, order=None, plot=False, quantity=None):
        """Add information about a new category of traces"""
        self.trace_info[name] = {'label': label,
                                 'channel': channel,
                                 'unit': unit,
                                 'factor': factor,
                                 'type': type_,
                                 'order': order,
                                 'button': None,
                                 'var': None,
                                 'plot': plot,
                                 'quantity': quantity if quantity is not None else type_,
                                }

    def _prompt_microscope_resolution(self):
        """Ask user for custom micrsocope resolution"""
        initval = {}
        if MICROSCOPE_RESOLUTION[MICROSCOPE_RES_CUSTOM] is not None:
            initval['initialvalue'] = MICROSCOPE_RESOLUTION[MICROSCOPE_RES_CUSTOM]
        res = tksd.askfloat(
                "Microscope resolution",
                "Enter custom microscope resolution [µm/px]:",
                minvalue=0, parent=self.root, **initval)
        MICROSCOPE_RESOLUTION[MICROSCOPE_RES_CUSTOM] = res
        if res is None:
            new_label = MICROSCOPE_RES_CUSTOM
        else:
            new_label = f"{MICROSCOPE_RES_CUSTOM} ({res} µm/px)"
        self.micresmenu.entryconfig(MICROSCOPE_RES_CUSTOM_IDX, label=new_label)

    def _change_microscope_resolution(self, *_):
        """Callback for changing microscope resolution"""
        mic_res = self.var_microscope_res.get()
        if mic_res == MICROSCOPE_RES_CUSTOM:
            self._prompt_microscope_resolution()
        res = MICROSCOPE_RESOLUTION[mic_res]
        if res is not None:
            self.trace_info[TYPE_AREA]['unit'] = "µm²"
            self.trace_info[TYPE_AREA]['factor'] = res**2
        elif mic_res == MICROSCOPE_RES_CUSTOM:
            self.root.after_idle(self.var_microscope_res.set, MICROSCOPE_RES_UNSPECIFIED)
            return
        else:
            self.trace_info[TYPE_AREA]['unit'] = "px²"
            self.trace_info[TYPE_AREA]['factor'] = None
        self.read_traces()
        if self.trace_info[TYPE_AREA]['plot']:
            self.plot_traces()

    def open_stack(self):
        """Ask user to open new stack"""
        self.status("Opening stack")
        StackOpener(self.root, callback=self.open_metastack,
                progress_fcn=self.status_progress)

    def open_metastack(self, data):
        """Create a MetaStack with the channels selected by StackOpener"""
        if not data:
            self.status()
            return

        # Check image sizes
        height_general = None
        width_general = None
        height_seg = None
        width_seg = None
        for d in data:
            if d['type'] == ms.TYPE_SEGMENTATION:
                height_seg = d['stack'].height
                width_seg = d['stack'].width
            else:
                if height_general is None:
                    height_general = d['stack'].height
                elif d['stack'].height != height_general:
                    raise ValueError(f"Stack '{name}' has height {d['stack'].height}, but height {height_general} is required.")
                if width_general is None:
                    width_general = d['stack'].width
                elif d['stack'].width != width_general:
                    raise ValueError(f"Stack '{name}' has width {d['stack'].width}, but width {width_general} is required.")
        if None not in (height_general, height_seg):
            if height_seg > height_general:
                pad_y = height_seg - height_general
            else:
                pad_y = 0
            if width_seg > width_general:
                pad_x = width_seg - width_general
            else:
                pad_x = 0

        meta = ms.MetaStack()
        self.clear_trace_info()
        i_channel = 0
        i_channel_fl = 1
        for d in data:
            if d['type'] == ms.TYPE_SEGMENTATION and self.track:
                if pad_y or pad_x:
                    msg_bak = self.var_statusmsg.get()
                    self.status("Cropping segmented stack")
                    d['stack'].crop(right=pad_x, bottom=pad_y)
                    self.status(msg_bak)
                self.track_stack(d['stack'])
                d['stack'].close()
                meta.add_channel(name='segmented_stack',
                                 label=d['label'],
                                 type_=d['type'],
                                 fun=self.render_segmentation,
                                 scales=False,
                                )
            else:
                stack = d['stack']
                name = d['stack'].path
                meta.add_stack(stack, name=name)
                meta.add_channel(name=name,
                                 channel=d['i_channel'],
                                 label=d['label'],
                                 type_=d['type'],
                                )

            if d['type'] == ms.TYPE_FLUORESCENCE:
                label = f"Fluorescence {i_channel_fl}"
                name = d['label']
                if not name:
                    name = label
                    label = None
                self.add_trace_info(name,
                                    label=label,
                                    channel=i_channel,
                                    type_=d['type'],
                                    order=i_channel_fl,
                                    plot=True,
                                    quantity="Integrated fluorescence",
                                   )
                i_channel_fl += 1

            i_channel += 1

        self.load_metastack(meta)
        self.read_traces()
        self._update_traces_display_buttons()
        self.plot_traces()
        self.status()

    def track_stack(self, s):
        """Perform tracking of a given stack"""
        self.status("Tracking cells")
        tracker = Tracker(segmented_stack=s)
        tracker.progress_fcn = lambda msg, current, total: \
                self.status(f"{msg} (frame {current}/{total})")
        tracker.get_traces()
        self.rois = []
        self.traces = {}
        show_contour = self.var_show_roi_contours.get()
        show_name = self.var_show_roi_names.get()
        show_untrackable = show_contour and self.var_show_untrackable.get()
        for fr, props in tracker.props.items():
            self.rois.append({l: ContourRoi(regionprop=p,
                                            label=l,
                                            color=ROI_COLOR_UNTRACKABLE,
                                            visible=show_untrackable,
                                            name_visible=False,
                                           ) for l, p in props.items()})
        for i, trace in enumerate(tracker.traces):
            name = str(i + 1)
            is_selected = tracker.traces_selection[i]
            self.traces[name] = {'roi': trace,
                                 'select': is_selected,
                                 'highlight': False,
                                 'val': {},
                                 'plot': {},
                                }
            for fr, j in enumerate(trace):
                roi = self.rois[fr][j]
                roi.name = name
                roi.color = ROI_COLOR_SELECTED if is_selected else ROI_COLOR_DESELECTED
                roi.visible = bool(roi.name) and show_contour
                roi.name_visible = show_name

    def deselected_rois(self, frame):
        """Get an iterable of all non-selected ROIs in given frame"""
        return (roi for roi in self.rois[frame].values()
                if roi.color not in (ROI_COLOR_SELECTED, ROI_COLOR_HIGHLIGHT))

    def deselected_coords(self, frame):
        """Get pixel coordinates of all non-selected cells"""
        return np.concatenate(tuple(roi.coords for roi in self.deselected_rois(frame)), axis=0)

    def render_display(self, meta, frame, scale=None):
        """Dynamically create display image.

        This method is to be called by `MetaStack.get_image`.

        Arguments:
            meta -- the calling `MetaStack` instance; ignored
            frame -- the index of the selected frame
            scale -- scaling information; ignored
        """
        #TODO histogram-based contrast adjustment
        # Find channel to display
        channels = []
        for i in sorted(self.channel_selection.keys()):
            if self.channel_selection[i]['val']:
                channels.append(i)
        if not channels:
            channels.append(0)

        # Update frame indicator
        self.root.after_idle(self._update_frame_indicator)

        # Get image scale
        self.root.update_idletasks()
        display_width = self.stackframe.winfo_width()
        if self.display_stack.width != display_width:
            scale = display_width / self.stack.width
        else:
            scale = self.display_stack.width / self.stack.width

        # Convert image to uint8
        imgs = []
        seg_img = None
        for i in channels:
            img = self.stack.get_image(channel=i, frame=frame, scale=scale)
            if self.stack.spec(i).type != ms.TYPE_SEGMENTATION:
                if self.var_darken_deselected.get():
                    # Darken deselected and untracked cells
                    if seg_img is None:
                        seg_img = self.render_segmentation(self.stack, frame,
                                rois=self.deselected_rois(frame), binary=True)
                        seg_img = ms.MetaStack.scale_img(seg_img, scale=scale)
                    bkgd = img[seg_img < .5].mean()
                    img = seg_img * (DESELECTED_DARKEN_FACTOR * img \
                            + (1 - DESELECTED_DARKEN_FACTOR) * bkgd) \
                          + (1 - seg_img) * img
                img_min, img_max = img.min(), img.max()
                img = ((img - img_min) * (255 / (img_max - img_min)))
            imgs.append(img)
        if len(imgs) > 1:
            img = np.mean(imgs, axis=0)
        else:
            img = imgs[0]
        img_min, img_max = img.min(), img.max()
        img = ((img - img_min) * (255 / (img_max - img_min))).astype(np.uint8)

        return img

    def render_segmentation(self, meta, frame, scale=None, rois=None, binary=False):
        """Dynamically draw segmentation image from ROIs

        This method is to be called by `MetaStack.get_image`.

        Arguments:
            meta -- the calling `MetaStack` instance; ignored
            frame -- the index of the selected frame
            scale -- scaling information; ignored
            rois -- iterable of ROIs to show; if None, show all ROIs in frame
            binary -- if True, returned array is boolean, else uint8
        """
        img = np.zeros((meta.height, meta.width), dtype=(np.bool if binary else np.uint8))
        if rois is None:
            rois = self.rois[frame].values()
        for roi in rois:
            img[roi.rows, roi.cols] = 255
        return img

    def _build_chanselbtn_callback(self, i):
        """Build callback for channel selection button.

        `i` is the key of the corresponding item in `self.channel_selection`.

        The returned callback will, by default, select the channel with key `i`
        and deselect all other buttons. However, if the control key is pressed
        simultaneously with the click, the selection of channel `i` is toggled.
        """
        def callback(event):
            nonlocal self, i
            self._change_channel_selection(i, toggle=bool(event.state & EVENT_STATE_CTRL), default=i)
        return callback

    def _change_channel_selection(self, *channels, toggle=False, default=None):
        """Select channels for display.

        `channels` holds the specified channels (indices to `self.channel_selection`).
        If `toggle`, the selections of the channels in `channels` are toggled.
        If not `toggle`, the channels in `channels` are selected and all others are deselected.
        If `default` is defined, it must be an index to `self.channel_selection`.
        The channel corresponding to `default` is selected if no other channel would
        be displayed after executing this function.
        """
        has_selected = False
        if not channels:
            pass
        elif toggle:
            for i in channels:
                ch = self.channel_selection[i]
                ch['val'] ^= True
                has_selected = ch['val']
        else:
            for i, ch in self.channel_selection.items():
                if i in channels:
                    ch['val'] = True
                    has_selected = True
                else:
                    ch['val'] = False
        if not has_selected and \
                not any(ch['val'] for ch in self.channel_selection.values()):
            if default is None:
                default = 0
            ch = self.channel_selection[self.channel_order[default]]
            ch['val'] = True
        self.display_stack._listeners.notify('image')
        self.root.after_idle(self._update_channel_selection_button_states)

    def _update_channel_selection_button_states(self):
        """Helper function

        Called by `_change_channel_selection` after all GUI updates
        are processed. Necessary because otherwise, changes would be
        overwritten by ButtonRelease event.
        """
        for ch in self.channel_selection.values():
            ch['button'].config(relief=(tk.SUNKEN if ch['val'] else tk.RAISED))

    def load_metastack(self, meta):
        """Load and display a given metastack"""
        self.status("Loading stack …")
        self.stack = meta
        self.display_stack = ms.MetaStack()
        self.display_stack.set_properties(n_frames=meta.n_frames,
                                          width=meta.width,
                                          height=meta.height,
                                          mode=8,
                                         )
        if self.rois:
            for fr, rois in enumerate(self.rois):
                self.display_stack.set_rois(list(rois.values()), frame=fr)

        # Create channel display buttons
        self.channel_order.clear()
        for k, x in tuple(self.channel_selection.items()):
            x['button'].destroy()
            del self.channel_selection[k]
        has_display = False
        idx_phasecontrast = None
        idx_fluorescence = []
        idx_segmentation = None
        for i, spec in enumerate(meta.channels):
            if spec.type == ms.TYPE_PHASECONTRAST and not idx_phasecontrast:
                idx_phasecontrast = i
            elif spec.type == ms.TYPE_FLUORESCENCE:
                idx_fluorescence.append(i)
            elif spec.type == ms.TYPE_SEGMENTATION and not idx_segmentation:
                idx_segmentation = i
            else:
                continue
            x = {}
            self.channel_selection[i] = x
            x['type'] = spec.type
            x['val'] = False
            btntxt = []
            if spec.label:
                btntxt.append(spec.label)
            if spec.type == ms.TYPE_FLUORESCENCE:
                btntxt.append("{} {}".format(spec.type, len(idx_fluorescence)))
            else:
                btntxt.append(spec.type)
            btntxt = "\n".join(btntxt)
            x['button'] = tk.Button(self.chanselframe, justify=tk.LEFT, text=btntxt)
            x['button'].bind('<ButtonPress-1><ButtonRelease-1>', self._build_chanselbtn_callback(i))

        # Display channel display buttons
        self.chansellbl.config(state=tk.NORMAL)
        if idx_phasecontrast is not None:
            self.channel_order.append(idx_phasecontrast)
            self.channel_selection[idx_phasecontrast]['button'].pack(anchor=tk.N,
                    expand=True, fill=tk.X, padx=10, pady=5)
        for i in idx_fluorescence:
            self.channel_order.append(i)
            self.channel_selection[i]['button'].pack(anchor=tk.N,
                    expand=True, fill=tk.X, padx=10, pady=5)
        if idx_segmentation is not None:
            self.channel_order.append(idx_segmentation)
            self.channel_selection[idx_segmentation]['button'].pack(anchor=tk.N,
                    expand=True, fill=tk.X, padx=10, pady=5)

        # Initial channel selection and display
        self._change_channel_selection()
        self.display_stack.add_channel(fun=self.render_display, scales=True)
        self.stackviewer.set_stack(self.display_stack, wait=False)

    def _update_traces_display_buttons(self):
        """Redraw buttons for selecting which quantities to plot"""
        self.plotsellbl.config(state=tk.NORMAL)
        for child in self.plotselframe.winfo_children():
            child.pack_forget()
        for name, info in sorted(self.trace_info.items(), key=lambda x: x[1]['order']):
            if info['button'] is None:
                if info['label']:
                    btn_txt = f"{name}\n{info['label']}"
                else:
                    btn_txt = name
                info['button'] = tk.Checkbutton(self.plotselframe, text=btn_txt,
                        justify=tk.LEFT, indicatoron=False,
                        command=lambda btn=name: self._update_traces_display(button=btn))
                info['var'] = tk.BooleanVar(info['button'], value=info['plot'])
                info['button'].config(variable=info['var'])
            info['button'].pack(anchor=tk.S, expand=True, fill=tk.X, padx=10, pady=5)

    def _update_traces_display(self, button=None):
        """Update plot after changing quantities to plot"""
        if button is not None:
            info = self.trace_info[button]
            info['plot'] = info['var'].get()
        else:
            for info in self.trace_info.values():
                info['var'].set(info['plot'])
        if not any(info['plot'] for info in self.trace_info.values()):
            if button is not None:
                info = self.trace_info[button]
                info['plot'] ^= True
                info['var'].set(info['plot'])
            else:
                for info in self.trace_info.values():
                    info['plot'] = True
                    info['var'].get(True)
        self.plot_traces()

    def _stacksize_changed(self, evt):
        """Update stackviewer after stack size change"""
        self.stackviewer._change_stack_position(force=True)

    def read_traces(self):
        """Read out cell traces"""
        if not self.traces:
            return

        self.status("Read traces")
        n_frames = self.stack.n_frames

        # Get fluorescence channels
        fl_chans = []
        for name, info in self.trace_info.items():
            if info['type'] == ms.TYPE_FLUORESCENCE:
                fl_chans.append({'name': name,
                                 'i_channel': info['channel'],
                                 'img': None,
                                })
        fl_chans.sort(key=lambda ch: self.trace_info[ch['name']]['order'])

        # Get microscope resolution (=area conversion factor)
        area_factor = self.trace_info[TYPE_AREA]['factor']

        # Read traces
        for tr in self.traces.values():
            tr['val'].clear()

            # Area
            val_area = np.empty(n_frames, dtype=np.float)
            for fr, i in enumerate(tr['roi']):
                val_area[fr] = self.rois[fr][i].area
            if area_factor is not None:
                val_area *= area_factor
            tr['val'][TYPE_AREA] = val_area

            # Fluorescence
            for ch in fl_chans:
                tr['val'][ch['name']] = np.empty(n_frames, dtype=np.float)

        for fr in range(n_frames):
            images = {}
            for ch in fl_chans:
                ch['img'] = self.stack.get_image(frame=fr, channel=ch['i_channel'])
            for tr in self.traces.values():
                roi = self.rois[fr][tr['roi'][fr]]
                for ch in fl_chans:
                    tr['val'][ch['name']][fr] = np.sum(ch['img'][roi.rows, roi.cols])
        self.status()

    def to_hours(self, x):
        """Convert 0-based frame number to hours"""
        try:
            return x / self.frames_per_hour
        except Exception:
            return np.NaN

    def plot_traces(self, fig=None):
        """Plots the traces.

        If `fig` is None, the traces are plotted to the main window.
        For exporting a plot, specify a `Figure` instance as `fig`.
        """
        if fig is None:
            fig = self.fig
            fig.canvas.mpl_connect('pick_event', self._line_picker)
            is_interactive = True
            self.frame_indicators.clear()
        else:
            is_interactive = False
        fig.clear()
    
        if not self.traces:
            fig.canvas.draw()
            return

        # Find data to be plotted and plotting order
        plot_list = []
        for name, info in self.trace_info.items():
            if info['plot']:
                plot_list.append(name)
        plot_list.sort(key=lambda name: self.trace_info[name]['order'])

        t_vec = self.to_hours(np.array(range(self.stack.n_frames)))
        axes = fig.subplots(len(plot_list), squeeze=False, sharex=True)[:,0]
        for qty, ax in zip(plot_list, axes):
            ax.set_xmargin(.003)
            ax.yaxis.set_major_formatter(StrMethodFormatter('{x:.4g}'))
            for name, tr in self.traces.items():
                if not tr['select']:
                    continue
                if tr['highlight']:
                    lw, alpha, color = PLOT_WIDTH_HIGHLIGHT, PLOT_ALPHA_HIGHLIGHT, PLOT_COLOR_HIGHLIGHT
                else:
                    lw, alpha, color = PLOT_WIDTH, PLOT_ALPHA, PLOT_COLOR
                l = ax.plot(t_vec, tr['val'][qty],
                        color=color, alpha=alpha, lw=lw, label=name,
                        picker=(3 if is_interactive else None))
                if is_interactive:
                    tr['plot'][qty] = l

            xlbl = "Time [h]"
            ax.set_ylabel("{quantity} [{unit}]".format(**self.trace_info[qty]))
            ax.set_title(qty)

            if is_interactive:
                self.frame_indicators.append(ax.axvline(np.NaN, lw=1.5, color='r'))
            else:
                ax.xaxis.set_tick_params(labelbottom=True)
            if ax.is_last_row():
                ax.set_xlabel(xlbl)

        self._update_frame_indicator(draw=False)
        self.fig.tight_layout(pad=.3)
        fig.canvas.draw()

    def _update_frame_indicator(self, *_, t=None, fr=None, draw=True):
        """Update display of vertical frame indicator in plot"""
        if self.var_show_frame_indicator.get():
            if t is None:
                if fr is None:
                    fr = self.stackviewer.i_frame
                t = self.to_hours(fr)
        else:
            t = np.NaN
        for indicator in self.frame_indicators:
            indicator.set_xdata([t, t])
        if draw:
            self.fig.canvas.draw()

    def _line_picker(self, event):
        """Callback for clicking on line in plot"""
        if not event.mouseevent.button == MouseButton.LEFT:
            return
        i = event.artist.get_label()
        self.highlight_trace(i)
        self.update_highlight()

    def _update_show_roi_contours(self, *_):
        """Update stackviewer after toggling ROI contour display"""
        show_contours = self.var_show_roi_contours.get()
        show_untrackable = show_contours and self.var_show_untrackable.get()
        for rois in self.rois:
            for roi in rois.values():
                if roi.name:
                    roi.visible = show_contours
                else:
                    roi.visible = show_untrackable
        self.display_stack._listeners.notify('roi')

    def _update_show_roi_names(self, *_):
        """Update stackviewer after toggling ROI name display"""
        show_names = self.var_show_roi_names.get()
        if show_names:
            show_untrackable = self.var_show_untrackable.get()
        else:
            show_untrackable = False
        for rois in self.rois:
            for roi in rois.values():
                if roi.name:
                    roi.name_visible = show_names
                else:
                    roi.name_visible = show_untrackable
        self.display_stack._listeners.notify('roi')

    def _update_show_untrackable(self, *_):
        """Update stackviewer after toggling display of untrackable cells"""
        show = self.var_show_untrackable.get() and self.var_show_roi_contours.get()
        for rois in self.rois:
            for roi in rois.values():
                if not roi.name:
                    roi.visible = show
        self.display_stack._listeners.notify('roi')

    def update_highlight(self):
        """Redraw relevant display portions after highlight changes.

        Note: All tasks performed by `update_highlight` are also
        included in `update_selection`. Running both methods at
        the same time is not necessary.
        """
        self.fig.canvas.draw()
        self.display_stack._listeners.notify('roi')

    def update_selection(self):
        """Read traces after selection changes and update display"""
        self.read_traces()
        self.plot_traces()
        self.display_stack._listeners.notify('roi')
        if self.var_darken_deselected.get():
            self.display_stack._listeners.notify('image')

    def highlight_trace(self, *trace, val=None, update_select=False):
        """Change highlight state of one or more traces.

        `trace` must be valid keys to `self.traces`.
        `val` specifies whether to highlight (True) the
        traces or not (False) or to toggle (None) highlighting.
        If `update_select` is True, a non-selected cell is
        selected before highlighting it; else, highlighting
        is ignored.

        This method does not update display.
        To update display, call `self.update_highlight`.

        If `update_select` is True, a return value of True
        indicates that a cell selection has changed. In this case,
        the user is responsible to call `self.update_selection`.
        """
        is_selection_updated = False
        if len(trace) > 1:
            for tr in trace:
                ret = self.highlight_trace(tr, val=val, update_select=update_select)
                if update_select and ret:
                    is_selection_updated = True
            return is_selection_updated
        else:
            trace = trace[0]
        tr = self.traces[trace]
        if val is None:
            val = not tr['highlight']
        elif val == tr['highlight']:
            return
        if not tr['select'] and val and update_select:
            self.select_trace(trace, val=True)
            is_selection_updated = True
        tr['highlight'] = val
        if val:
            if tr['select']:
                for plots in tr['plot'].values():
                    for plot in plots:
                        plot.set_color(PLOT_COLOR_HIGHLIGHT)
                        plot.set_lw(PLOT_WIDTH_HIGHLIGHT)
                        plot.set_alpha(PLOT_ALPHA_HIGHLIGHT)
                for fr, roi in enumerate(tr['roi']):
                    self.rois[fr][roi].stroke_width = ROI_WIDTH_HIGHLIGHT
                    self.rois[fr][roi].color = ROI_COLOR_HIGHLIGHT
            else:
                for fr, roi in enumerate(tr['roi']):
                    self.rois[fr][roi].stroke_width = ROI_WIDTH_HIGHLIGHT
                    self.rois[fr][roi].color = ROI_COLOR_DESELECTED
        else:
            if tr['select']:
                for plots in tr['plot'].values():
                    for plot in plots:
                        plot.set_color(PLOT_COLOR)
                        plot.set_lw(PLOT_WIDTH)
                        plot.set_alpha(PLOT_ALPHA)
            for fr, roi in enumerate(tr['roi']):
                self.rois[fr][roi].stroke_width = ROI_WIDTH
                if tr['select']:
                    self.rois[fr][roi].color = ROI_COLOR_SELECTED
                else:
                    self.rois[fr][roi].color = ROI_COLOR_DESELECTED
        return is_selection_updated

    def select_trace(self, *trace, val=None, update_highlight=False):
        """Change selection state of one or more traces.

        `trace` must be valid keys to `self.traces`.
        `val` specifies whether to select (True),
        deselect (False) or toggle (None) the selection.
        `update_highlight` specifies whether to remove
        highlighting (True) when a cell is deselected.

        This method does not update display.
        To update display, call `self.update_selection`.
        """
        if len(trace) > 1:
            for tr in trace:
                self.select_trace(tr, val=val)
            return
        else:
            trace = trace[0]
        tr = self.traces[trace]
        if val is None:
            val = not tr['select']
        elif val == tr['select']:
            return
        tr['select'] = val
        if val:
            roi_color = ROI_COLOR_HIGHLIGHT if tr['highlight'] else ROI_COLOR_SELECTED
            for fr, roi in enumerate(tr['roi']):
                self.rois[fr][roi].color = roi_color
        else:
            if update_highlight:
                self.highlight_trace(trace, val=False)
            for fr, roi in enumerate(tr['roi']):
                self.rois[fr][roi].color = ROI_COLOR_DESELECTED
                    

    def _roi_clicked(self, event, names):
        """Callback for click on ROI"""
        if not names:
            return
        is_selection_updated = False
        mode = self.var_mode.get()
        if event.state & EVENT_STATE_SHIFT:
            if mode == MODE_HIGHLIGHT:
                mode = MODE_SELECTION
            elif mode == MODE_SELECTION:
                mode = MODE_HIGHLIGHT
        if mode == MODE_HIGHLIGHT:
            for name in names:
                try:
                    is_selection_updated |= self.highlight_trace(name, update_select=True)
                except KeyError:
                    continue
            self.update_highlight()
        elif mode == MODE_SELECTION:
            for name in names:
                try:
                    self.select_trace(name, update_highlight=True)
                except KeyError:
                    continue
            is_selection_updated = True
        if is_selection_updated:
            self.update_selection()

    def _key_scroll_frames(self, evt):
        """Callback for scrolling through channels"""
        if evt.keysym in KEYS_NEXT_FRAME:
            cmd = 'up'
        elif evt.keysym in KEYS_PREV_FRAME:
            cmd = 'down'
        else:
            return
        clock = time.monotonic()
        if clock - self.last_frame_scroll < 1 / FRAME_SCROLL_RATE_MAX:
            return
        else:
            self.last_frame_scroll = clock
        self.stackviewer._i_frame_step(cmd)

    def _key_change_channel(self, evt):
        """Callback for displaying channels"""
        if not self.channel_order:
            return
        try:
            new_chan = int(evt.keysym[-1]) - 1
        except Exception:
            return
        if new_chan >= 0 and new_chan < len(self.channel_order):
            self._change_channel_selection(new_chan)

    def _key_highlight_cell(self, evt):
        """Callback for highlighting cells by arrow keys

        Up/down arrows highlight cells,
        Enter toggles cell selection.
        """
        if not self.traces:
            return
        cells_sorted = self.traces_sorted()
        cells_highlight = list(cells_sorted.index(name) for name, tr in self.traces.items() if tr['highlight'])
        is_selection_updated = False

        if evt.keysym in ('Up', 'KP_Up'):
            # Highlight previous cell
            for i in cells_highlight:
                self.highlight_trace(cells_sorted[i], val=False)
            if cells_highlight:
                new_highlight = cells_highlight[0] - 1
                if new_highlight < 0:
                    new_highlight = cells_sorted[-1]
                else:
                    new_highlight = cells_sorted[new_highlight]
            else:
                new_highlight = cells_sorted[-1]
            self.highlight_trace(new_highlight, val=True)
            self.update_highlight()

        elif evt.keysym in ('Down', 'KP_Down'):
            # Highlight next cell
            for i in cells_highlight:
                self.highlight_trace(cells_sorted[i], val=False)
            if cells_highlight:
                new_highlight = cells_highlight[-1] + 1
                if new_highlight >= len(cells_sorted):
                    new_highlight = cells_sorted[0]
                else:
                    new_highlight = cells_sorted[new_highlight]
            else:
                new_highlight = cells_sorted[0]
            self.highlight_trace(new_highlight, val=True)
            self.update_highlight()

        elif evt.keysym in ('Return', 'KP_Enter'):
            # Toggle cell selection
            for i in cells_highlight:
                self.select_trace(cells_sorted[i])
            self.update_selection()

    def traces_sorted(self):
        """Return a list of traces sorted by position"""
        fr = self.stackviewer.i_frame
        rois = self.rois[fr]
        traces_pos = {}
        for name, tr in self.traces.items():
            roi = rois[tr['roi'][fr]]
            traces_pos[name] = (roi.y_min, roi.x_min)
        return sorted(traces_pos.keys(), key=lambda name: traces_pos[name])

    def traces_as_dataframes(self):
        """Return a dict of DataFrames of the traces"""
        t = self.to_hours(np.array(range(self.stack.n_frames)))
        time_vec = pd.DataFrame(t, columns=("Time [h]",))
        df_dict = {}
        for name, tr in self.traces.items():
            if not tr['select']:
                continue
            for qty, data in tr['val'].items():
                try:
                    df_dict[qty][name] = data
                except KeyError:
                    df_dict[qty] = time_vec.copy()
                    df_dict[qty][name] = data
        return df_dict

    def save(self):
        """Save data to files"""
        if not self.save_dir:
            self._get_savedir()
        
        # Plot the data
        fig = Figure(figsize=(9,7))
        self.plot_traces(fig)
        fig.savefig(os.path.join(self.save_dir, "Figure.pdf"))

        # Save data to Excel file
        df_dict = self.traces_as_dataframes()
        with pd.ExcelWriter(os.path.join(self.save_dir, "Data.xlsx"), engine='xlsxwriter') as writer:
            for name, df in df_dict.items():
                df.to_excel(writer, sheet_name=name, index=False)
            writer.save()

        # Save data to CSV file
        for name, df in df_dict.items():
            df.to_csv(os.path.join(self.save_dir, f"{name}.csv"), header=False, index=False)

        print(f"Data have been written to '{self.save_dir}'") #DEBUG


class StackOpener:
    """Ask the user for stacks.

    Arguments:
        root - the parent tkinter.Tk object
        callback - call this function after finishing
    """
    # To test this class, run e.g.:
    # $ cd pyama
    # $ ipython
    # In [1]: %load_ext autoreload
    # In [2]: %autoreload 2
    # In [3]: from src.main_window import StackOpener
    # In [4]: import tkinter as tk
    # In [5]: root = tk.Tk(); StackOpener(root); root.mainloop()
    # Repeat In [5] for each test run

    def __init__(self, root, callback=None, progress_fcn=None):
        self.root = root
        self.frame = tk.Toplevel(self.root)
        self.frame.title("Select stacks and channels")
        self.frame.geometry('600x300')
        self.frame.protocol('WM_DELETE_WINDOW', self.cancel)
        self.stacks = []
        self.channels = []
        self.callback = callback
        self.progress_fcn = progress_fcn

        # PanedWindow
        paned = tk.PanedWindow(self.frame)
        paned = tk.PanedWindow(self.frame, orient=tk.HORIZONTAL, sashwidth=2, sashrelief=tk.RAISED)
        paned.pack(expand=True, fill=tk.BOTH)

        # Stack selection
        stack_frame = tk.Frame(paned)
        paned.add(stack_frame, sticky='NESW', width=200)
        stack_frame.grid_columnconfigure(1, weight=1)
        stack_frame.grid_rowconfigure(0, weight=1)

        ## Listbox
        list_frame = tk.Frame(stack_frame)
        list_frame.grid(row=0, column=0, columnspan=2, sticky='NESW')
        list_frame.grid_rowconfigure(0, weight=1)
        list_frame.grid_columnconfigure(0, weight=1)

        self.var_stack_list = tk.StringVar()
        self.stack_list = tk.Listbox(list_frame, selectmode=tk.SINGLE,
                listvariable=self.var_stack_list, highlightthickness=0, exportselection=False)
        self.stack_list.grid(row=0, column=0, sticky='NESW')
        self.stack_list.bind("<<ListboxSelect>>", self.stacklist_selection)
        list_y_scroll = tk.Scrollbar(list_frame, orient=tk.VERTICAL, command=self.stack_list.yview)
        list_x_scroll = tk.Scrollbar(list_frame, orient=tk.HORIZONTAL, command=self.stack_list.xview)
        self.stack_list.config(yscrollcommand=list_y_scroll.set)
        self.stack_list.config(xscrollcommand=list_x_scroll.set)
        list_y_scroll.grid(row=0, column=1, sticky='NESW')
        list_x_scroll.grid(row=1, column=0, sticky='NESW')

        ## Buttons
        btn_frame = tk.Frame(stack_frame)
        btn_frame.grid(row=1, column=0, columnspan=2, sticky='NESW')
        btn_frame.grid_columnconfigure(0, weight=1)
        btn_frame.grid_columnconfigure(1, weight=1)

        btn_open = tk.Button(btn_frame, text="Open...", command=self.open_stack)
        btn_open.grid(row=0, column=0, sticky='WE', padx=5)
        btn_remove = tk.Button(btn_frame, text="Remove", command=self.remove_stack)
        btn_remove.grid(row=0, column=1, sticky='WE', padx=5)

        ## Display
        self.var_stack = tk.StringVar(self.frame)
        self.var_n_chan = tk.StringVar(self.frame)
        tk.Label(stack_frame, text="Stack:", anchor=tk.W).grid(row=2, column=0, sticky='NESW', padx=5)
        tk.Label(stack_frame, text="Channels:", anchor=tk.W).grid(row=3, column=0, sticky='NESW', padx=5)
        tk.Label(stack_frame, textvariable=self.var_stack, anchor=tk.W).grid(row=2, column=1, sticky='NESW')
        tk.Label(stack_frame, textvariable=self.var_n_chan, anchor=tk.W).grid(row=3, column=1, sticky='NESW')

        # Channel selection
        chan_frame = tk.Frame(paned)
        paned.add(chan_frame, sticky='NESW', width=400)
        chan_frame.grid_rowconfigure(0, weight=1)
        chan_frame.grid_columnconfigure(0, weight=1)

        ## Channel display
        self.chan_disp_frame = tk.Frame(chan_frame)
        self.chan_disp_frame.grid(row=0, column=0, sticky='NESW')
        self.chan_disp_frame.grid_columnconfigure(1, weight=1, pad=5, minsize=30)
        self.chan_disp_frame.grid_columnconfigure(2, weight=0, pad=5)
        self.chan_disp_frame.grid_columnconfigure(3, weight=1, pad=5)

        tk.Label(self.chan_disp_frame, text="Channel", anchor=tk.W).grid(row=0, column=0, sticky='W')
        tk.Label(self.chan_disp_frame, text="Label", anchor=tk.W).grid(row=0, column=1, sticky='W')
        tk.Label(self.chan_disp_frame, text="Type", anchor=tk.W).grid(row=0, column=2, sticky='W')
        tk.Label(self.chan_disp_frame, text="Stack [Channel]", anchor=tk.W).grid(row=0, column=3, sticky='W')

        ## Separator
        ttk.Separator(chan_frame, orient=tk.HORIZONTAL).grid(row=1, column=0, sticky='ESW')

        ## Channel configuration
        chan_add_frame = tk.Frame(chan_frame)
        chan_add_frame.grid(row=2, column=0, sticky='ESW')
        chan_add_frame.grid_columnconfigure(0, weight=1, pad=5)
        chan_add_frame.grid_columnconfigure(1, weight=1, pad=5)
        chan_add_frame.grid_columnconfigure(2, weight=1, pad=5)

        tk.Label(chan_add_frame, text="Add new channel", anchor=tk.W).grid(row=0, column=0, columnspan=4, sticky='EW')
        tk.Label(chan_add_frame, text="Channel", anchor=tk.W).grid(row=1, column=0, sticky='EW')
        tk.Label(chan_add_frame, text="Type", anchor=tk.W).grid(row=1, column=1, sticky='EW')
        tk.Label(chan_add_frame, text="Label", anchor=tk.W).grid(row=1, column=2, sticky='EW')

        self.var_chan = tk.IntVar(self.frame)
        self.var_label = tk.StringVar(self.frame)
        self.var_type = tk.StringVar(self.frame)

        self.chan_opt = tk.OptionMenu(chan_add_frame, self.var_chan, 0)
        self.chan_opt.grid(row=2, column=0, sticky='NESW')
        self.type_opt = tk.OptionMenu(chan_add_frame, self.var_type,
            ms.TYPE_PHASECONTRAST, ms.TYPE_FLUORESCENCE, ms.TYPE_SEGMENTATION)
        self.type_opt.grid(row=2, column=1, sticky='NESW')
        self.label_entry = tk.Entry(chan_add_frame, textvariable=self.var_label)
        self.label_entry.grid(row=2, column=2, sticky='NESW')
        self.add_chan_btn = tk.Button(chan_add_frame, text="Add", command=self.add_chan)
        self.add_chan_btn.grid(row=2, column=3, sticky='EW')
        self.disable_channel_selection()

        # OK and Cancel buttons
        btn_frame = tk.Frame(self.frame)
        btn_frame.pack(expand=True, fill=tk.X)
        btn_frame.grid_columnconfigure(0, weight=1, pad=20)
        btn_frame.grid_columnconfigure(1, weight=1, pad=20)
        tk.Button(btn_frame, text="Cancel", width=10, command=self.cancel).grid(row=0, column=0)
        tk.Button(btn_frame, text="OK", width=10, command=self.finish).grid(row=0, column=1)


    def open_stack(self):
        """Open a new stack"""
        fn = tkfd.askopenfilename(title="Open stack", parent=self.root, initialdir='res', filetypes=(("TIFF", '*.tif *.tiff'), ("Numpy", '*.npy *.npz'), ("All files", '*')))
        if not fn:
            return
        stack = Stack(fn, progress_fcn=self.progress_fcn)
        stack_dir, stack_name = os.path.split(fn)
        n_channels = stack.n_channels
        self.stacks.append({'name': stack_name,
                            'dir': stack_dir,
                            'stack': stack,
                            'n_channels': n_channels,
                           })
        self.refresh_stacklist(select=tk.END)

    def remove_stack(self):
        """Remove a stack from the list"""
        sel = self.stack_list.curselection()
        if not sel:
            return
        try:
            sel = int(sel[-1])
        except Exception:
            return
        self.del_chan(sel)
        stack = self.stacks.pop(sel)
        stack['stack'].close()
        self.refresh_stacklist()

    def refresh_stacklist(self, select=None):
        """Refresh ListBox with loaded stacks.

        If `select` is a valid index, this item is selected.
        """
        self.var_stack_list.set(["{name} ({dir})".format(**s) for s in self.stacks])
        self.stack_list.selection_clear(0, tk.END)
        if select is not None:
            self.stack_list.selection_set(select)
        self.stacklist_selection()

    def stacklist_selection(self, event=None):
        sel = self.stack_list.curselection()
        try:
            sel = int(sel[-1])
            stack = self.stacks[sel]
            stack_name = stack['name']
            stack_n_chan = stack['n_channels']
            self.activate_channel_selection(stack)
        except Exception:
            sel = None
            stack_name = ""
            stack_n_chan = ""
            self.disable_channel_selection()
        self.var_stack.set(stack_name)
        self.var_n_chan.set(stack_n_chan)

    def activate_channel_selection(self, stack):
        self.chan_opt.config(state=tk.NORMAL)
        self.label_entry.config(state=tk.NORMAL)
        self.type_opt.config(state=tk.NORMAL)
        self.add_chan_btn.config(state=tk.NORMAL)

        self.chan_opt['menu'].delete(0, tk.END)
        for i in range(stack['n_channels']):
            self.chan_opt['menu'].add_command(label=i, command=tk._setit(self.var_chan, i))
        self.var_chan.set(0)
        self.var_label.set('')
        self.var_type.set(ms.TYPE_PHASECONTRAST)

    def disable_channel_selection(self):
        self.var_chan.set(())
        self.var_label.set('')
        self.var_type.set("None")
        self.chan_opt.config(state=tk.DISABLED)
        self.label_entry.config(state=tk.DISABLED)
        self.type_opt.config(state=tk.DISABLED)
        self.add_chan_btn.config(state=tk.DISABLED)

    def add_chan(self):
        try:
            i_stack = int(self.stack_list.curselection()[-1])
        except Exception:
            print("StackOpener.add_chan: cannot add channel")
            return
        self.channels.append({'stack': self.stacks[i_stack],
                              'i_channel': self.var_chan.get(),
                              'label': self.var_label.get(),
                              'type': self.var_type.get(),
                             })
        self.refresh_channels()
        
    def del_chan(self, i):
        """Remove a channel from the selection"""
        stack = self.stacks[i]
        for ch in self.channels:
            if ch['stack'] is stack:
                ch['stack'] = None
        self.refresh_channels()

    def refresh_channels(self):
        """Redraw the channel selection"""
        i = 0
        idx_del = []
        for j, ch in enumerate(self.channels):
            # Remove widgets of channels marked for deletion
            if ch['stack'] is None:
                if 'widgets' in ch:
                    for w in ch['widgets'].values():
                        w.destroy()
                idx_del.append(j)
                continue

            # Check if channel is new
            wdg = None
            if 'widgets' not in ch:
                wdg = {}
                wdg['idx'] = tk.Label(self.chan_disp_frame, text=i,
                        anchor=tk.E, relief=tk.SUNKEN, bd=1)
                wdg['label'] = tk.Label(self.chan_disp_frame, text=ch['label'],
                        anchor=tk.W, relief=tk.SUNKEN, bd=1)
                wdg['type'] = tk.Label(self.chan_disp_frame, text=ch['type'],
                        anchor=tk.W, relief=tk.SUNKEN, bd=1)
                wdg['stack'] = tk.Label(self.chan_disp_frame,
                        text="{} [{}]".format(ch['stack']['name'], ch['i_channel']),
                        anchor=tk.W, relief=tk.SUNKEN, bd=1)
                wdg['button'] = tk.Button(self.chan_disp_frame, text="X")
                wdg['button'].config(command=lambda b=wdg['button']: self.del_chan(b.grid_info()['row']-1))
                ch['widgets'] = wdg

            # Check if previous widget has been deleted
            elif i != j:
                wdg = ch['widgets']
                wdg['idx'].grid_forget()
                wdg['label'].grid_forget()
                wdg['type'].grid_forget()
                wdg['stack'].grid_forget()
                wdg['button'].grid_forget()

            # Redraw widgets if necessary
            i += 1
            if wdg is not None:
                wdg['idx'].grid(row=i, column=0, sticky='NESW')
                wdg['label'].grid(row=i, column=1, sticky='NESW')
                wdg['type'].grid(row=i, column=2, sticky='NESW')
                wdg['stack'].grid(row=i, column=3, sticky='NESW')
                wdg['button'].grid(row=i, column=4, sticky='NESW')

        # Delete channels marked for deletion
        for i in sorted(idx_del, reverse=True):
            self.channels.pop(i)

    def cancel(self):
        """Close the window and call callback with `None`"""
        self.frame.destroy()
        for stack in self.stacks:
            try:
                stack['stack'].close()
            except Exception:
                print("StackOpener.cancel: Error while closing stack") #DEBUG
                pass
        if self.callback is not None:
            self.callback(None)

    def finish(self):
        """Close the window and call callback with channels"""
        ret = []
        self.frame.destroy()
        used_stacks = set()
        for ch in self.channels:
            x = {}
            x['stack'] = ch['stack']['stack']
            x['name'] = ch['stack']['name']
            x['dir'] = ch['stack']['dir']
            x['i_channel'] = ch['i_channel']
            x['label'] = ch['label']
            x['type'] = ch['type']
            ret.append(x)
            used_stacks.add(id(x['stack']))
        for stack in self.stacks:
            s = stack['stack']
            if id(s) not in used_stacks:
                try:
                    s.close()
                except Exception:
                    print("StackOpener.finish: Error while closing stack") #DEBUG
                    pass
        if self.callback is not None:
            self.callback(ret)


if __name__ == '__main__':
    Main_Tk(name="PyAMA", version="alpha")
