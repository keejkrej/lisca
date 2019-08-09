#!/usr/bin/env python3
"""
Plugin to load saved grid parameters 
"""


from .. import gui_tk
from ..roi.collection import RoiCollection
from ..roi.rect import RectRoi
from ..roi.contour import ContourRoi

import os
import sys
import time
import json


my_id = "grid_loader"

def register(meta):
    meta.name = "Load grid from JSON"
    meta.id = my_id
    meta.conf_ret = "_path"
    meta.run_dep = (
            ("", "stack"),
            (my_id, "_path"),
        )
#    meta.run_ret = ("stack", "_StackViewer")

    
def conf(d, *_, **__):
    print("Configuring 'grid_loader'...")
    f = gui_tk.askopenfilename(parent=gui_tk.root)
    print(f)
    return {"_path": f}


def run(d, *_, **__):
    print("Running 'grid_loader'...")
    path = d[my_id]["_path"]
#    grids = d[""]["stack"].rois
    s = d[""]["stack"]
#    print(path)
    with open(path,"r") as f:
        loaded = json.load(f)
    newkey = (loaded[0]["Type"],loaded[0]["Version"])
    newparam = loaded[0]["parameters"]
#    newins = RoiCollection(key=newkey, type_=newkey[0], version=newkey[1], parameters=newparam, name="RectRoi",color="yellow")
    
    roilist = []
    for i in range(len(loaded[0]["rois"]["Ellipsis"])):
        roilist.append(RectRoi(loaded[0]["rois"]["Ellipsis"]["None_%s"%(i+1)], newparam, inverted=True))
#    elif newkey[0] == "raw":
#        newins.add(1,roilist)
#        ContourRoi(mask=None, label=None, regionprop=None, lazy=False)
    newins = RoiCollection(key=newkey, type_=newkey[0], version=newkey[1], parameters=newparam, name="RectRoi",color="yellow")
    newins[Ellipsis]=roilist
    newins.parameters = newparam
    s.new_roi_collection(newins)
#    sv2 = StackViewer._update_stack_properties
#    print(roilist)


