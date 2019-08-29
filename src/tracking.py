#from numba import jit
import numpy as np
import skimage.measure as skmeas
from .stack import Stack

import time

class Tracker:
    """Performs tracking in multithreaded fashion.
    
    Constructor arguments:
        segmented_stack -- a Stack with segmented cells
        labeled_stack -- a Stack with each cell having a unique label (per frame)
    In both cases, background is 0.
    Only one of both arguments needs be given.
    The labeled stack can be created using `Tracker.label`.
    """
    IS_GOOD = 0
    IS_TOO_SMALL = 1
    IS_TOO_LARGE = 2
    IS_AT_EDGE = 4

    def __init__(self, segmented_stack=None, labeled_stack=None, min_size=1000, max_size=10000):
        self.stack_seg = segmented_stack
        self.stack_lbl = labeled_stack
        self.progress_fcn = None
        self.min_size = min_size
        self.max_size = max_size
        self.props = None
        self.traces = None
        self.traces_selection = None

    def label(self):
        if self.stack_lbl is not None:
            return
        self.stack_lbl = Stack(width=self.stack_seg.width,
                               height=self.stack_seg.height,
                               n_frames=self.stack_seg.n_frames,
                               n_channels=1,
                               dtype=np.uint16,
                              )
        n_frames = self.stack_seg.n_frames
        for fr in range(n_frames):
            if self.progress_fcn is not None:
                self.progress_fcn(msg="Labeling frames", current=fr, total=n_frames)
            self.stack_lbl.img[0, fr, :, :] = skmeas.label(
                    self.stack_seg.get_image(channel=0, frame=fr), connectivity=1)
        self.stack_seg = None

    def read_regionprops(self):
        self.props = {}
        n_frames = self.stack_lbl.n_frames
        for fr in range(n_frames):
            if self.progress_fcn is not None:
                self.progress_fcn(msg="Reading region props", current=fr, total=n_frames)
            props = skmeas.regionprops(self.stack_lbl.get_image(channel=0, frame=fr))
            this_props = {}
            for p in props:
                this_props[p.label] = p
            self.props[fr] = this_props

    def track(self):
        """Track the cells through the stack."""
        # `traces` holds for each cell a list with the labels for each frame.
        # `traces_selection` holds a size-based selection for the elements of `traces` with same indices.
        # `last_idx` maps the labels of the cells in the last iteration to an index in `traces`.
        traces = []
        traces_selection = []
        last_idx = {}

        # Initialization for first frame
        tic = time.time() #DEBUG
        for p in self.props[0].values():
            check = self._check_props(p)
            if check & self.IS_AT_EDGE:
                continue
            last_idx[p.label] = len(traces)
            traces.append([p.label])
            traces_selection.append(True if check == self.IS_GOOD else False)
        print("Frame 001: {:.4f}s".format(time.time() - tic)) #DEBUG

        # Track further frames
        for fr in range(1, self.stack_lbl.n_frames):
            tic = time.time() #DEBUG
            new_idx = {}
            for p in self.props[fr].values():
                ck = self._check_props(p)
                if ck & self.IS_AT_EDGE:
                    continue

                # Compare with regions of previous frame
                # Check bounding boxes and then coordinates for overlap.
                # Then check if parent is valid (area, edge).
                min_y, min_x, max_y, max_x = p.bbox
                parents = []
                is_select = True
                for q in self.props[fr-1].values():
                    q_min_y, q_min_x, q_max_y, q_max_x = q.bbox
                    if q_min_y >= max_y or q_max_y <= min_y or q_min_x >= max_x or q_max_x <= min_x:
                        continue
                    overlap = False
                    for row in p.coords:
                        if np.any(np.all(q.coords == row, axis=1)):
                            overlap = True
                            break
                    if not overlap:
                        continue

                    q_check = self._check_props(q)
                    if q_check & self.IS_AT_EDGE:
                        if q_check & self.IS_TOO_SMALL:
                            continue
                        else:
                            is_select = None
                            break
                    if q_check & self.IS_TOO_SMALL:
                        parents.append(dict(label=q.label, large=False, small=True, area=q.area))
                    elif q_check & self.IS_TOO_LARGE:
                        parents.append(dict(label=q.label, large=True, small=False))
                    else:
                        parents.insert(0, dict(label=q.label, large=False, small=False))

                # Check for parents
                if is_select is None:
                    pass
                elif not parents:
                    continue
                elif len(parents) == 1:
                    parent = 0
                elif parents[0]['small']:
                    parent = max(range(len(parents)), key=lambda i: parents[i]['area'])
                elif parents[1]['small']:
                    parent = 0
                else:
                    is_select = None

                # Mark untrackable cells
                if is_select is None:
                    for q in parents:
                        try:
                            invalid_idx = last_idx[q['label']]
                        except KeyError:
                            continue
                        traces_selection[invalid_idx] = None
                    continue

                # Final checks
                parent = parents[parent]
                try:
                    parent_idx = last_idx[parent['label']]
                except KeyError:
                    continue
                if traces_selection[parent_idx] is None:
                    # Ignore traces with "bad ancestors"
                    continue
                elif parent_idx in new_idx.values():
                    # Eliminate siblings
                    traces_selection[parent_idx] = None
                else:
                    # Register this region as child of parent
                    new_idx[p.label] = parent_idx
                    traces[parent_idx].append(p.label)
                    if parent['large'] or parent['small']:
                        traces_selection[parent_idx] = False
            last_idx = new_idx
            print("Frame {:03d}: {:.4f}s".format(fr, time.time() - tic)) #DEBUG

        # Clean up cells
        n_frames = self.stack_lbl.n_frames
        self.traces = []
        self.traces_selection = []
        for i, tr in enumerate(traces):
            if len(tr) == n_frames and traces_selection[i] is not None:
                self.traces.append(tr)
                self.traces_selection.append(traces_selection[i])

    def _check_props(self, props, edges=True):
        """Check if given regionprops are valid.

        Arguments:
            edges -- if `True`, region must not touch image edge

        Returns:
            `IS_AT_EDGE` if region touches the image edge,
            `IS_TOO_SMALL` if the area is too small,
            `IS_TOO_LARGE` if the area is too large,
            `IS_GOOD` else.
        """
        ret = self.IS_GOOD
        if edges:
            coords = props.coords
            if np.any(coords.flat == 0) or np.any(coords[:,0] == self.stack_lbl.height-1) or \
                    np.any(coords[:,1] == self.stack_lbl.width-1):
                ret |= self.IS_AT_EDGE
        if self.max_size and props.area > self.max_size:
            ret |= self.IS_TOO_LARGE
        if self.min_size and props.area < self.min_size:
            ret |= self.IS_TOO_SMALL
        return ret

    def get_traces(self):
        """Label and track cells.

        This method is intended to be called externally."""
        if self.stack_lbl is None:
            self.label()
        if self.props is None:
            self.read_regionprops()
        self.track()
