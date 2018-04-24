#! /usr/bin/env python3
import os
import sys
this_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(this_dir, "../src/")
sys.path.append(src_dir)
from cornerfinder import CornerFinder
import numpy as np
import scipy.interpolate as si
import scipy.sparse as ssp
import skimage.measure as meas
import skimage.morphology as morph


my_id = "simple_segmenter"
def register(meta):
    meta.name = "Segment stack"
    meta.id = my_id
    meta.run_dep = ("simple_stack_reader", "stack")

def configure(*_, **__):
    pass

def run(d, *_, **__):
    stack = d["simple_stack_reader"]["stack"]
    for iFr in range(stack.n_frames):
        frame = stack.get_image(frame=iFr, channel=0)
        bg = interpolate_background(frame)
        regions = segment_frame(frame, bg)
        stack.set_rois(regions, "raw", iFr)
        print("simple_segmenter: {:4d} ROIs found in frame {:3d}".format(len(regions), iFr))

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


class Contour:
    def __init__(self, mask=None, label=None, regionprop=None, lazy=True):
        self.label = None
        self.perimeter_idx = None
        self.corner_idx = None
        if mask is not None and lbl is not None:
            self.label = label
            self.coords = np.array((mask == label).nonzero()).T
            self.area = self.rows.size
            self.centroid = np.array([self.rows.mean(), self.cols.mean()])

        elif regionprop is not None:
            if label is not None:
                self.label = label
            else:
                self.label = regionprop.label
            self.area = regionprop.area
            self.coords = regionprop.coords
            self.centroid = np.array(regionprop.centroid)

        else:
            raise ValueError("Illegal arguments")

        if not lazy:
            self.corners

    @classmethod
    def from_regionprops(cls, regionprops, lazy=True):
        return [cls(regionprop=rp, lazy=lazy) for rp in regionprops]

    @property
    def rows(self):
        return self.coords[:,0]

    @property
    def cols(self):
        return self.coords[:,1]

    def overlap(self, other):
        other_coords = other.coords
        overlap = np.empty(self.area, dtype=np.bool)
        for i, row in enumerate(self.coords):
            overlap[i] = np.any(np.all(row == other_coords, axis=1))
        return self.coords[overlap,:]

    def _calculate_perimeter(self):
        """
        Find the surface pixels, resulting in perimeter of contour.
        
        ``self.perimeter_idx`` is created as an index array indicating
        the surface pixels in ``self.coords``.
        """
        self.perimeter_idx = np.zeros(self.coords.shape[0], dtype=np.bool)
        vert_neighbors = {}
        horz_neighbors = {}
        row_mates = {}
        col_mates = {}

        # Decide for each pixel whether it belongs to perimeter
        for i, (row, col) in enumerate(self.coords):
            # Get indices of vertical neighbors (upper and lower row)
            vn = vert_neighbors.get(row)
            if vn is None:
                vn = np.isin(self.coords[:,0], np.array([-1,1]) + row)
                vert_neighbors[row] = vn

            # Get indices of horizontal neighbors (left and right column)
            hn = horz_neighbors.get(col)
            if hn is None:
                hn = np.isin(self.coords[:,1], np.array([-1,1]) + col)
                horz_neighbors[col] = hn

            # Get indices of pixels in same row
            rm = row_mates.get(row)
            if rm is None:
                rm = self.coords[:,0] == row
                row_mates[row] = rm

            # Get indices of pixels in same column
            cm = col_mates.get(col)
            if cm is None:
                cm = self.coords[:,1] == col
                col_mates[col] = cm

            # Count neighbors (surface pixels have less than 4 neighbors)
            n_neighbors = ((vn & cm) | (hn & rm)).sum()
            if n_neighbors < 4:
                self.perimeter_idx[i] = True

    @property
    def perimeter(self):
        """Return a list of surface pixel coordinates."""
        if self.perimeter_idx is None:
            self._calculate_perimeter()
        return self.coords[self.perimeter_idx,:]


    @property
    def corners(self):
        """Return the coordinates of the ROI corners."""
        if self.corner_idx is None:
            self.corner_idx = CornerFinder.go(self.perimeter, indices=True, simplify=False)
        return self.perimeter[self.corner_idx,:]


def segment_frame(frame, bg, conn=2, cell_threshold=1.1):
    if conn == 1 or conn == 2:
        pass
    elif conn == 4:
        conn = 1
    elif conn == 8:
        conn = 2
    else:
        conn = 2

    # Make mask
    mask = frame / bg >= cell_threshold
    
    # Smoothen mask (first erode, then dilate with circle)
    mask = morph.binary_erosion(mask)
    selem_dil = np.ones((5,5), dtype=np.bool)
    selem_dil[0,0] = 0
    selem_dil[0,-1] = 0
    selem_dil[-1,0] = 0
    selem_dil[-1,-1] = 0
    mask = morph.binary_dilation(mask, selem=selem_dil)

    # Find clusters
    mask = meas.label(mask, connectivity=conn, return_num=False)
    regions = Contour.from_regionprops(meas.regionprops(mask), lazy=False)
    return regions


if __name__ == "__main__":
    # Additional imports
    import tkinter as tk
    from stackviewer_tk import StackViewer
    from stack import Stack

    # Open test stack
    tiff_path = os.path.join(this_dir, "../res/", "Test_Pos7_t85.tif")
    s = Stack(tiff_path)

    # For each frame in test stack, find ROIs
    for iFr in range(s.n_frames):
        frame = s.get_image(frame=iFr, channel=0)
        bg = interpolate_background(frame)
        regions = segment_frame(frame, bg)
        s.set_rois(regions, "raw", iFr)
        print("simple_segmenter: {:4d} ROIs found in frame {:3d}".format(len(regions), iFr))

    # Get ROI corners
    rois = s.get_rois(frame=0)
    r = rois._roi_arr[0]
    rc = r.corners
    print("Corners:")
    print(rc)
    #print(CornerFinder.go(rc))

    # Display stack with ROIs
    root = tk.Tk()
    sv = StackViewer(root)
    sv.set_stack(s)

    # Display isolated ROI
    tl = tk.Toplevel(root)
    cnv = tk.Canvas(tl, highlightthickness=0, background="white")
    cnv.pack()

    scale = 4
    for y, x in (rc - rc.min(axis=0)):
        cnv.create_rectangle(x*scale, y*scale, (x+1)*scale, (y+1)*scale, 
            fill="black", outline="black")
        
    # Tk mainloop
    root.mainloop()
