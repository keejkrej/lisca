import os
import threading

from . import const
from .events import Event
from .status import DummyStatus

from ..roi import ContourRoi
from ..stack import Stack
from ..stack import metastack as ms
from ..stack import types as ty
from ..tracking import Tracker

class SessionModel:
    """Session info container.

    The following structured fields are present:

    self.channel_selection
        list of dict
        The list items correspond to the channels of
        `self.display_stack` with the same index. The dict
        holds information of the selection widgets:
        'type'      str of the channel type; one of:
                    `ty.TYPE_PHASECONTRAST`, `ty.TYPE_FLUORESCENCE`
                    and `ty.TYPE_SEGMENTATION`
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
        'type'      str, one of `TYPE_AREA` and `ty.TYPE_FLUORESCENCE`.
                    Indicates the type of quantity of the trace.
        'order'     int, indicates in which order to display the plots.
        'button'    tk.Button, the button instance for controlling 'plot'
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
    def __init__(self):
        self.lock = threading.RLock()
        self.channel_selection = []
        self.channel_order = []
        self.traces = {}
        self.trace_info = {}
        self.rois = []

        self.init_trace_info() # TODO: abstract this away

        self.display_stack = None
        self.stacks = {}
        self.stack = None

        self.show_contour = True
        self.show_untrackable = False
        self.show_name = True


    def init_trace_info(self):
        self.trace_info = {const.TYPE_AREA: dict(label=None,
                                           channel=None,
                                           unit="px²",
                                           factor=None,
                                           type=const.TYPE_AREA,
                                           order=0,
                                           button=None,
                                           var=None,
                                           plot=True,
                                           quantity="Cell area",
                                          )}

    def clear_trace_info(self):
        for k in tuple(self.trace_info.keys()):
            if k != const.TYPE_AREA:
                del self.trace_info[k]

    def open_stack(self, fn, status=None):
        stack_props = {}
        if fn.endswith('h5'):
            stack_props['channels'] = 0
        print("SessionModel.open_stack: TODO: show dynamic status message") #DEBUG
        stack_id = Event.now()
        stack = Stack(fn, progress_fcn=None, **stack_props)
        stack_dir, stack_name = os.path.split(fn)
        n_channels = stack.n_channels
        with self.lock:
            self.stacks[stack_id] = {'id': stack_id,
                                     'name': stack_name,
                                     'dir': stack_dir,
                                     'stack': stack,
                                     'n_channels': n_channels,
                                     }

    def close_stacks(self, *stack_ids, keep_open=()):
        """Close all stacks held only by this SessionModel"""
        if not stack_ids:
            stack_ids = self.stacks.keys()
        for sid in stack_ids:
            try:
                stack = self.stacks[sid]
            except KeyError:
                continue
            if sid not in keep_open:
                stack['stack'].close()
            del self.stacks[sid]

    @property
    def stack_ids(self):
        return set(self.stacks.keys())

    def get_stack_info(self, stack_id=None):
        """Get a stack info dict

        If 'stack_id' is None, return the whole 'stacks' dictionary.
        Else, return the stack info dict for the given stack ID.
        Returns None for non-existent stack ID.

        This method is thread-safe. The returned object must not be altered.
        """
        with self.lock:
            if stack_id is None:
                return self.stacks
            try:
                return self.stacks[stack_id]
            except KeyError:
                return None

    def get_stack(self, stack_id=None):
        """Get a stack

        If 'stack_id' is None, return the whole stack dictionary.
        Else, return the stack info for the given stack ID.
        Returns None for non-existent stack ID.

        This method is thread-safe. The returned object must not be altered.
        """
        with self.lock:
            if stack_id is None:
                return None
            try:
                return self.get_stack_info(stack_id)['stack']
            except KeyError:
                return None

    def config(self, chan_info, status=None, do_track=True):
        """Configure the session for display.

        'chan_info' is a list holding dictionaries with these fields, defining the channels to be displayed:
            stack_id -- stack ID, key of `SessionModel.stacks` #DEBUG: Attention, changed behaviour
            name -- str, name of the stack
            dir -- str, directory where the stack file is saved
            i_channel -- int, index of stack to be used
            label -- str, optional user-defined description
            type -- str, stack type (phasecontrast, fluorescence, binary)
        'status' is a Status instance for updating the status display.
        'do_track' is a flag whether to perform tracking or not.

        Returns True in case of success, else False
        """
        print("SessionModel.config") #DEBUG
        # This function corresponds to MainWindow_TK.open_metastack.
        # The argument 'data' is renamed into 'chan_info'
        # (and has slightly different syntax, see docstring)
        if not chan_info:
            return False
        if status is None:
            status = DummyStatus()

        with self.lock, status.set("Preparing new session"):
            # Check image sizes
            stack_ids_used = set() #TODO: close stacks that are not used
            height_general = None
            width_general = None
            n_frames_general = None
            height_seg = None
            width_seg = None
            n_frames_seg = None
            for ci in chan_info:
                stack = self.get_stack(ci['stack_id'])
                if stack is None:
                    pass
                elif ci['type'] == ty.TYPE_SEGMENTATION:
                    height_seg = stack.height
                    width_seg = stack.width
                    n_frames_seg = stack.n_frames
                else:
                    if height_general is None:
                        height_general = stack.height
                    elif stack.height != height_general:
                        raise ValueError(f"Stack '{name}' has height {stack.height}, but height {height_general} is required.")
                    if width_general is None:
                        width_general = stack.width
                    elif stack.width != width_general:
                        raise ValueError(f"Stack '{name}' has width {stack.width}, but width {width_general} is required.")

                    if n_frames_general is None:
                        n_frames_general = stack.n_frames
                    elif stack.n_frames != n_frames_general:
                        raise ValueError(f"Stack '{name}' has {stack.n_frames} frames, but {n_frames_general} frames are required.")

            pad_y = 0
            pad_x = 0
            if None not in (height_general, height_seg):
                if height_seg > height_general:
                    pad_y = height_seg - height_general
                if width_seg > width_general:
                    pad_x = width_seg - width_general

            meta = ms.MetaStack()
            self.clear_trace_info()
            i_channel = 0
            i_channel_fl = 1
            close_stacks = set()
            retain_stacks = set()
            for ci in chan_info:
                stack = self.get_stack(ci['stack_id'])
                if ci['type'] == ty.TYPE_SEGMENTATION:
                    if do_track and stack is not None:
                        if pad_y or pad_x:
                            with status.set("Cropping segmented stack"):
                                stack.crop(right=pad_x, bottom=pad_y)
                        self.track_stack(stack, channel=ci['i_channel'])
                        close_stacks.add(stack)
                    meta.add_channel(name='segmented_stack',
                                     label=ci['label'],
                                     type_=ci['type'],
                                     fun=self.render_segmentation,
                                     scales=False,
                                    )
                else:
                    name = stack.path
                    meta.add_stack(stack, name=name)
                    meta.add_channel(name=name,
                                     channel=ci['i_channel'],
                                     label=ci['label'],
                                     type_=ci['type'],
                                    )
                    retain_stacks.add(stack)

                if ci['type'] == ty.TYPE_FLUORESCENCE:
                    label = f"Fluorescence {i_channel_fl}"
                    name = ci['label']
                    if not name:
                        name = label
                        label = None
                    self.add_trace_info(name,
                                        label=label,
                                        channel=i_channel,
                                        type_=ci['type'],
                                        order=i_channel_fl,
                                        plot=True,
                                        quantity="Integrated fluorescence",
                                       )
                    i_channel_fl += 1
                i_channel += 1
            
            # Close stacks that only contain segmentation
            close_stacks -= retain_stacks
            for stack in close_stacks:
                stack.close()

            if not meta.check_properties():
                meta.set_properties(n_frames=n_frames_seg, width=width_seg, height=height_seg)
            #self.load_metastack(meta) #TODO: task of SessionViewer_Tk
            self.read_traces()
            self._update_traces_display_buttons()
            self.plot_traces()

    def track_stack(self, s, channel=0, status=None):
        """Perform tracking of a given stack"""
        if status is None:
            status = DummyStatus()
        with self.lock, status.set("Tracking cells"):
            tracker = Tracker(segmented_stack=s, segmented_chan=channel)
            #TODO: set tracker status function
            #tracker.progress_fcn = lambda msg, current, total: \
            #        self.status(f"{msg} (frame {current}/{total})")
            if s.stacktype == 'hdf5':
                tracker.preprocessing = self.segmentation_preprocessing
            tracker.get_traces()
            self.rois = []
            self.traces = {}
            for fr, props in tracker.props.items():
                self.rois.append({l: ContourRoi(regionprop=p,
                                                label=l,
                                                color=ROI_COLOR_UNTRACKABLE,
                                                visible=self.show_untrackable,
                                                name_visible=False,
                                                frame=fr,
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
                    roi.visible = bool(roi.name) and self.show_contour
                    roi.name_visible = self.show_name

    def read_traces(self, status=None):
        """Read out cell traces"""
        if not self.traces:
            return

        with self.lock, status.set("Reading traces"):
            n_frames = self.stack.n_frames

            # Get fluorescence channels
            fl_chans = []
            for name, info in self.trace_info.items():
                if info['type'] == ty.TYPE_FLUORESCENCE:
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
