import numpy as np
from .base import Roi
from ._contour_aux import CornerFinder


class ContourRoi(Roi):
    @classmethod
    def key(cls):
        return ("raw", "0.1")

    def __init__(self, mask=None, label=None, regionprop=None, lazy=True):
        self.label = None
        self.perimeter_idx = None
        self.corner_idx = None
        if mask is not None and label is not None:
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
        return self.coords[:, 0]

    @property
    def cols(self):
        return self.coords[:, 1]

    def overlap(self, other):
        other_coords = other.coords
        overlap = np.empty(self.area, dtype=np.bool)
        for i, row in enumerate(self.coords):
            overlap[i] = np.any(np.all(row == other_coords, axis=1))
        return self.coords[overlap, :]

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
                vn = np.isin(self.coords[:, 0], np.array([-1, 1]) + row)
                vert_neighbors[row] = vn

            # Get indices of horizontal neighbors (left and right column)
            hn = horz_neighbors.get(col)
            if hn is None:
                hn = np.isin(self.coords[:, 1], np.array([-1, 1]) + col)
                horz_neighbors[col] = hn

            # Get indices of pixels in same row
            rm = row_mates.get(row)
            if rm is None:
                rm = self.coords[:, 0] == row
                row_mates[row] = rm

            # Get indices of pixels in same column
            cm = col_mates.get(col)
            if cm is None:
                cm = self.coords[:, 1] == col
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
        return self.coords[self.perimeter_idx, :]

    @property
    def corners(self):
        """Return the coordinates of the ROI corners."""
        if self.corner_idx is None:
            self.corner_idx = CornerFinder.go(self.perimeter,
                                              indices=True,
                                              simplify=False)
        return self.perimeter[self.corner_idx, :]
