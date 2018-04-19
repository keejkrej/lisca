#! /usr/bin/env python3
import numpy as np
import pdb

class CornerFinder:
    def __init__(self, contour, metric="manhattan"):
        self.contour = contour
        self.nNodes = contour.shape[0]
        self.dist = None
        self.chain = None
        self.corner_idcs = None

        if metric == "manhattan" or metric == "euclidean":
            self.metric = metric
        else:
            raise ValueError("Unknown metric: {}".format(metric))

    @classmethod
    def go(cls, contour, metric="manhattan", indices=False):
        cf = cls(contour, metric)
        cf.make_dist()
        cf.build_chain()
        cf.sort_corners()

        if indices:
            return cf.corner_idcs
        return cf.contour[cf.corner_idcs,:]


    def make_dist(self):
        self.dist = np.empty([self.nNodes, self.nNodes], dtype=np.float)
        for i in range(self.nNodes-1):
            d = self.contour[i+1:,:] - self.contour[i,:]
            if self.metric == "manhattan":
                d = np.abs(d).sum(axis=1)
            elif self.metric == "euclidean":
                d = np.sqrt((d**2).sum(axis=1))
            else:
                raise ValueError("Unknown metric: {}".format(self.metric))

            self.dist[i,i+1:] = d
            self.dist[i+1:,i] = d
            self.dist[i,i] = 0.


    def set_edge_used(self, i, j, revert=np.NaN):
        self.dist[i,j] = revert
        self.dist[j,i] = revert


    def find_nearest_node(self, i, mode="free"):
        if i is None:
            print("`i` is None.")
            pdb.set_trace()
        if mode is None:
            idx = np.ones_like(self.dist[i], dtype=np.bool)
        elif mode == "free":
            idx = np.isfinite(self.dist[i])
        elif mode == "used":
            idx = ~np.isfinite(self.dist[i])
        else:
            raise ValueError("Unknown mode: {}".format(mode))
        
        idx[i] = False
        idx &= self.dist[i] > 0.

        if idx.sum() == 0:
            return None
        # TODO: recover argmin of original array (not only where idx is positive)

        idx_min = np.argmin(self.dist[i, idx])
        j = np.flatnonzero(idx)[idx_min]
        return j


    def build_chain(self):
        self.chain = np.full(self.nNodes, -1, dtype=[('prev', np.intp), ('next', np.intp)])

        # Walk through nodes by taking the nearest node, starting at node 0
        # `i` is the current node, `j` is the nearest node
        # If we obtain a `j == 0`, the cycle is closed.
        # TODO: check if it is possible that `j == 0` is not obtained
        i = 0
        j = -1
        while j != 0:
            # Find nearest node
            j = self.find_nearest_node(i)

            # Set references of nearest node
            self.chain[i]['next'] = j
            self.chain[j]['prev'] = i

            # Mark edge between `i` and `j` as used to prevent step back
            self.set_edge_used(i, j)

            # Proceed to nearest node
            i = j
            
        # Integrate nodes not visited yet into path
        idx_not_visited = (self.chain['prev'] == -1) | (self.chain['next'] == -1)
        for i in np.flatnonzero(idx_not_visited):
            if (self.dist[i] == 0).sum() > 1:
                continue
            # TODO: uncomment the line below when problem of invalid
            # values of `i` is solved
            # DEBUG: comment out this line to prevent errors due to bad `i`
            #self.integrate_into_chain(i)


    def integrate_into_chain(self, i):
        """Integrate node with index `i` into the chain."""
        j = self.find_nearest_node(i, mode="used")
        self.set_edge_used(i, j)

        j_prev = self.chain[j]['prev']
        j_next = self.chain[j]['next']

        if j is None or j_prev is None or j_next is None:
            print("j={}, j_prev={}, j_next={}\nchain:\n{}".format(j, j_prev, j_next, self.chain))

        if (self.dist[i, j_prev] < self.dist[i, j_next]).all():
            self.chain[i] = (j_prev, j)
            self.chain[j_prev]['next'] = i
            self.chain[j]['prev'] = i
            self.set_edge_used(i, j_prev)
        else:
            self.chain[i] = (j, j_next)
            self.chain[j]['next'] = i
            self.chain[j_next]['prev'] = i
            self.set_edge_used(i, j_next)


    def sort_corners(self, j0=0):
        idcs = []
        i = self.chain[j0]['prev']
        j = j0
        prev_diff = self.contour[i] - self.contour[self.chain[i]['prev']]

        while True:
            this_diff = self.contour[j] - self.contour[i]
            if (this_diff != prev_diff).any():
                idcs.append(j)

            i = j
            j = self.walk_along_chain(i)
            if j == j0:
                break
            prev_diff = this_diff

        self.corner_idcs = np.array(idcs, dtype=np.intp)


    def walk_along_chain(self, start, direction="next"):
        if direction != "next" and direction != "prev":
            raise ValueError("Unknown direction: {}".format(direction))
        return self.chain[start][direction]

