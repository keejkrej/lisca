"""
This plugin measures the time needed for scrolling through
all frames of a stack.
"""
import time

my_id = "frame_change_measurer"

def register(meta):
    meta.name = "Measure frame change time"
    meta.id = my_id
    meta.category = "Test"
    meta.run_dep = ("", "stack"), ("simple_stack_reader", "_StackViewer")


def run(d, *_, **__):
    stack = d[""]["stack"]
    sv = d["simple_stack_reader"]["_StackViewer"]

    # Initialize setup
    n_frames = stack.n_frames
    sv._change_stack_position(i_frame=0)

    # Perform measurement
    n_changes = 0
    t_sum = 0
    print("\nMeasuring frame changes:\n")
    print("\t{:5s} {:10s}".format("frame", "duration"))
    for i_frame in range(1, n_frames):
        t0 = time.perf_counter()
        sv._change_stack_position(i_frame=i_frame)
        t1 = time.perf_counter()

        dt = t1 - t0
        t_sum += dt
        n_changes += 1
        print("\t{:5d} {:10.8f}\n".format(i_frame, dt))
    print("\nTotal: {} frame changes with {:8f} seconds per change on average\n".format(n_changes, t_sum / n_changes))
