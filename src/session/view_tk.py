import queue
import tkinter as tk

import matplotlib as mpl
mpl.rcParams['pdf.fonttype'] = 42 # Edit plots with Illustrator
from matplotlib.figure import Figure
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from matplotlib.backend_bases import MouseButton
from matplotlib.ticker import StrMethodFormatter

from . import const
from .events import Event
from .sessionopener_tk import SessionOpener
from ..stackviewer_tk import StackViewer
from .view import SessionView

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
KEYS_CHANNEL = {fmt.format(sym) for fmt in ('{}', 'KP_{}') for sym in range(1, 10)}
KEYS_NEXT_FRAME = {'Right', 'KP_Right'}
KEYS_PREV_FRAME = {'Left', 'KP_Left'}

FRAME_SCROLL_RATE_MAX = 8

QUEUE_POLL_INTERVAL = 10

# tkinter event state constants for key presses
# see: https://web.archive.org/web/20181009085916/http://infohost.nmt.edu/tcc/help/pubs/tkinter/web/event-handlers.html
EVENT_STATE_SHIFT = 1
EVENT_STATE_CTRL = 4

MODE_SELECTION = 'selection'
MODE_HIGHLIGHT = 'highlight'

TYPE_AREA = 'Area'

DESELECTED_DARKEN_FACTOR = .3

