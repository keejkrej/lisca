#! /usr/bin/env python3
import tkinter as tk
import os
import sys
this_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(this_dir, "../../src/")
sys.path.append(src_dir)
from stackviewer_tk import StackViewer
from stack import Stack

from . import tools

# Open test stack
tiff_path = os.path.join(this_dir, "../../res/", "Test_Pos7_t85.tif")
s = Stack(tiff_path)

# For each frame in test stack, find ROIs
for iFr in range(s.n_frames):
    frame = s.get_image(frame=iFr, channel=0)
    bg = tools.interpolate_background(frame)
    regions = tools.segment_frame(frame, bg)
    s.set_rois(regions, "raw", iFr)
    print("simple_segmenter: {:4d} ROIs found in frame {:3d}".format(len(regions), iFr))

# Get ROI corners
rois = s.get_rois(frame=0)
r = rois._roi_arr[0]
rc = r.corners
print("Corners:")
print(rc)
#print(CornerFinder.go(rc))

# Display stack with ROIs
root = tk.Tk()
sv = StackViewer(root)
sv.set_stack(s)

# Display isolated ROI
tl = tk.Toplevel(root)
cnv = tk.Canvas(tl, highlightthickness=0, background="white")
cnv.pack()

scale = 4
for y, x in (rc - rc.min(axis=0)):
    cnv.create_rectangle(x*scale, y*scale, (x+1)*scale, (y+1)*scale, 
        fill="black", outline="black")
    
# Tk mainloop
root.mainloop()
