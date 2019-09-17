import base64
import json
import os
import struct

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
            with open(fn, 'wt') as f:
                json.dump(data, f, **json_args)
        else:
            json.dump(data, fn, **json_args)

    def load(self, fn=None, s=None):
        #TODO
        if fn is not None:
            if isinstance(fn, str):
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
        self.rois = data['rois']

    @staticmethod
    def to_list64(arr, fmt='<H'):
        """Write array content to base64.

        Arguments:
            arr -- the numpy-array to encode
            fmt -- the format for byte conversion

        The flattened `arr` is converted to a bytes holding a sequence of numbers
        encoded according to `fmt`. `fmt` must be a two-element str, wherein the
        first element indicates the endianness and the second element indicates
        a byte length and signedness. See the `struct` package for possible options.

        The resulting bytes object is prepended with fmt and returned as string.
        """
        data = b''.join((fmt.encode(), *(struct.pack(fmt, x) for x in arr.flat)))
        return base64.b64encode(data).decode()

    @staticmethod
    def from_list64(data):
        """Read base64-encoded array.

        `data` must be a base64-encoded array in the format described for `to_list64`.
        It is returned as 1-dim numpy array.

        Currently, the dtype of the returned array is determined by numpy’s type inference.
        """
        data = base64.b64decode(data)
        fmt = data[:2]
        return np.array(struct.unpack(fmt, x) for x in data[2:])
