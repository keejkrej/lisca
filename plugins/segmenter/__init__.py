from . import tools

my_id = "stack_segmenter"
__version__ = "0.1"


def register(meta):
    meta.name = "Segment stack"
    meta.id = my_id
    meta.run_dep = ("", "stack")


def run(d, *_, **__):
    stack = d[""]["stack"]
    for iFr in range(stack.n_frames):
        frame = stack.get_image(frame=iFr, channel=0)
#        bg = tools.interpolate_background(frame)
#        regions = tools.segment_frame(frame, bg)
        regions = tools.get_regions(frame)
        stack.set_rois(regions, iFr)
        print(f"{my_id}: {len(regions) :4d} ROIs found in frame {iFr :3d}")


