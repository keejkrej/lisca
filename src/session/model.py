import os
import threading

from . import const
from .events import Event
from ..stack import Stack
from ..stack import metastack as ms

class SessionModel:
    """Session info container.

    The following structured fields are present:

    self.channel_selection
        list of dict
        The list items correspond to the channels of
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

    def get_stack(self, stack_id=None):
        """Get a stack

        If 'stack_id' is None, return the whole stack dictionary.
        Else, return the stack info for the given stack ID.
        Returns None for non-existent stack ID.

        This method is thread-safe. The returned object must not be altered.
        """
        with self.lock:
            if stack_id is None:
                return self.stacks
            else:
                try:
                    return self.stacks[stack_id]
                except KeyError:
                    return None

    def config(self, stacks):
        """Configure the session for display.

        'stacks' is a list holding dictionaries with these fields:
            stack_id #DEBUG: Attention, changed behaviour
            name
            dir
            i_channel
            label
            type
        """
        print("SessionModel.config") #DEBUG
