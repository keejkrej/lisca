import base64
from contextlib import ExitStack
import io
import json
import numpy as np
import os
import struct
import zipfile

ZIP_JSON_NAME = 'session.json'

def get_format(fmt):
    """Get format properties for binary data.

    `fmt` is a format character of the package `struct`.
    Note that the following characters are not allowed:
    x, ?, n, N, s, p, P

    The corresponding numpy dtype is returned.
    The number of bytes required per value can be
    accessed with the attribute `itemsize`.
    """
    if fmt in 'cb':
        return np.int8, 1
    elif fmt == 'B':
        return np.uint8, 1
    elif fmt == 'h':
        return np.int16, 2
    elif fmt == 'H':
        return np.uint16, 2
    elif fmt in 'il':
        return np.int32, 4
    elif fmt in 'IL':
        return np.uint32, 4
    elif fmt == 'q':
        return np.int64, 8
    elif fmt == 'Q':
        return np.uint64, 8
    elif fmt == 'e':
        return np.float16, 2
    elif fmt == 'f':
        return np.float32, 4
    elif fmt == 'd':
        return np.float64, 8
    else:
        raise ValueError(f"Undefined format character '{fmt}'")


class StackdataIO:
    """Provides an interface for standardized export and import of stack data.

    Arguments:
        traces -- traces such as Main_Tk.traces
        rois -- ROIs such as Main_Tk.rois

    In addition to traces and ROIs, which may be inserted using the constructor or
    the methods `load_traces` (all traces) / `insert_trace` (one trace) and `load_rois`
    (all ROIs) / `insert_roi` (single ROI), also the following fields should be filled:
        `n_frames`: number of frames in the stack
        `channels`: information about channels, to be added with the method `add_channel`
        `microscope_name`: display name of the used microscope
        `microscope_resolution`: resolution of the microscope, float value in [µm/px]

    When all fields are filled, the data can be written with the method `dump`.
    """
    def __init__(self, traces=None, rois=None):
        self.version = '1.0'
        self.microscope_name = None
        self.microscope_resolution = None
        self.n_frames = None
        self.rois = None
        self.channels = []
        self.traces = None

        if traces is not None:
            self.load_traces(traces)
        if rois is not None:
            self.load_rois(rois)

    def add_channel(self, path, type_, i_channel=0, name=None, label=None):
        """Insert information about a new channel.

        Arguments:
            path -- str, path of the stack containing the channel, may be used for re-opening the stack
            type_ -- str, type of the channel, one of MetaStack.TYPE_{FLUORESCENCE,PHASECONTRAST,SEGMENTATION}
            i_channel -- int, index of the channel in the MetaStack
            name -- str, name of the stack containing the channel
            label -- str, additional label describing the channel
        """
        if path is None:
            file_directory = None
            file_name = None
        else:
            file_directory, file_name = os.path.split(path)
        self.channels.append({
                              'file_name': file_name,
                              'file_directory': file_directory,
                              'i_channel': i_channel,
                              'type': type_,
                              'name': name,
                              'label': label,
                             })

    def load_rois(self, rois):
        """Loads the given ROIS"""
        for fr, rois_frame in enumerate(rois):
            for label, roi in rois_frame.items():
                self.insert_roi(fr, label, roi)
                
    def insert_roi(self, frame, label, roi):
        """Inserts a ROI.

        Arguments:
            frame -- int, the 0-based index of the frame the ROI belongs to
            label -- str, the label of the ROI
            roi -- the ContourRoi instance
        """
        if self.rois is None:
            self.rois = []
        while frame >= len(self.rois):
            self.rois.append({})
        self.rois[frame][str(label)] = {
                                        "name": roi.name,
                                        "rows": self.to_list64(roi.rows), 
                                        "cols": self.to_list64(roi.cols), 
                                       }

    def load_traces(self, traces):
        """Loads the given traces"""
        for name, tr in traces.items():
            self.insert_trace(name, tr['roi'], tr['select'])

    def insert_trace(self, name, rois, is_selected=True):
        """Inserts a trace/cell.

        Arguments:
            name -- str, name of the trace/cell, e.g. based on its position in the image
            rois -- list of str, indicating the ROIs of the cell in all frames
            is_selected -- bool, indicating whether the trace/cell is selected
        """
        if self.traces is None:
            self.traces = []
        self.traces.append({
                            'name': name,
                            'select': is_selected,
                            'rois': [str(roi) for roi in rois], # list of `n_frames` strings
                           })

    def dump(self, fn=None):
        """Write the stack data to JSON.

        If `fn` is a str, or a file-object, the JSON data is written there.
        If `fn` is None, the JSON data is returned as str.
        """
        if self.n_frames is None:
            raise ValueError("Number of frames is not given.")
        elif self.rois is None:
            raise ValueError("ROIs are not defined.")
        elif not self.channels:
            raise ValueError("No channels are given.")
        elif len(self.rois) != self.n_frames:
            raise ValueError("Number of frames with ROIs is inconsistent")

        data = {'version': self.version,
                'n_frames': self.n_frames,
                'channels': self.channels,
                'microscope': {'name': self.microscope_name,
                               'resolution': self.microscope_resolution,
                              },
                'cells': self.traces,
                'rois': self.rois,
               }

        json_args = {'indent': '\t'}

        if fn is None:
            return json.dumps(data, **json_args)
        elif isinstance(fn, str):
            _, ext = os.path.splitext(fn)
            with ExitStack() as cm:
                if ext.lower() == '.zip':
                    zf = cm.enter_context(zipfile.ZipFile(fn, 'w', compression=zipfile.ZIP_DEFLATED))
                    f = cm.enter_context(zf.open(ZIP_JSON_NAME, 'w'))
                    f = io.TextIOWrapper(f, encoding='utf8', newline='\n', write_through=True)
                else:
                    f = cm.enter_context(open(fn, 'wt', encoding='utf8', newline='\n'))
                json.dump(data, f, **json_args)
        else:
            json.dump(data, fn, **json_args)

    def load(self, fn=None, s=None):
        """Loads stack information and ROI information from JSON

        Arguments:
            fn -- file-like or str holding a filename of JSON file to be read
            s -- string holding JSON data

        If `fn` is given, `s` is ignored.
        `fn` may be a ZIP file containing a file named 'session.json' that holds
        the information.

        The content of the JSON data is loaded and can be accessed
        via the fields of this object.
        """
        if fn is not None:
            if isinstance(fn, str):
                if zipfile.is_zipfile(fn):
                    with zipfile.ZipFile(fn) as zf:
                        with zf.open(ZIP_JSON_NAME) as f:
                            data = json.loads(io.TextIOWrapper(f, encoding='utf8').read())
                else:
                    with open(fn, 'rt') as f:
                        data = json.load(f)
            else:
                data = json.load(fn)
        elif s is not None:
            data = json.loads(s)
        else:
            raise ValueError("Either file or string must be given.")

        self.version = data['version']
        self.n_frames = data['n_frames']
        self.channels = data['channels']
        self.microscope_name = data['microscope']['name']
        self.microscope_resolution = data['microscope']['resolution']
        self.traces = data['cells']
        self.rois = []
        for frame in data['rois']:
            rois = {}
            for label, roi in frame.items():
                coords = np.stack((self.from_list64(roi['rows']), self.from_list64(roi['cols'])), axis=-1)
                rois[label] = {
                               'name': roi['name'],
                               'coords': coords,
                              }
            self.rois.append(rois)
        return self

    @staticmethod
    def to_list64(arr, fmt='<H'):
        """Write array content to base64.

        Arguments:
            arr -- the numpy-array to encode
            fmt -- the format for byte conversion

        The flattened `arr` is converted to a bytes holding a sequence of numbers
        encoded according to `fmt`. `fmt` must be a two-element str, wherein the
        first element indicates the endianness and the second element indicates
        a byte length and sign. See the `struct` package for possible options.

        The resulting bytes object is prepended with fmt and returned as string.
        """
        data = b''.join((fmt.encode(), *(struct.pack(fmt, x) for x in arr.flat)))
        return base64.b64encode(data).decode()

    @staticmethod
    def from_list64(data):
        """Read base64-encoded array.

        `data` must be a base64-encoded array in the format described for `to_list64`.
        It is returned as 1-dim numpy array.
        """
        data = base64.b64decode(data)
        fmt = data[:2].decode()
        data = data[2:]
        dtype, itemsize = get_format(fmt[1])
        numel = len(data) // itemsize
        arr = np.empty(numel, dtype=dtype)
        for i in range(numel):
            arr[i] = struct.unpack(fmt, data[i*itemsize:(i+1)*itemsize])[0]
        return arr
