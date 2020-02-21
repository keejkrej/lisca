import pickle
import numpy as np

def get_selected_bboxes(session, filename):
    """Create a dict of bboxes of all cells"""
    selected_traces = {}
    with session.lock:
        for name, tr in session.traces.items():
            if not tr['select']:
                continue
            x_min = None
            x_max = None
            y_min = None
            y_max = None
            for fr, roi in enumerate(tr['roi']):
                bb = session.rois[fr][roi].bbox
                if x_min is None or bb.x_min < x_min:
                    x_min = bb.x_min
                if x_max is None or bb.x_max > x_max:
                    x_max = bb.x_max
                if y_min is None or bb.y_min < y_min:
                    y_min = bb.y_min
                if y_max is None or bb.y_max > y_max:
                    y_max = bb.y_max
            selected_traces[name] = dict(x_min=x_min, x_max=x_max, y_min=y_min, y_max=y_max)
    with open(filename, 'wb') as f:
        pickle.dump(selected_traces, f)
    print(f"{len(selected_traces)} bounding boxes written to {filename}")

