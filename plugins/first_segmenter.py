#! /usr/bin/env python3
import numpy as np
import scipy.interpolate as si
import scipy.sparse as ssp
import skimage.measure as meas
import skimage.morphology as morph

from segmenter.cornerfinder import CornerFinder
from segmenter import tools

my_id = "first_segmenter"
def register(meta):
    meta.name = "Segment stack (old)"
    meta.id = my_id
    meta.run_dep = ("simple_stack_reader", "stack")

def configure(*_, **__):
    pass

def run(d, *_, **__):
    stack = d["simple_stack_reader"]["stack"]
    for iFr in range(stack.n_frames):
        frame = stack.get_image(frame=iFr, channel=0)
        bg = tools.interpolate_background(frame)
        regions = tools.segment_frame(frame, bg)
        stack.set_rois(regions, "raw", iFr)
        print("first_segmenter: {:4d} ROIs found in frame {:3d}".format(len(regions), iFr))

