class RoiCollection:
    IDX_TYPE = 0
    IDX_VERSION = 1

    def __init__(self, key=None, type_=None, version=None,
                 parameters=None, name=None, color=None):
        if key is None and isinstance(type_, str) and isinstance(version, str):
            self.__key = (type_, version)
        elif isinstance(key, tuple) and len(key) == 2 and \
                isinstance(key[RoiCollection.IDX_TYPE], str) and \
                isinstance(key[RoiCollection.IDX_VERSION], str):
            self.__key = key
        else:
            raise TypeError("Invalid ROI type identifier given.")

        self.parameters = None
        self.name = None
        self.color = None
        self.__rois = {}


    @property
    def key(self):
        return self.__key

    @property
    def type(self):
        return self.__key[RoiCollection.IDX_TYPE]

    @property
    def version(self):
        return self.__key[RoiCollection.IDX_VERSION]

    def __len__(self):
        return self.__rois.__len__()

    def __contains__(self, frame):
        return self.__rois.__contains__(frame)

    def set(self, frame, roi):
        if isinstance(roi, list):
            self.__rois[frame] = roi
        else:
            self.__rois[frame] = [roi]

    def add(self, frame, roi):
        if frame not in self:
            self.set(frame, roi)
        if isinstance(roi, list):
            self.__rois[frame].extend(roi)
        else:
            self.__rois[frame].append(roi)

    def __getitem__(self, frame):
        return self.__rois.get(frame)

    def __delitem__(self, frame):
        self.__rois.__delitem__(frame)

    def __iter__(self):
        return self.__rois.__iter__()

    def items(self):
        return self.__rois.items()

    def frames(self):
        return self.__rois.keys()

    def rois(self):
        return self.__rois.values()
