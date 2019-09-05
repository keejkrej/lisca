#! /usr/bin/env python3
import tkinter as tk
import os
import sys

print("Due to changes to the $PYTHONPATH, this file may not work any more.", file=sys.stderr)

this_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(this_dir, "..", "..", "src")
sys.path.append(src_dir)
from stackviewer_tk import StackViewer
from stack import Stack

import tools


# Open stack
try:
    tiff_path = sys.argv[1]
except IndexError:
    raise RuntimeError("No filename given")
s = Stack(tiff_path)


# For each frame in test stack, find ROIs
roi_key = None
for iFr in range(s.n_frames):
    frame = s.get_image(frame=iFr, channel=0)
#    bg = tools.interpolate_background(frame)
#    regions = tools.segment_frame(frame, bg)
    regions = tools.get_regions(frame)
    if roi_key is None:
        roi_key = regions[0].key()
    s.set_rois(regions, iFr)
    print("simple_segmenter: {:4d} ROIs found in frame {:3d}".format(len(regions), iFr))

# Get ROI corners
if roi_key is None:
    print("No ROIs found.")
else:
    rois = s.get_rois(roi_key, frame=0)
    print("Corners:")
    for r in rois:
        print(r.corners)
    #print(CornerFinder.go(rc))

# Display stack with ROIs
root = tk.Tk()
sv = StackViewer(root)
sv.set_stack(s)

## Display isolated ROI
#tl = tk.Toplevel(root)
#cnv = tk.Canvas(tl, highlightthickness=0, background="white")
#cnv.pack()
#
#scale = 4
#for y, x in (rc - rc.min(axis=0)):
#    cnv.create_rectangle(x*scale, y*scale, (x+1)*scale, (y+1)*scale,
#                         fill="black", outline="black")

# Tk mainloop
root.mainloop()
