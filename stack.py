#! /usr/bin/env python3
import random
import re
import string

import numpy as np
import PIL.Image as pilimg
import PIL.ImageTk as piltk

TIFF_TAG_DESCRIPTION = 270

class Stack:
    """Represents an image stack."""

    def __init__(self, path=None):
        """Initialize a stack."""
        self._listeners = {}
        self._clear_state()

        # If requested, load stack
        if path is not None:
            self.load(path)


    def _clear_state(self):
        """Clear the internal state"""
        # The stack path and object
        self.path = None
        self.img = None

        # The stack properties
        self.width = 0
        self.height = 0
        self.n_images = 0
        self.n_frames = 0
        self.n_channels = 0

        # The current stack position
        self.i_image = None
        self.i_frame = None
        self.i_channel = None

        # Notify listeners
        self._notify_listeners()


    def load(self, path):
        """Load a stack from a path."""
        try:
            self.path = path
            self.img = pilimg.open(self.path)
            if self.img.format != "TIFF":
                raise ValueError(
                    "Bad image format: {}. Expected TIFF.".format(
                    self.img.format))
            self._parse_tiff_tags()

        except Exception as e:
            self._clear_state()
            print(str(e))
            raise

        self.width = self.img.width
        self.height = self.img.height
        #self.stack = np.asarray(self.img)
        self._goto_frame(channel=0, frame=0)


    def _parse_tiff_tags(self):
        """Read stack dimensions from TIFF description tag."""
        desc = self.img.tag[TIFF_TAG_DESCRIPTION][0]
        
        # Get total number of images in stack
        m = re.search(r"images=(\d+)", desc)
        if m:
            self.n_images = int(m.group(1))
        else:
            self.n_images = 1

        # Get number of frames in stack
        m = re.search(r"frames=(\d+)", desc)
        if m:
            self.n_frames = int(m.group(1))
        else:
            self.n_frames = 1

        # Get number of slices in stack
        m = re.search(r"slices=(\d+)", desc)
        if m:
            n_slices = int(m.group(1))
            if self.n_frames == 1 and n_slices > 1:
                self.n_frames = n_slices
            elif n_frames > 1:
                raise ValueError("Bad image format: multiple slices and frames detected.")

        # Get number of channels in stack
        m = re.search(r"channels=(\d+)", desc)
        if m:
            self.n_channels = int(m.group(1))
        else:
            self.n_channels = 1


    def _goto_frame(self, channel=None, frame=None):
        """Load a given frame of the stack."""
        isChanged = False
        if channel is not None and channel != self.i_channel:
            self.i_channel = channel
            isChanged = True
        if frame is not None and frame != self.i_frame:
            self.i_frame = frame
            isChanged = True

        if not isChanged:
            return

        self.i_image = self.i_frame * self.n_channels + self.i_channel
        self.img.seek(self.i_image)
        self._notify_listeners()


    def get_frame_tk(self, channel=None, frame=None):
        """Get a frame of the stack as Tk PhotoImage."""
        self._goto_frame(channel=channel, frame=frame)
        return piltk.PhotoImage(self.img)


    def info(self):
        """Print stack info. Only for debugging."""
        print("Path: " + str(self.path))
        print("width: " + str(self.width))
        print("height: " + str(self.height))
        print("n_images: " + str(self.n_images))
        print("n_channels: " + str(self.n_channels))
        print("n_frames: " + str(self.n_frames))
        print("i_image: " + str(self.i_image))
        print("i_channel: " + str(self.i_channel))
        print("i_frame: " + str(self.i_frame))


    def add_listener(self, fun, *args, **kw):
        """Register a listener to stack changes."""
        # Get a unique listener ID
        k = 0
        isInvalid = True
        while isInvalid:
            k += 1
            lid = "".join(random.choices(
                string.ascii_letters + string.digits, k=k))
            isInvalid = lid in self._listeners

        # Register listener and return its listener ID
        self._listeners[lid] = (fun, args, kw)
        return lid


    def delete_listener(self, lid):
        """Un-register a listener."""
        if lid in self._listeners:
            del self._listeners[lid]


    def _notify_listeners(self):
        """Notify all registered listeners."""
        for _, (fun, args, kw) in self._listeners.items():
            fun(*args, **kw)
