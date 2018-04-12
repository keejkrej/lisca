#! /usr/bin/env python3
import numpy as np
import scipy.interpolate as si

# Prepare module import
my_id = "image_binarizer"

def register(meta):
    meta.name = "Binarize image"
    meta.id = my_id
    meta.run_dep = ("simple_stack_reader", "", "stack")
    meta.run_ret = "bg"

def configure(**_):
    pass

def run(**d):
    stack = d["simple_stack_reader", "stack"]
    frame = stack.get_image(frame=0, channel=0)
    bg = interpolate_background(frame)
    return {"bg": bg}


# Get number of tiles in both directions
N_TILES_HORIZ = 10
N_TILES_VERT = 8

# Set histgram requirements
HIST_N_BINS = 15
HIST_BREAK_WIDTH = 30
HIST_THRESH = .5

def interpolate_background(frame, n_tiles_horiz=N_TILES_HORIZ, n_tiles_vert=N_TILES_VERT, debug=False):
    """
    Calculate an interpolated background by histogram.

    :param frame: the image whose background is to be estimated
    :type frame: 2D numpy array
    :param n_tiles_horiz: number of tiles in horizontal direction
    :type n_tiles_horiz: int >0
    :param n_tiles_vert: number of tiles in vertical direction
    :type n_tiles_vert: int >0
    :param debug: if ``True``, return dict of internal variables
    :type degub: bool

    :return: interpolated background
    :rtype: same as ``frame``
    """
    # Get frame shape
    n_px_rows, n_px_cols = frame.shape

    # Calculate tile size
    s_tiles_horiz = np.floor(n_px_cols / n_tiles_horiz).astype(np.uint16)
    s_tiles_vert = np.floor(n_px_rows / n_tiles_vert).astype(np.uint16)

    # Calculate tile edges
    tile_edges_horiz = np.array(range(n_tiles_horiz + 1), dtype=np.uint16)
    tile_edges_horiz[:-1] *= s_tiles_horiz
    tile_edges_horiz[-1] = n_px_cols

    tile_edges_vert = np.array(range(n_tiles_vert + 1), dtype=np.uint16)
    tile_edges_vert[:-1] *= s_tiles_vert
    tile_edges_vert[-1] = n_px_rows

    # Calculate tile centers
    tile_centers_horiz = (tile_edges_horiz[:-1] + tile_edges_horiz[1:]) / 2
    tile_centers_vert = (tile_edges_vert[:-1] + tile_edges_vert[1:]) / 2

    if debug:
        print(tile_edges_horiz)
        print(tile_centers_horiz)
        print(tile_edges_vert)
        print(tile_centers_vert)

    # Build array of tile mean values
    tile_values = np.empty((n_tiles_vert, n_tiles_horiz), dtype=np.float_)
    if debug:
        tile_median = np.empty_like(tile_values)

    for iRow in range(n_tiles_vert):
        for iCol in range(n_tiles_horiz):
            # The values of the current tile
            px_vals = frame[tile_edges_vert[iRow]:tile_edges_vert[iRow+1],
                            tile_edges_horiz[iCol]:tile_edges_horiz[iCol+1]]
            if debug:
                tile_median[iRow,iCol] = np.median(px_vals)

            while True:
                # Find highest bin in histogram of tile values
                hist, bin_edges = np.histogram(px_vals, bins=HIST_N_BINS)
                iMax = hist.argmax()

                if debug:
                    print("[{:1d},{:1d}] iMax={:2d}, hist_width={:.3f}".format(iRow, iCol, iMax, bin_edges[iMax+1] - bin_edges[iMax]))

                if bin_edges[iMax+1] - bin_edges[iMax] <= HIST_BREAK_WIDTH:
                    # Bins are small enough
                    break
                elif iMax > 0 and iMax < bin_edges.size-1 and \
                         hist[iMax-1] > hist[iMax] * HIST_THRESH and \
                         hist[iMax+1] > hist[iMax] * HIST_THRESH:
                    # Highest bin is not "suspicious"
                    break
                else:
                    # Histogram is much wider than relevant range;
                    # most frequent values are concentrated in single bin.
                    # Reduce tile values to those in current bin
                    # and recalculate histogram
                    px_vals = px_vals[ (px_vals >= bin_edges[iMax]) & (px_vals < bin_edges[iMax+1]) ]

            #tile_values[iRow,iCol] = (bin_edges[iMax] + bin_edges[iMax+1]) / 2
            tile_values[iRow,iCol] = np.median(px_vals)

    # Reconstruct background by 2D splines
    x_interp = np.array(range(n_px_cols))
    y_interp = np.array(range(n_px_rows))
    bg = si.RectBivariateSpline(tile_centers_horiz,
            tile_centers_vert, tile_values.T, kx=3, ky=3) \
            (x_interp, y_interp, grid=True).T

    if debug:
        ret = {}
        ret['bg'] = bg
        ret['tile_values'] = tile_values
        ret['tile_median'] = tile_median
        ret['tile_centers_horiz'] = tile_centers_horiz
        ret['tile_centers_vert'] = tile_centers_vert
        ret['tile_edges_horiz'] = tile_edges_horiz
        ret['tile_edges_vert'] = tile_edges_vert
        ret['n_tiles_horiz'] = n_tiles_horiz
        ret['n_tiles_vert'] = n_tiles_vert
        ret['x_interp'] = x_interp
        ret['y_interp'] = y_interp
        return ret

    return bg
#bg = frame[frame / spline < 1.1]


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

