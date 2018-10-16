#! /usr/bin/env python3
from matplotlib import pyplot as plt
import numpy as np
import os
import sys
import time

fn = sys.argv[1]

D = np.loadtxt(fn, delimiter=',')
fig, ax = plt.subplots()
ax.plot(D[:,0], D[:,1:])
ax.set_xlabel("Time [#]")
ax.set_ylabel("Fluorescence [a.u.]")
ax.set_title(fn)

plt.show(fig)
fig.savefig(os.path.join("out", "intensity_{}.pdf".format(time.strftime("%Y%m%d-%H%M%S"))))
