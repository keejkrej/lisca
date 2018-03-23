"""
Calculates the integrated intensity per frame and channel of a stack.
"""
import numpy as np

my_id = "integrated_intensity_calculator"

def register(meta):
    meta.name = "Integrated intensity"
    meta.id = my_id

    meta.run_dep = ("simple_stack_reader", "", "stack")
    meta.run_ret = "integrated_intensity"

def configure(**_):
    pass


def run(**d):
    stack = d["simple_stack_reader"]["stack"]
    img = stack.img
    n_channels, n_frames, _, _ = img.shape
    intensity_table = np.empty((n_channels, n_frames), dtype=object)

    # DEBUG
    print("Frames: {}\nChannels: {}\nInitialized intensity table: {}".format(n_frames, n_channels, str(intensity_table)))

    for c in range(n_channels):
        for f in range(n_frames):
            tab = []
            for rr, cc in stack.rois:
                tab.append(np.sum(img[c,f,rr,cc]))
            intensity_table[c,f] = tab

    # DEBUG
    #print("The integrated intensities:")
    #print(intensity_table)

    return {"integrated_intensity": intensity_table}
