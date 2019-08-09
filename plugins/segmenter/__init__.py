from . import tools
from ...roi import RoiCollection, ContourRoi

my_id = "stack_segmenter"
__version__ = "0.1"


def register(meta):
    meta.name = "Segment stack"
    meta.id = my_id
    meta.run_dep = ("", "stack")


def run(d, *_, **__):
    stack = d[""]["stack"]
    roicol = RoiCollection(key=ContourRoi.key(),
                           name="ContourRoi",
                           color="red")
    stack.new_roi_collection(roicol)
    for iFr in range(stack.n_frames):
        frame = stack.get_image(frame=iFr, channel=0)
        regions = tools.get_regions(frame)
        roicol[iFr] = regions
        print(f"{my_id}: {len(regions) :4d} ROIs found in frame {iFr :3d}")
