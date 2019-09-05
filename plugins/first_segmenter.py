#! /usr/bin/env python3
#print("__name__ of 'first_segmenter':", __name__) #DEBUG
from .segmenter import tools

my_id = "first_segmenter"


def register(meta):
    meta.name = "Segment stack (old)"
    meta.id = my_id
    meta.run_dep = ("", "stack")


def conf(*_, **__):
    pass


def run(d, *_, **__):
    stack = d[""]["stack"]
    for iFr in range(stack.n_frames):
        frame = stack.get_image(frame=iFr, channel=0)
        bg = tools.interpolate_background(frame)
        regions = tools.segment_frame(frame, bg)
        stack.set_rois(regions, "raw", iFr)
        print(f"{my_id}: {len(regions) :4d} ROIs found in frame {iFr :3d}")
