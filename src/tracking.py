import numpy as np
import skimage.measure as skmeas

from .stack import Stack

class Tracker:
    """Performs tracking in multithreaded fashion.
    
    Constructor arguments:
        segmented_stack -- a Stack with segmented cells
        labeles_stack -- a Stack with each cell having a unique label (per frame)
    In both cases, background is 0.
    Only one of both arguments needs be given.
    The labeled stack can be created using `Tracker.label`.
    """
    def __init__(self, segmented_stack=None, labeled_stack=None, min_size=100, max_size=20000):
        self.stack_seg = segmented_stack
        self.stack_lbl = labeled_stack
        self.progress_fcn = None
        self.min_size = min_size
        self.max_size = max_size
        self.props = None
        self.traces = None

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
        # `last_idx` maps the labels of the cells in the last iteration to an index in `traces`.
        traces = []
        last_idx = {}

        # Initialization for first frame
        for p in self.props[0].values():
            if self._check_props(p):
                last_idx[p.label] = len(traces)
                traces.append([p.label])

        # Track further frames
        for fr in range(1, self.stack_lbl.n_frames):
            new_idx = {}
            for p in self.props[fr].values():
                ck = self._check_props(p)
                if ck is None:
                    continue

                # Compare with regions of previous frame
                # Check bounding boxes and then coordinates for overlap.
                # Then check if parent is valid (area, edge).
                min_y, min_x, max_y, max_x = p.bbox
                parents = []
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

                    q_isvalid = self._check_props(q)
                    if q_isvalid is None:
                        parents.append(dict(label=q.label, small=True, area=q.area))
                    elif q_isvalid is False:
                        parents.clear()
                        break
                    else:
                        parents.insert(0, dict(label=q.label, small=False))

                # Check for parents
                if not parents:
                    continue
                elif len(parents) == 1:
                    parent = parents[0]['label']
                elif parents[0]['small']:
                    parent = max(parents, key=lambda q: q['area'])['label']
                elif parents[1]['small']:
                    parent = parents[0]['label']
                else:
                    continue
                if parent not in last_idx:
                    continue

                # Register this region as child of parent
                parent_idx = last_idx[parent]
                new_idx[p.label] = parent_idx
                traces[parent_idx].append(p.label)
            last_idx = new_idx

        # Clean up cells
        n_frames = self.stack_lbl.n_frames
        self.traces = [trace for trace in traces if len(trace) == n_frames]

    def _check_props(self, props, edges=True):
        """Check if given regionprops are valid.

        Arguments:
            edges -- if `True`, must not touch image borders

        Returns:
            `True` if regionprops are valid,
            `None` if only the area is too small and
            `False` else.
        """
        if self.max_size and props.area > self.max_size:
            return False
        elif edges:
            coords = props.coords
            if np.any(coords.flat == 0) or np.any(coords[:,0] == self.stack_lbl.height-1) or \
                    np.any(coords[:,1] == self.stack_lbl.width-1):
                return False
        elif self.min_size and props.area < self.min_size:
            return None
        return True

    def get_traces(self):
        """Label and track cells.

        This method is intended to be called externally."""
        if self.stack_lbl is None:
            self.label()
        if self.props is None:
            self.read_regionprops()
        self.track()
