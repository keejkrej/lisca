#! /usr/bin/env python3
import random
import re
import string
import tempfile
import warnings

import numpy as np
import PIL.Image as pilimg
import PIL.ImageTk as piltk
import skimage.draw as skid

TIFF_TAG_DESCRIPTION = 270
TIFF_TAG_BITSPERSAMPLE = 258

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
        self._tmpfile = None
        self.img = None

        # The stack properties
        self._mode = None
        self._width = 0
        self._height = 0
        self._n_images = 0
        self._n_frames = 0
        self._n_channels = 0

        # ROI list
        self._rois = None

        # Notify listeners
        self._notify_listeners()


    def load(self, path):
        """Load a stack from a path."""
        try:
            self._path = path
            tiffimg = pilimg.open(self._path)
            if tiffimg.format != "TIFF":
                raise ValueError(
                    "Bad image format: {}. Expected TIFF.".format(
                    tiffimg.format))
            self._parse_tiff_tags(tiffimg)

        except Exception as e:
            self._clear_state()
            print(str(e))
            raise

        self._width = tiffimg.width
        self._height = tiffimg.height
        self._n_images = tiffimg.n_frames

        # Copy stack to numpy array in temporary file
        self._tmpfile = tempfile.TemporaryFile()
        self.img = np.memmap(filename=self._tmpfile,
                             dtype=(np.uint8 if self._mode == 8
                                    else np.uint16),
                             shape=(self._n_channels,
                                    self._n_frames,
                                    self._height,
                                    self._width))
        for i in range(self._n_images):
            tiffimg.seek(i)
            ch, fr = self.convert_position(image=i)
            self.img[ch,fr,:,:] = np.asarray(tiffimg)

        # Close TIFF image
        tiffimg.close()


    def close(self):
        """Close the TIFF file."""
        self.img = None
        self._tmpfile.close()
        self._tmpfile = None
        self._clear_state()


    def _parse_tiff_tags(self, tiffimg):
        """Read stack dimensions from TIFF description tag."""
        # Get pixel size
        px_size = tiffimg.tag[TIFF_TAG_BITSPERSAMPLE][0]
        if px_size == 8:
            self._mode = 8
        elif px_size == 16:
            self._mode = 16
        else:
            raise ValueError("Undefined pixel size: {}".format(px_size))

        # Parse image description (metadata from ImageJ)
        desc = tiffimg.tag[TIFF_TAG_DESCRIPTION][0]
        
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


    def convert_position(self, channel=None, frame=None, image=None):
        """
        Convert stack position between (channel, frame) and image.
        
        Either give "channel" and "frame" to obtain the corresponding
        image index, or give "image" to obtain the corresponding indices
        of channel and frame as tuple.
        All other combinations will return None.
        """
        # Check arguments
        if channel is None and frame is None:
            toCT = True
        elif channel is None or frame is None:
            return None
        else:
            toCT = False
        if image is None and toCT:
            return None

        # Convert
        if toCT:
            channel = image % self._n_channels
            frame = image // self._n_channels
            return (channel, frame)
        else:
            image = frame * self._n_channels + channel
            return image


    def get_image(self, channel, frame):
        """Get a numpy array of a stack position."""
        return self.img[channel, frame, :, :]


    def get_image_copy(self, channel, frame):
        """Get a copy of a numpy array of a stack position."""
        return self.img[channel, frame, :, :].copy()


    def get_frame_tk(self, channel, frame, convert_fcn=None):
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
        if convert_fcn:
            a8 = convert_fcn(self.get_image(channel, frame))
        elif self._mode == 8:
            a8 = self.get_image(channel, frame)
        elif self._mode == 16:
            a16 = self.get_image(channel, frame)
            a8 = np.empty(a16.shape, dtype=np.uint8)
            np.floor_divide(a16, 256, out=a8)
            #a16 = a16 - a16.min()
            #a16 = a16 / a16.max() * 255
            #np.floor_divide(a16, 255, out=a8)
            #np.true_divide(a16, 255, out=a8, casting='unsafe')
        else:
            raise ValueError("Illegal image mode: {}".format(str(self._mode)))
        return piltk.PhotoImage(pilimg.fromarray(a8, mode='L'))


    def info(self):
        """Print stack info. Only for debugging."""
        print("Path: " + str(self._path))
        print("width: " + str(self._width))
        print("height: " + str(self._height))
        print("n_images: " + str(self._n_images))
        print("n_channels: " + str(self._n_channels))
        print("n_frames: " + str(self._n_frames))


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


    def set_rois(self, rois, type_):
        """Set the ROI set of the stack.

        :param rois: The ROIs to be set
        :param type_: The ROI type (currently one of "rect" and "raw")

        For details, see :py:class:`RoiSet`
        """
        self._rois = RoiSet(rois, type_)
        self._notify_listeners()

    @property
    def rois(self):
        return self._rois
    def get_rois(self):
        return self._rois

    def clear_rois(self):
        """Delete the current ROI set"""
        self._rois = None
        self._notify_listeners()


    @property
    def path(self):
        return self._path


    @property
    def mode(self):
        return self._mode


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


class RoiSet:
    ROI_TYPE_RAW = 'raw'
    ROI_TYPE_RECT = 'rect'

    def __init__(self, roi_arr, type_=ROI_TYPE_RECT):

        # Change ROI into index array
        if type_ == RoiSet.ROI_TYPE_RECT:
            self._roi_arr = []
            for r in roi_arr:
                self._roi_arr.append(skid.polygon(r[:,1], r[:,0]))
        elif type_ == RoiSet.ROI_TYPE_RAW:
            self._roi_arr = roi_arr
        else:
            raise ValueError("Unknown ROI type: {}", type_, file=sys.stderr)
        self._list_iter = self._roi_arr.__iter__()

    def __iter__(self):
        return RoiSet(self._roi_arr, RoiSet.ROI_TYPE_RAW)

    def __next__(self):
        return self._list_iter.__next__()


