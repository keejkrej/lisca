"""
Plugin to save intensity to CSV.
"""
import numpy as np
import os
import sys
import time

my_id = "simple_intensity_to_CSV_saver"

def register(meta):
    meta.name = "Save intensity to CSV"
    meta.id = my_id

    #meta.conf_dep = ("", "workflow_gui_tk")
    meta.conf_ret = "_path"
    meta.run_dep = (
            ("", "integrated_intensity"),
            (my_id, "_path"),
        )


def conf(d, *_, **__):
    path = os.path.join(os.getcwd(), "out")

    if not os.path.isdir(path):
        try:
            os.mkdir(path)
        except Exception as e:
            print("Cannot create directory: {}".format(e))

    return {"_path": path}


def run(d, *_, **__):
    path = d[my_id]["_path"]
    intensities = d[""]["integrated_intensity"]
    n_channels, n_frames = intensities.shape
    for iCh in range(n_channels):
        int_tab = np.empty((n_frames, 1 + len(intensities[iCh, 0])))
        int_tab[:,0] = range(n_frames)
        for iFr in range(n_frames):
            for idx, entry in enumerate(intensities[iCh,iFr]):
                if idx+1 >= int_tab.shape[1]:
                    print("Found {} ROIs in frame {}, expected {}, ignoring rest.".format(len(intensities[iCh,0]), iFr, int_tab.shape[1])) #DEBUG
                    break
                int_tab[iFr, idx+1] = entry
        outname = os.path.join(path, "integ_intensity_c{:d}_{}.csv".format(iCh+1, time.strftime("%Y%m%d-%H%M%S")))
        np.savetxt(outname, int_tab, fmt='%.7e', delimiter=',')
        print("Saved intensities to: {}".format(outname))

