#! /usr/bin/env python3
import random
import re
import string
import warnings

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
        self._path = None
        self.img = None

        # The stack properties
        self._width = 0
        self._height = 0
        self._n_images = 0
        self._n_frames = 0
        self._n_channels = 0

        # The current stack position
        self._i_image = None
        self._i_frame = None
        self._i_channel = None

        # Notify listeners
        self._notify_listeners()


    def load(self, path):
        """Load a stack from a path."""
        try:
            self._path = path
            self.img = pilimg.open(self._path)
            if self.img.format != "TIFF":
                raise ValueError(
                    "Bad image format: {}. Expected TIFF.".format(
                    self.img.format))
            self._parse_tiff_tags()

        except Exception as e:
            self._clear_state()
            print(str(e))
            raise

        self._width = self.img.width
        self._height = self.img.height
        #self.stack = np.asarray(self.img)
        self._goto_stack_position(channel=0, frame=0)


    def close(self):
        """Close the TIFF file."""
        self.img.close()
        self._clear_state()


    def _parse_tiff_tags(self):
        """Read stack dimensions from TIFF description tag."""
        desc = self.img.tag[TIFF_TAG_DESCRIPTION][0]
        
        # Get total number of images in stack
        m = re.search(r"images=(\d+)", desc)
        if m:
            self._n_images = int(m.group(1))
        else:
            self._n_images = 1

        # Get number of frames in stack
        m = re.search(r"frames=(\d+)", desc)
        if m:
            self._n_frames = int(m.group(1))
        else:
            self._n_frames = 1

        # Get number of slices in stack
        m = re.search(r"slices=(\d+)", desc)
        if m:
            n_slices = int(m.group(1))
            if self._n_frames == 1 and n_slices > 1:
                self._n_frames = n_slices
            elif n_frames > 1:
                raise ValueError("Bad image format: multiple slices and frames detected.")

        # Get number of channels in stack
        m = re.search(r"channels=(\d+)", desc)
        if m:
            self._n_channels = int(m.group(1))
        else:
            self._n_channels = 1


    def _goto_stack_position(self, channel=None, frame=None, image=None):
        """Load a given stack position."""
        isChannelChanged = False
        isFrameChanged = False
        isImageChanged = False

        # Check function arguments
        if channel is not None and channel != self._i_channel:
            if channel < 0 or channel >= self._n_channels or channel % 1 != 0:
                warnings.warn("\"channel\" must be an integer in [0,{}).".format(self._n_channels))
                return
            isChannelChanged = True

        if frame is not None and frame != self._i_frame:
            if frame < 0 or frame >= self._n_frames or frame % 1 != 0:
                warnings.warn("\"frame\" must be an integer in [0,{}).".format(self._n_frames))
                return
            isFrameChanged = True

        if image is not None and image != self._i_image:
            if image < 0 or image >= self._n_images or image % 1 != 0:
                warnings.warn("\"image\" must be an integer in [0,{}).".format(self._n_images))
                return

            # Calculate corresponding channel and frame
            i_channel = image % self._n_channels
            i_frame = image // self._n_channels

            # Check for contradictory function arguments
            if (isChannelChanged and channel != i_channel) or \
                (isFrameChanged and frame != i_frame):
                warnings.warn("Cannot change to contradictory stack position: i_frame={}, i_channel={}, i_image={}.".format(frame, channel, image))
                return

            # Update implicitly changed dimensions
            isImageChanged = True
            if not isChannelChanged and i_channel != self._i_channel:
                channel = i_channel
                isChannelChanged = True
            if not isFrameChanged and i_frame != self._i_frame:
                frame = i_frame
                isFrameChanged = True

        # Set new dimensions (if any changes)
        if not isChannelChanged and not isFrameChanged and not isImageChanged:
            return
        if isChannelChanged:
            self._i_channel = channel
        if isFrameChanged:
            self._i_frame = frame
        if isImageChanged:
            self._i_image = image
        else:
            self._i_image = self._i_frame * self._n_channels + self._i_channel

        # Apply changes
        self.img.seek(self._i_image)
        self._notify_listeners()



    def get_frame_tk(self, channel, frame):
        """Get a frame of the stack as Tk.PhotoImage."""
        self._goto_stack_position(channel=channel, frame=frame)
        if self.img.mode in ('L', 'P'):
            photoimage = self.img
        else:
            a16 = np.asarray(self.img)
            a8 = np.empty(a16.shape, dtype=np.uint8)
            np.floor_divide(a16, 256, out=a8)
            #a16 = a16 - a16.min()
            #a16 = a16 / a16.max() * 255
            #np.floor_divide(a16, 255, out=a8)
            #np.true_divide(a16, 255, out=a8, casting='unsafe')
            photoimage = pilimg.fromarray(a8)
        return piltk.PhotoImage(photoimage)


    def info(self):
        """Print stack info. Only for debugging."""
        print("Path: " + str(self._path))
        print("width: " + str(self._width))
        print("height: " + str(self._height))
        print("n_images: " + str(self._n_images))
        print("n_channels: " + str(self._n_channels))
        print("n_frames: " + str(self._n_frames))
        print("i_image: " + str(self._i_image))
        print("i_channel: " + str(self._i_channel))
        print("i_frame: " + str(self._i_frame))


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


    @property
    def path(self):
        return self._path


    @property
    def width(self):
        return self._width


    @property
    def height(self):
        return self._height


    @property
    def n_images(self):
        return self._n_images


    @property
    def n_channels(self):
        return self._n_channels


    @property
    def n_frames(self):
        return self._n_frames


    @property
    def i_image(self):
        return self._i_image

    @i_image.setter
    def i_image(self, i_image):
        self._goto_stack_position(image=i_image)


    @property
    def i_channel(self):
        return self._i_channel

    @i_channel.setter
    def i_channel(self, i_channel):
        self._goto_stack_position(channel=i_channel)


    @property
    def i_frame(self):
        return self._i_frame

    @i_frame.setter
    def i_frame(self, i_frame):
        self._goto_stack_position(frame=i_frame)

