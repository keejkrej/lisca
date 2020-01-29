import time

import numpy as np
import skimage.measure as skmeas

from .stack import Stack
from .session.status import DummyStatus

def intercalation_iterator(n):
    """Generator function for iterating from both ends in `n` steps"""
    n = int(n)
    if n <= 0:
        return
    elif n % 2:
        yield 0
        i1 = n - 1
        step1 = -2
        stop1 = 0
        i2 = 1
        step2 = 2
    else:
        i1 = 0
        step1 = 2
        stop1 = n
        i2 = n - 1
        step2 = -2
    while i1 != stop1:
        yield i1
        yield i2
        i1 += step1
        i2 += step2

def check_coordinate_overlap(coords1, coords2):
    """Performantly check two coordinate sets for overlap

    Arguments:
        Both `coords1` and `coords2` are n-by-2 numpy arrrays.
        Each line cooresponds to one pixel.
        The first column is the vertical coordinate, and
        the second column is the horizontal coordinate.

    Returns:
        True if the coordinate sets overlap, else False.
    """
    uy = np.intersect1d(coords1[:, 0], coords2[:, 0])
    for iy in intercalation_iterator(uy.size):
        y = uy[iy]
        if np.intersect1d(coords1[coords1[:, 0] == y, 1], coords2[coords2[:, 0] == y, 1]).size:
            return True
    return False


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
    IS_UNCHECKED = 128

    def __init__(self, segmented_stack=None, labeled_stack=None, make_labeled_stack=False,
            min_size=1000, max_size=10000, preprocessing=None, segmented_chan=None, labeled_chan=None, status=None):
        self.stack_seg = segmented_stack
        if segmented_chan is None:
            self.segmented_chan = 0
        else:
            self.segmented_chan = segmented_chan
        self.stack_lbl = labeled_stack
        if self.stack_lbl is None or labeled_chan is None:
            self.labeled_chan = 0
        else:
            self.labeled_chan = labeled_chan
        if status is None:
            self.status = DummyStatus()
        else:
            self.status = status
        self.min_size = min_size
        self.max_size = max_size
        self.props = None
        self.traces = None
        self.traces_selection = None
        self.make_labeled_stack = make_labeled_stack
        self.preprocessing = preprocessing

        if self.stack_seg is not None:
            self.n_frames = self.stack_seg.n_frames
            self.width = self.stack_seg.width
            self.height = self.stack_seg.height
        elif self.stack_lbl is not None:
            self.n_frames = self.stack_lbl.n_frames
            self.width = self.stack_lbl.width
            self.height = self.stack_lbl.height
        else:
            raise ValueError("At least `segmented_stack` or `labeled_stack` must be given.")

    def label_stack(self):
        if self.stack_lbl is not None:
            return
        self.stack_lbl = Stack(width=self.width,
                               height=self.height,
                               n_frames=self.n_frames,
                               n_channels=1,
                               dtype=np.uint16,
                              )
        for fr in range(self.n_frames):
            with self.status(msg="Labeling frames", current=fr+1, total=self.n_frames):
                self.stack_lbl.img[self.labeled_chan, fr, :, :] = self.label(
                        self.stack_seg.get_image(channel=self.segmented_chan, frame=fr))

    def label(self, img):
        if self.preprocessing is not None:
            img = self.preprocessing(img)
        return skmeas.label(img, connectivity=1)

    def read_regionprops(self):
        self.props = {}
        for fr in range(self.n_frames):
            with self.status(msg="Reading region props", current=fr+1, total=self.n_frames):
                if self.stack_lbl is None:
                    img = self.label(self.stack_seg.get_image(channel=self.segmented_chan, frame=fr))
                else:
                    img = self.stack_lbl.get_image(channel=self.labeled_chan, frame=fr)
                props = skmeas.regionprops(img)
                this_props = {}
                for p in props:
                    this_props[p.label] = p
                self.props[fr] = this_props

    def get_bboxes(self, fr):
        """Build a dictionary with bounding boxes of ROIs in frame `fr`"""
        this_props = self.props[fr]
        n = len(this_props)
        i = 0
        labels = np.empty(n, dtype=np.object)
        props = np.empty(n, dtype=np.object)
        y_min = np.empty(n, dtype=np.int32)
        x_min = np.empty(n, dtype=np.int32)
        y_max = np.empty(n, dtype=np.int32)
        x_max = np.empty(n, dtype=np.int32)
        for lbl, p in this_props.items():
            labels[i] = lbl
            props[i] = p
            y_min[i], x_min[i], y_max[i], x_max[i] = p.bbox
            i += 1
        return {
                'n': n,
                'labels': labels,
                'props': props,
                'y_min': y_min,
                'x_min': x_min,
                'y_max': y_max,
                'x_max': x_max,
                'check': np.full(n, self.IS_UNCHECKED, dtype=np.uint8),
               }

    def update_bboxes(self, bb, keys):
        """Remove all entries from bboxes instance `bb` that are not in `keys`"""
        idx = np.isin(bb['labels'], keys)
        if np.all(idx):
            return bb
        bb['n'] = np.sum(idx)
        bb['labels'] = bb['labels'][idx]
        bb['props'] = bb['props'][idx]
        bb['y_min'] = bb['y_min'][idx]
        bb['x_min'] = bb['x_min'][idx]
        bb['y_max'] = bb['y_max'][idx]
        bb['x_max'] = bb['x_max'][idx]
        bb['check'] = bb['check'][idx]
        return bb

    def track(self):
        """Track the cells through the stack."""
        # `traces` holds for each cell a list with the labels for each frame.
        # `traces_selection` holds a size-based selection for the elements of `traces` with same indices.
        # `last_idx` maps the labels of the cells in the last iteration to an index in `traces`.
        traces = []
        traces_selection = []
        last_idx = {}

        # Initialization for first frame
        tic0 = time.time() #DEBUG
        with self.status(msg="Tracking cells", current=1, total=self.n_frames):
            tic = time.time() #DEBUG
            bbox_new = self.get_bboxes(0)
            for i in range(bbox_new['n']):
                ck = self._check_props(bbox_new['props'][i])
                bbox_new['check'][i] = ck
                if ck & self.IS_AT_EDGE and ck & self.IS_TOO_SMALL:
                    continue
                lbl = bbox_new['labels'][i]
                last_idx[lbl] = len(traces)
                traces.append([lbl])
                traces_selection.append(ck == self.IS_GOOD)
        print("Frame 001: {:.4f}s".format(time.time() - tic)) #DEBUG

        # Track further frames
        for fr in range(1, self.n_frames):
            new_idx = {}
            with self.status(msg="Tracking cells", current=fr + 1, total=self.n_frames):
                tic = time.time() #DEBUG

                # Compare bounding boxes
                #bbox_old = self.update_bboxes(bbox_new, (*last_idx.keys(),))
                bbox_old = bbox_new
                bbox_new = self.get_bboxes(fr)
                overlaps = np.logical_and(
                    np.logical_and(
                        bbox_new['y_min'].reshape((-1, 1)) < bbox_old['y_max'].reshape((1, -1)),
                        bbox_new['y_max'].reshape((-1, 1)) > bbox_old['y_min'].reshape((1, -1))),
                    np.logical_and(
                        bbox_new['x_min'].reshape((-1, 1)) < bbox_old['x_max'].reshape((1, -1)),
                        bbox_new['x_max'].reshape((-1, 1)) > bbox_old['x_min'].reshape((1, -1))))

                for i in range(overlaps.shape[0]):
                    js = np.flatnonzero(overlaps[i,:])

                    # Continue if ROI has no parent
                    if js.size == 0:
                        continue

                    li = bbox_new['labels'][i]
                    pi = bbox_new['props'][i]
                    ci = pi.coords

                    cki = self._check_props(pi)
                    bbox_new['check'][i] = cki

                    parents = []
                    is_select = True

                    # Compare with regions of previous frame
                    # Check if parent is valid (area, edge)
                    for j in js:
                        pj = bbox_old['props'][j]
                        cj = pj.coords
                        if not check_coordinate_overlap(ci, cj):
                            continue

                        ckj = bbox_old['check'][j]
                        if ckj & self.IS_UNCHECKED:
                            continue
                        elif ckj & self.IS_AT_EDGE:
                            if ckj & self.IS_TOO_SMALL:
                                continue
                            else:
                                is_select = None
                                break
                        if ckj & self.IS_TOO_SMALL:
                            parents.append(dict(label=pj.label, large=False, small=True, area=pj.area))
                        elif ckj & self.IS_TOO_LARGE:
                            parents.append(dict(label=pj.label, large=True, small=False, area=pj.area))
                        else:
                            parents.insert(0, dict(label=pj.label, large=False, small=False, area=pj.area))

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
                        new_idx[li] = parent_idx
                        traces[parent_idx].append(li)
                        if parent['large'] or parent['small']:
                            traces_selection[parent_idx] = False
                last_idx = new_idx
                print("Frame {:03d}: {:.4f}s".format(fr + 1, time.time() - tic)) #DEBUG

        # Clean up cells
        self.traces = []
        self.traces_selection = []
        for i, tr in enumerate(traces):
            if len(tr) == self.n_frames and traces_selection[i] is not None:
                self.traces.append(tr)
                self.traces_selection.append(traces_selection[i])
        print(f"Total tracking time: {time.time() - tic0 :.2f}s") #DEBUG

    def _check_props(self, props, edges=True, coords=None):
        """Check if given regionprops are valid.

        Arguments:
            edges -- if `True`, region must not touch image edge
            coords -- optional; `props.coords` to avoid re-evaluation

        Returns:
            `IS_AT_EDGE` if region touches the image edge,
            `IS_TOO_SMALL` if the area is too small,
            `IS_TOO_LARGE` if the area is too large,
            `IS_GOOD` else.
        """
        ret = self.IS_GOOD
        if edges:
            if coords is None:
                coords = props.coords
            if np.any(coords.flat == 0) or np.any(coords[:,0] == self.height-1) or \
                    np.any(coords[:,1] == self.width-1):
                ret |= self.IS_AT_EDGE
        if self.max_size and props.area > self.max_size:
            ret |= self.IS_TOO_LARGE
        if self.min_size and props.area < self.min_size:
            ret |= self.IS_TOO_SMALL
        return ret

    def get_traces(self):
        """Label and track cells.

        This method is intended to be called externally."""
        if self.make_labeled_stack and self.stack_lbl is None:
            self.label_stack()
        if self.props is None:
            self.read_regionprops()
        self.track()
