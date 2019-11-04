import numpy as np
import skimage.measure as skmeas
import skimage.segmentation as skseg
from .base import Roi
from ._aux_find_corners import find_corners
from ._aux_find_perimeter import find_perimeter


class ContourRoi(Roi):
    @classmethod
    def key(cls):
        return ("raw", "0.1")

    def __init__(self, mask=None, label=None, coords=None, regionprop=None, lazy=True,
            color=None, visible=True, name=None, name_visible=True, stroke_width=None, frame=None):
        self.label = None
        self._perimeter = None
        self._corners = None
        self._contour = None
        self._centroid = None
        self.color = color
        self.visible = visible
        self.name = name
        self.name_visible = name_visible
        self.stroke_width = stroke_width
        self.frame = frame
        if regionprop is None and label is not None:
            self.label = label
            if mask is not None:
                self.coords = np.array((mask == label).nonzero()).T
            elif coords is not None:
                self.coords = coords
            else:
                raise ValueError("Illegal arguments")
            self.area = self.rows.size

        elif regionprop is not None:
            if label is not None:
                self.label = label
            else:
                self.label = regionprop.label
            self.area = regionprop.area
            self.coords = regionprop.coords

        else:
            raise ValueError("Illegal arguments")

        self.bbox = np.array((self.rows.min(), self.cols.min(), self.rows.max(), self.cols.max()),
                dtype=[(x, np.int16) for x in ('y_min', 'x_min', 'y_max', 'x_max')])

        if not lazy:
            self.perimeter
            self.corners
            self.contour
            self.centroid

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
        img = np.zeros((self.y_max - self.y_min + 1, self.x_max - self.x_min + 1), dtype=np.bool_)
        img[self.rows - self.y_min, self.cols - self.x_min] = True
        self._perimeter = find_perimeter(img) + np.array(((self.y_min, self.x_min)))

    def _find_corners(self):
        img = np.zeros((self.y_max - self.y_min + 1, self.x_max - self.x_min + 1), dtype=np.bool_)
        img[self.rows - self.y_min, self.cols - self.x_min] = True
        self._corners = find_corners(img) + np.array(((self.y_min, self.x_min)))

    def _find_contour(self):
        img = np.zeros((self.y_max - self.y_min + 3, self.x_max - self.x_min + 3), dtype=np.uint8)
        img[self.rows - self.y_min + 1, self.cols - self.x_min + 1] = 1
        contours = skmeas.find_contours(img, .5, fully_connected='high')
        self._contour = max(contours, key=lambda c: c.size) + np.array(((self.y_min - 1, self.x_min - 1)))

    @property
    def perimeter(self):
        """Return the surrounding polygon.

        The returned coordinates correspond to the vertices of a polygon
        surrounding the ROI like a rubberband, i.e. the coordinates do
        not correspond to pixel centers, but to the edges between pixels.

        These values can be used to reconstruct the ROI coordinates with
        the function skimage.draw.polygon, and to export the ROI in the
        format required by ImageJ.

        See also: ContourRoi.corners, ContourRoi.contour
        """
        if self._perimeter is None:
            self._calculate_perimeter()
        return self._perimeter.copy()

    @property
    def corners(self):
        """Return the coordinates of the ROI corners.

        The returned coordinates correspond to the pixel centers
        of the corner pixels of the ROI. Connecting the coordinates
        in the returned order with straight lines gives the
        outermost pixels of the ROI.

        See also: ContourRoi.perimeter, ContourRoi.contour
        """
        if self._corners is None:
            self._find_corners()
        return self._corners.copy()

    @property
    def contour(self):
        """Return the coordinates of the ROI contour polygon corners.

        The returned coordinates should only be used for illustrating the ROI outline.
        The coordinates are multiples of 0.5, indicating spaces between pixels.

        For exact contours, see: ContourRoi.perimeter, ContourRoi.corners
        """
        if self._contour is None:
            self._find_contour()
        return self._contour.copy()

    @property
    def centroid(self):
        """Return centroid of the ROI"""
        if self._centroid is None:
            self._centroid = np.array([self.rows.mean(), self.cols.mean()])
        return self._centroid.copy()

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