MIC_RES = {
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
MIC_RES_UNSPEC = "Unspecified (use [px])"
MIC_RES_CUSTOM = "Custom"
MIC_RES_UNSPEC_IDX = 1
MIC_RES_CUSTOM_IDX = 2

class SessionView_Tk(SessionView):

    def __init__(self, title, control_queue, status):
        self.root = tk.Tk()
        self.root.title(title)
        self.root.geometry('1300x600')
        self.root.grid_rowconfigure(0, weight=1)
        self.root.grid_columnconfigure(0, weight=1)

        # Initialize variables
        self.queue = queue.Queue()
        self.control_queue = control_queue
        self.status = status
        self.var_statusmsg = tk.StringVar(value="Initializing")
        self.session = None
        self._session_opener = None

        self.cmd_map = {
                const.CMD_SET_SESSION: self.set_session,
            }

        
        self.display_stack = None
        self.channel_selection = {}
        self.channel_order = []
        self.frames_per_hour = 6
        self.frame_indicators = []
        self.traces = None
        self.trace_info = None
        self.rois = None
        self.fig = None
        self.fig_widget = None
        self.save_dir = None
        self.last_frame_scroll = Event.now()

        self.var_show_frame_indicator = tk.BooleanVar(value=True)
        self.var_mode = tk.StringVar(value=MODE_HIGHLIGHT)
        self.var_darken_deselected = tk.BooleanVar(value=True)
        self.var_show_roi_contours = tk.BooleanVar(value=True)
        self.var_show_roi_names = tk.BooleanVar(value=True)
        self.var_show_untrackable = tk.BooleanVar(value=False)
        self.var_microscope_res = tk.StringVar(value=MIC_RES_UNSPEC)

        #self._init_trace_info() #TODO

        # Build menu
        menubar = tk.Menu(self.root)
        self.root.config(menu=menubar)

        filemenu = tk.Menu(menubar)
        menubar.add_cascade(label="File", menu=filemenu)
        filemenu.add_command(label="Open stack…", command=self.open_stack)
        filemenu.add_command(label="Open session", command=self.open_session)
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
        for mic_opt in MIC_RES.keys():
            self.micresmenu.add_radiobutton(label=mic_opt, value=mic_opt, variable=self.var_microscope_res)
        MIC_RES[MIC_RES_UNSPEC] = None
        MIC_RES[MIC_RES_CUSTOM] = None
        self.micresmenu.insert(MIC_RES_UNSPEC_IDX,
                          'radiobutton',
                          label=MIC_RES_UNSPEC,
                          value=MIC_RES_UNSPEC,
                          variable=self.var_microscope_res,
                         )
        self.micresmenu.insert(MIC_RES_CUSTOM_IDX,
                          'radiobutton',
                          label=MIC_RES_CUSTOM,
                          value=MIC_RES_CUSTOM,
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
        self.stackviewer = StackViewer(parent=self.stackframe, root=self.root, show_buttons=False)

        ## Figure frame
        self.figframe = tk.Frame(self.paned)
        self.paned.add(self.figframe, sticky='NESW', width=500)
        self.create_figure()

        ## Statusbar
        self.statusbar = tk.Frame(self.root, padx=2, pady=2, bd=1, relief=tk.SUNKEN)
        self.statusbar.grid(row=1, column=0, sticky='NESW')
        tk.Label(self.statusbar, anchor=tk.W, textvariable=self.var_statusmsg).pack(side=tk.LEFT, anchor=tk.W)

        # Callbacks
        #self.var_show_frame_indicator.trace_add('write', self._update_frame_indicator) #TODO
        #self.var_darken_deselected.trace_add('write', lambda *_: self.display_stack._listeners.notify('image')) #TODO
        #self.var_show_roi_contours.trace_add('write', self._update_show_roi_contours) #TODO
        #self.var_show_roi_names.trace_add('write', self._update_show_roi_names) #TODO
        #self.var_show_untrackable.trace_add('write', self._update_show_untrackable) #TODO
        #self.var_microscope_res.trace_add('write', self._change_microscope_resolution) #TODO

        self.stackframe.bind('<Configure>', self._stacksize_changed)
        self.stackviewer.register_roi_click(self._roi_clicked)

        ## Set global key bindings for display and cell selection
        # Some key symbols for the keypad (KP_*) may not be available in all systems.
        bindings = ((KEYS_NEXT_CELL | KEYS_PREV_CELL | KEYS_HIGHLIGHT_CELL, self._key_highlight_cell),
                    (KEYS_SHOW_CONTOURS, lambda _:
                        self.var_show_roi_contours.set(not self.var_show_roi_contours.get())),
                    (KEYS_NEXT_FRAME | KEYS_PREV_FRAME, self._key_scroll_frames),
                    (KEYS_CHANNEL, self._key_change_channel),
                   )
        for keysyms, callback in bindings:
            for keysym in keysyms:
                if len(keysym) > 1:
                    keysym = f"<{keysym}>"
                try:
                    self.root.bind_all(keysym, callback)
                except Exception:
                    print(f"Failed to register keysym '{keysym}'")

    def mainloop(self):
        self.root.after(QUEUE_POLL_INTERVAL, self.poll_event_queue)
        self.root.mainloop()
        self.root.quit()

    def _breakpoint(self):
        """Enter a breakpoint for DEBUGging"""
        breakpoint()

    def update_status(self, msg="", current=None, total=None):
        """Update the status shown in the status bar"""
        if current is None:
            status = msg
        elif total is None:
            status = f"{msg} {current}"
        else:
            status = f"{msg} {current}/{total}"
        self.var_statusmsg.set(msg)
        self.root.update()

    def create_figure(self):
        """Show an empty figure"""
        self.fig = Figure()
        mpl_canvas = FigureCanvasTkAgg(self.fig, master=self.figframe)
        mpl_canvas.draw()
        self.fig_widget = mpl_canvas.get_tk_widget()
        self.fig_widget.pack(fill=tk.BOTH, expand=True)

    def poll_event_queue(self):
        """Poll event queue"""
        while True:
            try:
                evt = self.queue.get_nowait()
            except queue.Empty:
                break
            if evt.fun is not None:
                evt()
                continue
            try:
                cmd = self.cmd_map[evt.cmd]
            except KeyError:
                pass
            else:
                evt(cmd)
                continue
            try:
                cmd = self.session_opener.cmd_map[evt.cmd]
            except (KeyError, AttributeError):
                pass
            else:
                evt(cmd)
                continue
            raise ValueError(f"Unknown command: '{evt.cmd}'")
        self.root.after(QUEUE_POLL_INTERVAL, self.poll_event_queue)

    @property
    def session_opener(self):
        """Return an active SessionOpener_Tk or None"""
        if self._session_opener is not None and not self._session_opener.active:
            self._session_opener = None
        return self._session_opener

    def open_stack(self):
        """Ask user to open new stack"""
        print("SessionView_Tk.open_stack") #DEBUG
        if self.session_opener is None:
            self._session_opener = SessionOpener(self.root, control_queue=self.control_queue, status=self.status)
        else:
            self.session_opener.to_front()

    def set_session(self, session=None):
        """Set a SessionModel instance for display"""
        print("Setting session") #DEBUG

    def open_session(self):
        print("SessionView_Tk.open_session") #DEBUG

    def save(self):
        print("SessionView_Tk.save") #DEBUG

    def _get_savedir(self):
        print("SessionView_Tk._get_savedir") #DEBUG

    def _stacksize_changed(self, *_):
        print("SessionView_Tk._stacksize_changed") #DEBUG

    def _roi_clicked(self, *_):
        print("SessionView_Tk._roi_clicked") #DEBUG

    def _key_highlight_cell(self, *_):
        print("SessionView_Tk._key_highlight_cell") #DEBUG

    def _key_scroll_frames(self, *_):
        print("SessionView_Tk._key_scroll_frames") #DEBUG

    def _key_change_channel(self, *_):
        print("SessionView_Tk._key_change_channel") #DEBUG

#    def _update_frame_indicator(self, *_, t=None, fr=None, draw=True):
#        """Update display of vertical frame indicator in plot"""
#        if self.var_show_frame_indicator.get():
#            if t is None:
#                if fr is None:
#                    fr = self.stackviewer.i_frame
#                t = self.to_hours(fr)
#        else:
#            t = np.NaN
#        for indicator in self.frame_indicators:
#            indicator.set_xdata([t, t])
#        if draw:
#            self.fig.canvas.draw()

