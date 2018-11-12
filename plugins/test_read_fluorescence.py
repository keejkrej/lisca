from segmenter import tools

my_id = "test:read_fluorescence"
__version__ = "0.1"

def register(meta):
    meta.id = my_id
    meta.name = "Stack loop"
    meta.category = "Test"

    #meta.run_dep = "simple_stack_reader", "stack"
    meta.run_ret = "i_frame", "i_channel"

    loop_dependencies = ((my_id, ("_i_frame", "_i_channel")),
                        ("", "stack"))

    meta.set_fun("loop_first", loop_next)
    meta.set_ret("loop_first", ("_i_frame", "_i_channel"))
    meta.set_dep("loop_first", loop_dependencies)

    meta.set_ret("loop_next", ("_i_frame", "_i_channel"))
    meta.set_dep("loop_next", loop_dependencies)

    meta.set_dep("loop_end", loop_dependencies)


def run(_):
    return {"_i_frame": 0, "_i_channel": -1}


def loop_next(d):
    i_channel = d[my_id]["_i_channel"]
    i_frame = d[my_id]["_i_frame"]
    stack = d[""]["stack"]

    i_channel += 1
    if i_channel >= stack.n_channels:
        i_channel = 0
        i_frame += 1
        if i_frame >= stack.n_frames:
            raise StopIteration

    print("Getting stack")
    frame = stack.get_image(frame=i_frame, channel=i_channel)
    print("Interpolating")
    bg = tools.interpolate_background(frame)
    print("Segmenting")
    regions = tools.segment_frame(frame, bg)
    print("Setting ROIs")
    stack.set_rois(regions, "raw", i_frame)
    print(f"{my_id}.loop_next: frame={i_frame} channel={i_channel}")

    return {"_i_channel": i_channel, "_i_frame": i_frame}


def loop_end(d):
    print(f"{my_id}.loop_end: iterated over {d[my_id]['_i_frame']} frames.")
