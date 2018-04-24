"""
Plugin to save intensity to CSV.
"""
import numpy as np
import os
import sys

my_id = "simple_intensity_to_CSV_saver"
path = None

def register(meta):
    meta.name = "Save intensity to CSV"
    meta.id = my_id

    #meta.conf_dep = ("", "workflow_gui_tk")
    meta.conf_ret = "path"
    meta.run_dep = (
            ("integrated_intensity_calculator", "integrated_intensity"),
        )


def configure(d, *_, **__):
    #gui = d[""]["workflow_gui_tk"]
    #path = gui.askdirectory()
    #path = gui.asksaveasfilename()

    global path
    path = os.path.join(os.getcwd(), "out")

    if not os.path.isdir(path):
        try:
            os.mkdir(path)
        except Exception as e:
            print("Cannot create directory: {}".format(e))


def run(d, *_, **__):
    global path
    intensities = d["integrated_intensity_calculator"]["integrated_intensity"]
    n_channels, n_frames = intensities.shape
    for iCh in range(n_channels):
        int_tab = np.empty((n_frames, 1 + len(intensities[iCh, 0])))
        int_tab[:,0] = range(n_frames)
        for iFr in range(n_frames):
            for idx, entry in enumerate(intensities[iCh,iFr]):
                int_tab[iFr, idx+1] = entry
        outname = os.path.join(path, "integ_intensity_{:d}.csv".format(iCh+1))
        np.savetxt(outname, int_tab, fmt='%.7e', delimiter=',')
        print("Saved intensities to: {}".format(outname))

