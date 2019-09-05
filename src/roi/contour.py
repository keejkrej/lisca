import numpy as np
import skimage.measure as skmeas
import skimage.segmentation as skseg
from .base import Roi
from ._contour_aux import CornerFinder


class ContourRoi(Roi):
    @classmethod
    def key(cls):
        return ("raw", "0.1")

    def __init__(self, mask=None, label=None, regionprop=None, lazy=True,
            color=None, visible=True, name=None, name_visible=True, stroke_width=None):
        self.label = None
        self._perimeter = None
        self._corners = None
        self.color = color
        self.visible = visible
        self.name = name
        self.name_visible = name_visible
        self.stroke_width = stroke_width
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

        self.bbox = np.array((self.rows.min(), self.cols.min(), self.rows.max(), self.cols.max()),
                dtype=[(x, np.int16) for x in ('y_min', 'x_min', 'y_max', 'x_max')])

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

#    def _calculate_perimeter_old(self):
#        """
#        Find the surface pixels, resulting in perimeter of contour.
#
#        ``self.perimeter_idx`` is created as an index array indicating
#        the surface pixels in ``self.coords``.
#        """
#        self.perimeter_idx = np.zeros(self.coords.shape[0], dtype=np.bool)
#        vert_neighbors = {}
#        horz_neighbors = {}
#        row_mates = {}
#        col_mates = {}
#
#        # Decide for each pixel whether it belongs to perimeter
#        for i, (row, col) in enumerate(self.coords):
#            # Get indices of vertical neighbors (upper and lower row)
#            vn = vert_neighbors.get(row)
#            if vn is None:
#                vn = np.isin(self.coords[:, 0], np.array([-1, 1]) + row)
#                vert_neighbors[row] = vn
#
#            # Get indices of horizontal neighbors (left and right column)
#            hn = horz_neighbors.get(col)
#            if hn is None:
#                hn = np.isin(self.coords[:, 1], np.array([-1, 1]) + col)
#                horz_neighbors[col] = hn
#
#            # Get indices of pixels in same row
#            rm = row_mates.get(row)
#            if rm is None:
#                rm = self.coords[:, 0] == row
#                row_mates[row] = rm
#
#            # Get indices of pixels in same column
#            cm = col_mates.get(col)
#            if cm is None:
#                cm = self.coords[:, 1] == col
#                col_mates[col] = cm
#
#            # Count neighbors (surface pixels have less than 4 neighbors)
#            n_neighbors = ((vn & cm) | (hn & rm)).sum()
#            if n_neighbors < 4:
#                self.perimeter_idx[i] = True

    def _calculate_perimeter(self):
        img = np.zeros((self.y_max - self.y_min, self.x_max - self.x_min), dtype=np.bool)
        img[self.rows - self.y_min, self.cols - self.x_min] = True
        img = skseg.find_boundaries(img, mode='inner')
        self._perimeter = np.array(img.nonzero(), dtype=np.int16).T
        self._perimeter += np.array((self.y_min, self.x_min))

    def _find_corners(self):
        img = np.zeros((self.y_max - self.y_min + 3, self.x_max - self.x_min + 3), dtype=np.uint8)
        img[self.rows - self.y_min + 1, self.cols - self.x_min + 1] = 1
        contours = skmeas.find_contours(img, .5)
        self._corners = max(contours, key=lambda c: c.size) + np.array(((self.y_min - 1, self.x_min - 1)))

    @property
    def perimeter(self):
        """Return a list of surface pixel coordinates."""
        if self._perimeter is None:
            self._calculate_perimeter()
        return self._perimeter.copy()

    @property
    def corners(self):
        """Return the coordinates of the ROI corners."""
        if self._corners is None:
            self._find_corners()
        return self._corners.copy()

    @property
    def y_min(self):
        return self.bbox['y_min']

    @property
    def x_min(self):
        return self.bbox['x_min']

    @property
    def y_max(self):
        return self.bbox['y_max']

    @property
    def x_max(self):
        return self.bbox['x_max']
