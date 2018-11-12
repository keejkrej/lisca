#! /usr/bin/env python3
import numpy as np
from segmenter.tools import interpolate_background

# Prepare module import
my_id = "frame_binarizer"

def register(meta):
    meta.name = "Binarize frame"
    meta.id = my_id
    meta.run_dep = ("", "stack")
    meta.run_ret = ("background",)

#def configure(*_, **__):
#    pass

def run(d, *_, **__):
    stack = d[""]["stack"]
    frame = stack.get_image(frame=0, channel=0)
    bg = interpolate_background(frame)
    return {"background": bg}


if __name__ == "__main__":
    import matplotlib.pyplot as plt
    from mpl_toolkits.mplot3d import Axes3D
    from src.stack import Stack
    import sys

    # Get a frame
    fn = sys.argv[1]
    stack = Stack(fn)
    frame = stack.get_image(frame=0, channel=0)

    # Perform background interpolation
    d = interpolate_background(frame, debug=True)
    n_tiles_horiz = d['n_tiles_horiz']
    n_tiles_vert = d['n_tiles_vert']
    tile_values = d['tile_values']
    tile_centers_horiz = d['tile_centers_horiz']
    tile_centers_vert = d['tile_centers_vert']
    tile_median = d['tile_median']
    x_interp = d['x_interp']
    y_interp = d['y_interp']
    bg_interp = d['bg']

    # Plot result
    f, ax = plt.subplots(subplot_kw={'projection': '3d'})
    x_plot1 = np.empty(tile_values.size, dtype=np.uint16)
    y_plot1 = np.empty(tile_values.size, dtype=np.uint16)
    z_plot1 = np.empty(tile_values.size)

    # Scatter plot of tile medians
    for iRow in range(n_tiles_vert):
        for iCol in range(n_tiles_horiz):
            iFlat = iRow * n_tiles_horiz + iCol
            x_plot1[iFlat] = tile_centers_horiz[iCol]
            y_plot1[iFlat] = tile_centers_vert[iRow]
            z_plot1[iFlat] = tile_median[iRow, iCol]
    ax.scatter(x_plot1, y_plot1, z_plot1, color='r')

    # Surface plot of interpolated background
    x_plot2, y_plot2 = np.meshgrid(x_interp, y_interp, indexing='xy')
    ax.plot_surface(x_plot2, y_plot2, bg_interp, cmap=plt.cm.viridis)

    ax.invert_yaxis()
    ax.set_xlabel("Horizontal direction")
    ax.set_ylabel("Vertical direction")
    ax.set_zlabel("Tile value")
    plt.show(f)

