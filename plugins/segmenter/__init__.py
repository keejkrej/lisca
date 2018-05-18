from . import tools

my_id = "simple_segmenter"
def register(meta, more_meta):
    meta.name = "Segment stack"
    meta.id = my_id
    meta.run_dep = ("simple_stack_reader", "stack")

    more_meta.meta.name = "Test-Hallo"
    more_meta.meta.id = "test:hallo2"
    more_meta.meta.category = "Test"
    more_meta.meta.set_fun("conf", hallo_c)
    more_meta.meta.set_fun("run", hallo_r)


def run(d, *_, **__):
    stack = d["simple_stack_reader"]["stack"]
    for iFr in range(stack.n_frames):
        frame = stack.get_image(frame=iFr, channel=0)
        bg = tools.interpolate_background(frame)
        regions = tools.segment_frame(frame, bg)
        stack.set_rois(regions, "raw", iFr)
        print("simple_segmenter: {:4d} ROIs found in frame {:3d}".format(len(regions), iFr))


def hallo_c(_):
    print("Hallo (c)")

def hallo_r(_):
    print("Hallo (r)")
