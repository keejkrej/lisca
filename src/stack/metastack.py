from dataclasses import dataclass
import threading

import numpy as np
import PIL.Image as pilimg
import PIL.ImageTk as piltk

from ..listener import Listeners
from .stack import Stack

TYPE_PHASECONTRAST = "Phase contrast"
TYPE_FLUORESCENCE = "Fluorescence"
TYPE_SEGMENTATION = "Segmentation"

@dataclass
class ChannelSpec:
    isVirtual = None
    name = None
    channel = None
    fun = None
    label = None
    type_ = None
    scales = None

    def __init__(self, name=None, channel=None, fun=None, label=None, type_=None, scales=False):
        if name is not None and channel is not None:
            self.isVirtual = False
            self.name = name
            self.channel = channel
            self.scales = False
            self.label = label
            self.type = type_
        elif fun is not None:
            self.isVirtual = True
            self.fun = fun
            self.scales = scales
            self.label = label
            self.type = type_


class MetaStack:
    def __init__(self):
        self.image_lock = threading.RLock()
        self._listeners = Listeners(kinds={'roi', 'image', 'load'})
        self._stacks = {}
        self._channels = []
        self._n_frames = None
        self._width = None
        self._height = None
        self._mode = None

    def clear(self):
        with self.image_lock:
            for s in self_stacks.keys():
                s.close()
            self._stacks = {}
            self._channels = []
            self._n_frames = None
            self._width = None
            self._height = None
            self._mode = None

    def add_stack(self, new_stack, name=None, overwrite=False):
        """Insert a new stack

        `new_stack` is either a string of the path of a TIFF stack
        or a `Stack` object.
        If `overwrite` is False, the method silently returns when
        a stack with `name` is already registered.
        """
        # Load stack, if path is given
        if isinstance(new_stack, str):
            name = new_stack
        elif name is None:
            name = new_stack.path
        if not overwrite and name in self._stacks:
            # Avoid overwriting existing stack
            return
        if isinstance(new_stack, str):
            new_stack = self.load_stack(new_stack)

        with self.image_lock:
            # First, check if stack is compatible
            if self._n_frames is None:
                self._n_frames = new_stack.n_frames
            elif self._n_frames != new_stack.n_frames:
                raise ValueError("Incompatible stack: expected {} frames, but found {} frames in '{}'.".format(self._n_channels, new_stack.n_channels, name))
            if self._width is None:
                self._width = new_stack.width
            elif self._width != new_stack.width:
                raise ValueError("Incompatible stack: expected width {}, but found width {} in '{}'.".format(self._width, new_stack.width, name))
            if self._height is None:
                self._height = new_stack.height
            elif self._height != new_stack.height:
                raise ValueError("Incompatible stack: expected height {}, but found height {} in '{}'.".format(self._height, new_stack.height, name))
            if self._mode is None or new_stack.mode > self._mode:
                self._mode = new_stack.mode

            # Secondly, register the stack
            self._stacks[name] = new_stack

    def add_channel(self, name=None, channel=None, fun=None, label=None, type_=None, scales=None):
        with self.image_lock:
            if name is not None and channel is not None:
                if name not in self._stacks:
                    raise KeyError("Unknown stack: {}".format(name))
                if channel >= self._stacks[name].n_channels:
                    nc = self._stacks[name].n_channels
                    raise IndexError("Index {} out of range: found {} channels in stack '{}'.".format(idx, nc, name))
                spec = ChannelSpec(name=name, channel=channel, label=label, type_=type_)
            elif fun is not None:
                if not callable(fun):
                    raise ValueError("Expected callable for virtual channel, but found {}.".format(type(fun)))
                spec = ChannelSpec(fun=fun, label=label, scales=scales, type_=type_)
            else:
                raise ValueError("Stack name and channel or function required.")
            self._channels.append(spec)
                

    def arrange_channels(self, order):
        """Specify the channel arrangement.

        `order` is an iterable of tuples. The first element
        of the tuple is the name of a stack, and the second
        element of the tuple is a channel index.
        """
        with self.image_lock:
            self._channels = []
            for o in order:
                if isinstance(o, ChannelSpec):
                    self._channels.append(o)
                else:
                    raise TypeError("Require sequence of ChannelSpec")
        self._listeners.notify('image')

    def load_stack(self, path, block=True):
        """Load the stack in TIFF file `path`."""
        #TODO implement progress indicator
        stack = Stack(path)
        return stack

    def get_image(self, *, channel, frame, scale=None):
        """Get a numpy array of a stack position."""
        #TODO implement virtual channel
        with self.image_lock:
            spec = self._channels[channel]
            name = spec.name
            ch = spec.channel
            return self._stacks[name].get_image(channel=ch, frame=frame)

    def get_image_copy(self, *, channel, frame, scale=None):
        """Get a copy of a numpy array of a stack position."""
        #TODO
        img = self.get_image(channel=channel, frame=frame, scale=scale)


    def get_frame_tk(self, *, channel, frame, stack=None, convert_fcn=None):
        """
        Get a frame of the stack as :py:class:`tkinter.PhotoImage`.

        :param channel: The channel of the requested stack position
        :type channel: int
        :param frame: The frame of the requested stack position
        :type frame: int
        :param convert_fcn: Custom conversion function
        :type convert_fcn: None or function

        If a custom conversion function is given, the function must take
        one argument, which is a (n_rows, n_columns)-shaped numpy array
        of the current stack position with the bit-depth of the original
        image (typically 8 or 16 bit per pixel), and must return
        a (n_rows, n_columns)-shaped numpy array of ``uint8`` type.

        :return: the image at the requested stack position
        :rtype: :py:class:`tkinter.PhotoImage`
        """
        #TODO
        with self.image_lock:
            if convert_fcn:
                a8 = convert_fcn(self.get_image(channel=channel, frame=frame))
            elif self._mode == 8:
                a8 = self.get_image(channel=channel, frame=frame)
            elif self._mode == 16:
                a16 = self.get_image(channel=channel, frame=frame)
                a8 = np.empty(a16.shape, dtype=np.uint8)
                np.floor_divide(a16, 256, out=a8)
            else:
                raise ValueError(f"Illegal image mode: {self._mode}")
            return piltk.PhotoImage(pilimg.fromarray(a8, mode='L'))

    def add_listener(self, fun, kind=None):
        """Register a listener to stack changes."""
        return self._listeners.register(fun, kind)

    def delete_listener(self, lid):
        """Un-register a listener."""
        self._listeners.delete(lid)

    def _notify_roi_listeners(self, *_, **__):
        """Convenience function for propagation of ROI changes"""
        self._listeners.notify("roi")


    @property
    def path(self):
        return ''

    @property
    def mode(self):
        with self.image_lock:
            return self._mode

    @property
    def order(self):
        with self.image_lock:
            return self._order

    @property
    def width(self):
        with self.image_lock:
            return self._width

    @property
    def height(self):
        with self.image_lock:
            return self._height

    @property
    def n_images(self):
        with self.image_lock:
            if not self._channels:
                return None
            else:
                return len(self._channels) * self._n_frames

    @property
    def n_channels(self):
        with self.image_lock:
            if not self._channels:
                return None
            else:
                return len(self._channels)

    @property
    def n_frames(self):
        with self.image_lock:
            return self._n_frames

    @property
    def stacks(self):
        with self.image_lock:
            return {name: stack.n_channels
                for name, stack in self._stacks.items()}

    @property
    def stack(self, name):
        with self.image_lock:
            return self._stacks[name]

    @property
    def rois(self):
        #TODO
        return []
