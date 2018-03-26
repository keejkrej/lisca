#! /usr/bin/env python3
from matplotlib import pyplot as plt
import numpy as np
import sys

fn = sys.argv[1]

D = np.loadtxt(fn, delimiter=',')
plt.plot(D[:,0], D[:,1:])
plt.xlabel("Time [#]")
plt.ylabel("Fluorescence [a.u.]")
plt.title(fn)
plt.show()
