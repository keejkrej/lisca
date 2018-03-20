"""
This plugin implements functionality to select ROIs in a stack.
"""
import numpy as np

SELECTION_OFF = 0
SELECTION_ANCHOR = 1
SELECTION_TILT = 2
SELECTION_RECT = 3
SELECTION_SPACE = 4

ROI_TYPE_RECT = 0
ROI_TYPE_SQU = 1 

class RoiReader:
    def __init__(self, sv):
        self.sv = sv
        self.canvas = self.sv.canvas
        sv.toggle_selection = self.toggle_selection

        # Configure selection
        self.sel_state = 0
        self.sel_coords = {}
        self.roi_type = ROI_TYPE_RECT

    def toggle_selection(self, *_):
        # Get current selection mode
        if self.sel_state:
            self.control_selection(target=SELECTION_OFF)
        else:
            self.control_selection(target=SELECTION_ANCHOR)

    def update_selection_button(self):
        if self.sel_state:
            self.sv.select_button.config(text="Leave selection mode")
        else:
            self.sv.select_button.config(text="Select")


    def control_selection(self, target):
        # By default, toggle selection mode
        #target = SELECTION_OFF if self.sel_state else SELECTION_ANCHOR
        self.sel_state = target
        self.update_selection_button()

        if self.sel_state == SELECTION_ANCHOR:
            self.canvas.delete("roi")
            self.canvas.bind("<Button-1>", self.canvas_clicked)
        elif self.sel_state == SELECTION_TILT:
            self.canvas.bind("<Motion>", self.canvas_moved)
        elif self.sel_state == SELECTION_RECT:
            pass
        elif self.sel_state == SELECTION_SPACE:
            pass
        else:
            self.canvas.unbind("<Button-1>")
            self.canvas.unbind("<Motion>")

    def canvas_clicked(self, evt):
        if self.sel_state == SELECTION_ANCHOR:
            self.sel_coords['x0'] = evt.x
            self.sel_coords['y0'] = evt.y
            self.control_selection(SELECTION_TILT)

        elif self.sel_state == SELECTION_TILT:
            # Clear rules
            self.canvas.delete("rule")
            self.control_selection(SELECTION_RECT)

        elif self.sel_state == SELECTION_RECT:
            #del self.sel_coords['x0']
            #del self.sel_coords['y0']

            # Sort polygon corners (clockwise from 0=top left)
            p = self.sel_coords['polygon']

            psi = p[:,0].argsort()
            if p[psi[0],1] > p[psi[1],1]:
                psi[[0,1]] = psi[[1,0]]
            if p[psi[2],1] < p[psi[3],1]:
                psi[[2,3]] = psi[[3,2]]

            p_new = np.empty_like(p)
            p_new[0,:] = p[psi[1]]
            p_new[1,:] = p[psi[2]]
            p_new[2,:] = p[psi[3]]
            p_new[3,:] = p[psi[0]]

            self.sel_coords['polygon'] = p_new

            self.control_selection(SELECTION_SPACE)

        elif self.sel_state == SELECTION_SPACE:
            self.control_selection(SELECTION_OFF)

        else:
            self.control_selection(SELECTION_OFF)
  

    def canvas_moved(self, evt):
        if self.sel_state == SELECTION_TILT: 
            # Clear rules
            self.canvas.delete("rule")

            # Get coordinates
            height = self.canvas.winfo_height()
            width = self.canvas.winfo_width()
            x0 = self.sel_coords['x0']
            y0 = self.sel_coords['y0']
            x1 = evt.x
            y1 = evt.y

            # Calculate new rules
            dx = x1 - x0
            dy = y1 - y0

            # Naming: [se][12][xy]
            # start point (s) or end point (e) of rule
            # first rule (1) or second rule (2)
            # x-coordinate (x) or y-coordinate (y)
            if dx == 0:
                # First rule
                s1x = x1
                e1x = x1
                s1y = 0
                e1y = height - 1

                # Second rule
                s2y = y1
                e2y = y1
                s2x = 0
                e2x = width - 1

                # Third rule
                s3y = y0
                e3y = y0
                s3x = 0
                e3x = width - 1

                # Save slope
                self.sel_coords['slope'] = 0

            else:
                # First rule
                s1x = 0
                e1x = width - 1
                s1y = dy / dx * (s1x - x1) + y1
                e1y = dy / dx * (e1x - x1) + y1

                # Second rule
                s2y = 0
                e2y = height - 1
                s2x = - dy / dx * (s2y - y1) + x1
                e2x = - dy / dx * (e2y - y1) + x1

                # Third rule
                s3y = 0
                e3y = height - 1
                s3x = - dy / dx * (s3y - y0) + x0
                e3x = - dy / dx * (e3y - y0) + x0

                # Save (smaller of both) slopes
                if dy == 0:
                    self.sel_coords['slope'] = 0
                elif abs(dy / dx) <= abs(- dx / dy):
                    self.sel_coords['slope'] = dy / dx
                else:
                    self.sel_coords['slope'] = - dx / dy
                    

            # Draw new rules
            self.canvas.create_line(s1x, s1y, e1x, e1y,
                fill="red", tags="rule")
            self.canvas.create_line(s2x, s2y, e2x, e2y,
                fill="red", tags="rule")
            self.canvas.create_line(s3x, s3y, e3x, e3y,
                fill="red", tags="rule")


        elif self.sel_state == SELECTION_RECT:
            # Delete old rectangles
            self.canvas.delete("roi")

            # Get coordinates
            x2 = evt.x
            y2 = evt.y

            x0 = self.sel_coords['x0']
            y0 = self.sel_coords['y0']
            a = self.sel_coords['slope']
            
            # Calculate rectangle
            if a == 0:
                x1 = x2
                y1 = y0

                x3 = x0
                y3 = y2

            else:
                x1 = (y2 - y0 + a * x0 + x2 / a) / (a + 1 / a)
                y1 = a * (x1 - x0) + y0

                x3 = (y0 - y2 + a * x2 + x0 / a) / (a + 1 / a)
                y3 = a * (x3 - x2) + y2

            # Save polygon corners
            polygon = np.array([[x0,y0], [x1,y1], [x2,y2], [x3,y3]])
            self.sel_coords['polygon'] = polygon

            # Draw rectangle
            self.canvas.create_polygon(x0, y0, x1, y1, x2, y2, x3, y3,
                fill="", outline="yellow", width=2.0, tags="roi")


        elif self.sel_state == SELECTION_SPACE:
            # Delete old ROI drafts
            self.canvas.delete("roi_draft")

            # Get coordinates
            ex = evt.x
            ey = evt.y

            height = self.canvas.winfo_height()
            width = self.canvas.winfo_width()

            a = self.sel_coords['slope']
            polygon = self.sel_coords['polygon']
            x0 = polygon[0,0]
            y0 = polygon[0,1]

            # Difference between mouse and middle of anchor ROI
            delta = (ex, ey) - np.mean(polygon, axis=0)

            # Get new ROI by shifting and check for overlap with old ROI
            new_poly = polygon + delta
            in_poly = 0
            for p in new_poly:
                in_poly |= self.is_in_rectangle(p, polygon, True)
                if in_poly == 3:
                    break

            # For overlap in one projection, align new ROI 
            if in_poly == 1:
                y_align = a * (new_poly[0,0] - x0) + y0
                new_poly[:,1] -= new_poly[0,1] - y_align
            elif in_poly == 2:
                x_align = -a * (new_poly[0,1] - y0) + x0
                new_poly[:,0] -= new_poly[0,0] - x_align

            # Paint new depending on overlap
            if in_poly == 3:
                roi_color = "red"
            elif np.any((new_poly <= 0) | (new_poly >= [width, height])):
                roi_color = "red"
            else:
                roi_color = "yellow"

            self.canvas.create_polygon(*new_poly.flat,
                fill="", outline=roi_color, tags="roi_draft")
            self.canvas.create_line(*new_poly[0], *new_poly[2],
                fill=roi_color, tags="roi_draft")
            self.canvas.create_line(*new_poly[1], *new_poly[3],
                fill=roi_color, tags="roi_draft")



    def is_in_rectangle(self, p, rect, check_projections=False):
        """Check if a point is in the anchor ROI.

        :param p: Point to be checked
        :type p: Numpy array of shape (2,)
        :param check_projections: Flag indicating whether to check overlap in projection.
        :type check_projections: bool

        :return: Collision information:

            If ``check_projections == False``, return:
                * ``True`` if point is in the ROI and
                * ``False`` if point is outside of the ROI.

            If ``check_projections == True``, return:

                * 0 if point does not overlap with ROI in any projection
                * 1 if point overlaps with ROI in x-projection (``y_min <= y <= y_max``)
                * 2 if point overlaps with ROI in y-projection (``x_min <= x <= x_max``)
                * 3 if point overlaps with ROI in both projections
        """
        # Get coordinates
        px = p[0]
        py = p[1]

        a = self.sel_coords['slope']
        rect = self.sel_coords['polygon']
        x0 = rect[0,0]
        y0 = rect[0,1]
        x1 = rect[2,0]
        y1 = rect[2,1]

        # Upper and lower tangents of bounding box of rect
        y_horiz_up = a * (px - x0) + y0
        y_horiz_low = a * (px - x1) + y1

        # Left and right tangents of bounding box of rect
        if a == 0:
            x_vert_left = x0
            x_vert_right = x1
        else:
            x_vert_left = - a * (py - y0) + x0
            x_vert_right = - a * (py - y1) + x1

        # Collision detection
        if px >= x_vert_left and px <= x_vert_right:
            x_collision = True
        else:
            x_collision = False

        if py >= y_horiz_low and py <= y_horiz_up:
            y_collision = True
        else:
            y_collision = False

        # Determine return value and return
        if check_projections:
            ret = 0
            if y_collision:
                ret += 1
            if x_collision:
                ret += 2
            return ret

        else:
            return x_collision and y_collision

