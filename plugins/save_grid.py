#!/usr/bin/env python3
"""
Plugin to save grid parameters 
"""


import numpy as np
import os
import sys
import time
import json 

from ..roi import RectRoi
from ..roi import ContourRoi


my_id = "grid_to_json_saver"

def register(meta):
    meta.name = "Save grid to JSON"
    meta.id = my_id

    #meta.conf_dep = ("", "workflow_gui_tk")
    meta.conf_ret = "_path"
    meta.run_dep = (
            ("", "stack"),
            (my_id, "_path"),
        )

def conf(d, *_, **__):
    path = os.path.join(os.getcwd(), "out" , "grid_out")

    if not os.path.isdir(path):
        try:
            os.mkdir(path)
        except Exception as e:
            print("Cannot create directory: {}".format(e))

    return {"_path": path}



def run(d, *_, **__):
    path = d[my_id]["_path"]
    grids = d[""]["stack"].rois
    jsonarr = []
    '''
    The desired structure of json file for the grids is an array consisting of several objects identified by the key (tuple of type and version of grid).
    The ROIs are dictionary with the frame number as keys and each of this frame key is associated with another dictionary with the corners of the ROI.
    '''
    for key in grids:
        if key == RectRoi.key():
            framedict = {}
            for frame in grids[key]:
                corndict = {}
                num = 1
                for i in grids[key][frame]:
                    params = i.props
                    corns=i.corners.tolist()
                    lab = i.label
                    corndict["%s_%s"%(lab,num)] = corns
                    num = num + 1
                framedict["%s"%(frame)] = corndict
                jsonarr.append(json.loads(json.dumps({"Type":key[0],"Version":key[1],"parameters":params,"rois":framedict}, sort_keys=False, indent=4, separators=(',', ':'))))
        elif key == ContourRoi.key():
            framedict2 = {}
            for frame in grids[key]:
                corndict2 = {}
                num2 = 1
                for i in grids[key][frame]:
                    corns=i.corners.tolist()
                    lab = i.label
                    corndict2["%s_%s"%(lab,num2)] = corns
                    num2 = num2 + 1
                framedict2["%s"%(frame)] = corndict2
                jsonarr.append(json.loads(json.dumps({"Type":key[0],"Version":key[1],"rois":framedict2}, sort_keys=False, indent=4, separators=(',', ':'))))
        else:
            raise TypeError("incompatible ROI type")
    with open(os.path.join(path,"grid_out_{}.json".format(time.strftime("%d%m%Y-%H%M%S"))),"a") as f:
        f.write(json.dumps(jsonarr, indent=4, sort_keys=False))


